-- =========================================================
-- SOP-03 cron schedulers
--
-- Two daily background jobs:
--   1. spawn_recurring_tasks() — for each (active client_service,
--      its service_recurring_tasks rows), spawn a real `tasks`
--      row when this period's spawn date has arrived. Cadence-
--      driven (monthly/quarterly/semi_annual/annually). Includes
--      the per_client_setting cadence used by the tax-firm-handoff
--      task (reads cs.tax_firm_cadence).
--   2. flag_overdue_queries() — flips client_queries past their
--      due_date (+3 calendar days) from `open` → `overdue`, and
--      queues a query_overdue_reminder email_log row for GHL to
--      dispatch.
--
-- Supporting schema:
--   - tasks.source_recurring_task_id — links spawned tasks back
--     to the recurring template; used for "did we spawn this
--     period yet?" lookups.
--   - client_queries.reminder_sent_at — flag so we don't double-
--     send reminders.
-- =========================================================

-- ---------------------------------------------------------
-- Supporting columns
-- ---------------------------------------------------------
ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS source_recurring_task_id UUID
        REFERENCES public.service_recurring_tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_source_recurring
    ON public.tasks(source_recurring_task_id);

ALTER TABLE public.client_queries
    ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- ---------------------------------------------------------
-- spawn_recurring_tasks()
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spawn_recurring_tasks()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    rec_task RECORD;
    cs RECORD;
    period_start DATE;
    last_spawn DATE;
    effective_cadence TEXT;
    spawned INT := 0;
    cur_year INT := extract(year FROM current_date)::int;
    cur_month INT := extract(month FROM current_date)::int;
BEGIN
    FOR rec_task IN
        SELECT * FROM public.service_recurring_tasks WHERE is_active
    LOOP
        FOR cs IN
            SELECT * FROM public.client_services
            WHERE service_id = rec_task.service_id AND is_active
        LOOP
            -- Determine the effective cadence (per_client_setting reads from cs)
            IF rec_task.cadence = 'per_client_setting'
               AND rec_task.read_per_client_setting = 'tax_firm_cadence' THEN
                effective_cadence := cs.tax_firm_cadence;
                IF effective_cadence IS NULL THEN
                    -- Cadence not configured yet — skip this client_service for now
                    CONTINUE;
                END IF;
            ELSE
                effective_cadence := rec_task.cadence;
            END IF;

            -- Compute period_start: first day of the period we're currently in
            period_start := CASE
                WHEN effective_cadence = 'monthly' THEN
                    date_trunc('month', current_date)::DATE
                WHEN effective_cadence = 'quarterly' THEN
                    date_trunc('quarter', current_date)::DATE
                WHEN effective_cadence = 'semi_annual' THEN
                    CASE WHEN cur_month <= 6
                         THEN make_date(cur_year, 1, 1)
                         ELSE make_date(cur_year, 7, 1)
                    END
                WHEN effective_cadence = 'annually' THEN
                    make_date(
                        cur_year,
                        COALESCE((rec_task.cadence_config->>'month')::int, 1),
                        COALESCE((rec_task.cadence_config->>'day')::int, 1)
                    )
                WHEN effective_cadence = 'tax_season_only' THEN
                    -- Spawn around April 1 each year for tax-season-only clients
                    make_date(cur_year, 4, 1)
                ELSE NULL
            END;

            -- Skip if not yet at this period's start (e.g., annually @ Oct 1 but it's only March)
            IF period_start IS NULL OR period_start > current_date THEN
                CONTINUE;
            END IF;

            -- Has this recurring task already been spawned for this client_service in this period?
            SELECT MAX(created_at::date) INTO last_spawn
            FROM public.tasks
            WHERE source_recurring_task_id = rec_task.id
              AND client_id = cs.client_id
              AND service_id = cs.service_id
              AND created_at::date >= period_start;

            IF last_spawn IS NOT NULL THEN
                CONTINUE;
            END IF;

            -- Spawn
            INSERT INTO public.tasks (
                title, description, status, priority,
                client_id, service_id, due_date, sort_order,
                created_by, source_recurring_task_id
            ) VALUES (
                rec_task.title,
                rec_task.description,
                'open',
                rec_task.default_priority,
                cs.client_id,
                cs.service_id,
                period_start + (rec_task.default_due_offset_days || ' days')::interval,
                rec_task.sort_order,
                NULL,  -- system-spawned
                rec_task.id
            );
            spawned := spawned + 1;
        END LOOP;
    END LOOP;

    RETURN spawned;
