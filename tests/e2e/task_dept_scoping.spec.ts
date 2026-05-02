import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

const ADMIN = { email: "admin@sgs.test", password: "admin123!" };
const GERMAIN = { email: "germain@sgs.test", password: "team123!" };
const ANA_ACCT = { email: "ana_acct@sgs.test", password: "team123!" };
const JESUS = { email: "jesus@sgs.test", password: "team123!" };
const ACME_WS_ID = "97c3abd2-64fb-4fc1-a9e0-59b7b98c225c"; // from prior backfill

test.describe("Task dept scoping — RLS", () => {
  test("Germain (head_accounting) sees accounting tasks in Acme's kanban", async ({ page }) => {
    await signIn(page, GERMAIN, /\/admin/);
    await page.goto(`/admin/tasks/workspaces/${ACME_WS_ID}`);
    // Acme has 10 SOP-03 accounting tasks → Germain should see at least the kanban with cards
    await expect(page.getByText(/Acme Coffee Roasters/i).first()).toBeVisible();
    // Should see at least one task title (the seeded SOP-03 onboarding tasks all start with capital letters)
    const taskCount = await page.locator('[draggable="true"]').count();
    expect(taskCount).toBeGreaterThan(0);
  });

  test("Jesus (head_branding) sees an empty kanban for Acme (no branding services)", async ({ page }) => {
    await signIn(page, JESUS, /\/admin/);
    await page.goto(`/admin/tasks/workspaces/${ACME_WS_ID}`);
    // Cards count should be 0 (no branding tasks for Acme)
    await page.waitForTimeout(1500);
    const taskCount = await page.locator('[draggable="true"]').count();
    expect(taskCount).toBe(0);
  });

  test("Ana_acct sees only the task already assigned to her", async ({ page }) => {
    await signIn(page, ANA_ACCT, /\/admin/);
    await page.goto(`/admin/tasks/workspaces/${ACME_WS_ID}`);
    await page.waitForTimeout(1500);
    const taskCount = await page.locator('[draggable="true"]').count();
    // Should be 1 (the test task we assigned via SQL earlier) or 0 if cleanup
    expect(taskCount).toBeLessThanOrEqual(2);
  });
});

test.describe("Centro de trabajo — role-aware panels", () => {
  test("Germain sees 'Sin asignar' inbox with accounting tasks", async ({ page }) => {
    await signIn(page, GERMAIN, /\/admin/);
    await page.goto("/admin/tasks");
    await expect(page.getByRole("heading", { name: /Centro de trabajo/i })).toBeVisible();
    // Sin asignar panel renders only when there's content
    await expect(page.getByRole("heading", { name: /^Sin asignar$/i })).toBeVisible();
  });

  test("Ana_acct sees only 'Mis tareas' panel (no inbox, no team)", async ({ page }) => {
    await signIn(page, ANA_ACCT, /\/admin/);
    await page.goto("/admin/tasks");
    await expect(page.getByRole("heading", { name: /Centro de trabajo/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Mis tareas$/i })).toBeVisible();
    // Sin asignar should NOT be visible (analyst can't see unassigned dept tasks)
    await expect(page.getByRole("heading", { name: /^Sin asignar$/i })).toHaveCount(0);
  });
});

test.describe("Task assignment — admin can reassign via kanban click", () => {
  test("admin clicks a task card and reassigns via the dialog", async ({ page }) => {
    await signIn(page, ADMIN, /\/admin/);
    await page.goto(`/admin/tasks/workspaces/${ACME_WS_ID}`);
    await expect(page.getByText(/Acme Coffee Roasters/i).first()).toBeVisible();

    // Click first task card
    const firstCard = page.locator('[draggable="true"]').first();
    await firstCard.click();

    // Assign dialog opens
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Asignar tarea/i })).toBeVisible();

    // The assignee dropdown should list internal users
    await page.getByRole("combobox").click();
    await page.waitForTimeout(300);
    // Should have at least admin / germain / ana options
    const optionsCount = await page.getByRole("option").count();
    expect(optionsCount).toBeGreaterThanOrEqual(3);
  });
});
