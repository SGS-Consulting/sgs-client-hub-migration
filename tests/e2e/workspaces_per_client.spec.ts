import { test, expect } from "@playwright/test";
import { TEST_ADMIN, signIn } from "./helpers";

test.describe("Workspace per client", () => {
  test("admin sees Workspace tab on a client detail and can open the kanban", async ({ page }) => {
    await signIn(page, TEST_ADMIN, /\/admin/);

    // Acme's seeded client id (matches dev_seed.sql)
    const ACME_ID = "c944ade0-fe80-48aa-9da3-9f5495c419d5";
    await page.goto(`/admin/clients/${ACME_ID}`);

    // Workspace tab is visible and clickable
    await page.getByRole("tab", { name: /^Workspace$/i }).click();

    // The tab shows the workspace card with the company name and the "Abrir kanban" link
    await expect(page.getByText(/Acme Coffee Roasters LLC/).first()).toBeVisible();
    const openKanban = page.getByRole("link", { name: /Abrir kanban/i });
    await expect(openKanban).toBeVisible();

    // Stats grid shows up
    await expect(page.getByText(/Resumen de tareas/i)).toBeVisible();

    // Clicking "Abrir kanban" routes to the workspace detail page
    await openKanban.click();
    await page.waitForURL(/\/admin\/tasks\/workspaces\//);
  });

  test("workspaces list shows the auto-created client workspaces", async ({ page }) => {
    await signIn(page, TEST_ADMIN, /\/admin/);
    await page.goto("/admin/tasks/workspaces");
    await expect(page.getByRole("heading", { name: /Workspaces/i })).toBeVisible();

    // Each active client should appear as a workspace card
    await expect(page.getByText(/Acme Coffee Roasters LLC/).first()).toBeVisible();
    await expect(page.getByText(/Sunrise Logistics Inc\./).first()).toBeVisible();
  });
});