END;
$$;

-- ---------------------------------------------------------
-- flag_overdue_queries()
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.flag_overdue_queries()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    q RECORD;
    client_rec RECORD;
    portal_link TEXT;
    days_overdue INT;
    flagged INT := 0;
BEGIN
    -- TODO: this hardcoded base URL needs to become env-driven once we have
    -- a settings table or app_config row for the canonical portal hostname.
    -- For dev: localhost. For prod: replace with actual deployed URL.
    portal_link := 'http://localhost:8080/portal/queries';

    -- Flip queries that are >3 calendar days past due_date and still open
    UPDATE public.client_queries
    SET status = 'overdue'
    WHERE status = 'open'
      AND due_date < (current_date - interval '3 days')::date;

    -- For each overdue query that hasn't had a reminder yet, queue an email
    FOR q IN
        SELECT cq.id, cq.question, cq.due_date, cq.client_id
        FROM public.client_queries cq
        WHERE cq.status = 'overdue'
          AND cq.reminder_sent_at IS NULL
        LIMIT 200
    LOOP
        SELECT contact_name, company_name, email INTO client_rec
        FROM public.clients WHERE id = q.client_id;

        IF NOT FOUND OR client_rec.email IS NULL THEN
            CONTINUE;
        END IF;

        days_overdue := current_date - q.due_date;

        INSERT INTO public.email_log (
            template_key, recipient_email, subject, body, status, client_id
        ) VALUES (
            'query_overdue_reminder',
            client_rec.email,
            'Reminder — your books need a quick answer',
            '<p>Hi ' || COALESCE(client_rec.contact_name, client_rec.company_name) || ',</p>' ||
            '<p>We''re following up on a question we sent you that''s now ' ||
            days_overdue || ' day(s) past due. Without your input we can''t finalize this period''s reconciliation.</p>' ||
            '<p><a href="' || portal_link || '">Answer now in your portal →</a></p>' ||
            '<p>Question: <em>' || left(q.question, 200) || '</em></p>',
            'pending',
            q.client_id
        );

        UPDATE public.client_queries
        SET reminder_sent_at = now()
        WHERE id = q.id;

        flagged := flagged + 1;
    END LOOP;

    RETURN flagged;
END;
$$;

-- ---------------------------------------------------------
-- pg_cron schedules
--
-- Both run daily; staggered so flag_overdue runs after spawn so
-- any overdue tasks created today land in the same period.
-- ---------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    -- Unschedule existing jobs by name (idempotent — safe to re-run migration)
    PERFORM cron.unschedule(jobname)
    FROM cron.job
    WHERE jobname IN ('sop03-spawn-recurring-tasks', 'sop03-flag-overdue-queries');
EXCEPTION
    WHEN OTHERS THEN
        -- pg_cron may not be fully initialized on first run; skip cleanup
        NULL;
END $$;

-- 05:00 UTC daily — early enough that admins arriving for the day see new tasks
SELECT cron.schedule(
    'sop03-spawn-recurring-tasks',
    '0 5 * * *',
    $cmd$SELECT public.spawn_recurring_tasks();$cmd$
);

-- 06:00 UTC daily — runs after the spawn so newly overdue items get flagged same day
SELECT cron.schedule(
    'sop03-flag-overdue-queries',
    '0 6 * * *',
    $cmd$SELECT public.flag_overdue_queries();$cmd$
);
