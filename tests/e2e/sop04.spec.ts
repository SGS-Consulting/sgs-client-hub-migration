import { test, expect } from "@playwright/test";
import { TEST_ADMIN, TEST_CLIENT, signIn, visitAndAssertClean } from "./helpers";

// SOP-04 admin-side surfaces
test.describe("SOP-04 — admin", () => {
  test("admin can sign in and reach a client detail with new tabs", async ({ page }) => {
    await signIn(page, TEST_ADMIN, /\/admin/);

    // Find Acme via the clients list
    await page.goto("/admin/clients");
    await expect(page.getByText(/Acme Coffee Roasters/i).first()).toBeVisible();
    // Each client row has an "Abrir" button — click the one in Acme's row
    await page.getByRole("row", { name: /Acme Coffee Roasters/i }).getByRole("link", { name: /abrir/i }).click();
    await page.waitForURL(/\/admin\/clients\/[0-9a-f-]+/);

    // We're now on /admin/clients/<id>. The 7 tabs should be present.
    await expect(page.getByRole("tab", { name: /información/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /workers/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /estrategia fiscal/i })).toBeVisible();
  });

  test("Workers tab renders with the seeded SMOKE workers + status badges", async ({ page }) => {
    await signIn(page, TEST_ADMIN, /\/admin/);
    await page.goto("/admin/clients");
    await page.getByRole("row", { name: /Acme Coffee Roasters/i }).getByRole("link", { name: /abrir/i }).click();
    await page.waitForURL(/\/admin\/clients\/[0-9a-f-]+/);
    await page.getByRole("tab", { name: /workers/i }).click();

    // Expect the table headers
    await expect(page.getByRole("columnheader", { name: /^nombre$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^w-9$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^1099$/i })).toBeVisible();

    // SMOKE04 Worker A should be there from the latest smoke test
    await expect(page.getByText(/SMOKE04 Worker A/).first()).toBeVisible();

    // The "Recibido" W-9 badge should appear for Worker A (E2E submission landed)
    await expect(page.getByText(/Recibido|Verificado/).first()).toBeVisible();
  });

  test("Estrategia fiscal tab renders with reuniones + estrategias sections", async ({ page }) => {
    await signIn(page, TEST_ADMIN, /\/admin/);
    await page.goto("/admin/clients");
    await page.getByRole("row", { name: /Acme Coffee Roasters/i }).getByRole("link", { name: /abrir/i }).click();
    await page.waitForURL(/\/admin\/clients\/[0-9a-f-]+/);
    await page.getByRole("tab", { name: /estrategia fiscal/i }).click();

    await expect(page.getByRole("heading", { name: /Reuniones de estrategia/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Estrategias identificadas/i })).toBeVisible();

    // SMOKE04 strategies seeded earlier should appear (give the async fetch time)
    await expect(page.getByText(/SMOKE04: active strategy/).first()).toBeVisible({ timeout: 10_000 });
  });
});

// SOP-04 client-side surfaces
test.describe("SOP-04 — client", () => {
  test("client can sign in and see Mi equipo nav", async ({ page }) => {
    await signIn(page, TEST_CLIENT, /\/portal/);
    await expect(page.getByRole("link", { name: /mi equipo/i })).toBeVisible();
  });

  test("/portal/workers renders without console errors and shows W-9 status", async ({ page }) => {
    await signIn(page, TEST_CLIENT, /\/portal/);
    await visitAndAssertClean(page, "/portal/workers", /Mi equipo/);

    // Workers seeded from earlier sessions should be visible
    await expect(page.getByText(/SMOKE04 Worker A/)).toBeVisible();

    // The W-9 status column derives via SECURITY DEFINER RPC — verifies that path works
    await expect(page.getByText(/Recibido|Verificado|Solicitado|No solicitado/).first()).toBeVisible();
  });
});

// Public W-9 form — the route Calendly/SGS sends to a worker
test.describe("SOP-04 — public W-9 form", () => {
  test("invalid token shows 'Link no válido'", async ({ page }) => {
    await page.goto("/w9/this-token-does-not-exist");
    await expect(page.getByRole("heading", { name: /Link no válido/i })).toBeVisible();
  });

  test("expired token shows expired message", async ({ page }) => {
    // The smoke test left smoke04_token_1 as 'expired' from the re-issue scenario
    await page.goto("/w9/smoke04_token_1");
    await expect(page.getByRole("heading", { name: /Link no válido/i })).toBeVisible();
    await expect(page.getByText(/expir/i)).toBeVisible();
  });

  test("completed token shows the success card (already submitted)", async ({ page }) => {
    // smoke04_e2e_token was POST'd successfully in the curl smoke test
    await page.goto("/w9/smoke04_e2e_token");
    await expect(page.getByText(/W-9 recibido/i)).toBeVisible();
  });
});
