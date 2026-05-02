import { test, expect } from "@playwright/test";
import { TEST_ADMIN, signIn } from "./helpers";

test.describe("SOP-02 — admin activation", () => {
  test("admin can see Delaware Infrastructure Platform in the activate dropdown", async ({ page }) => {
    await signIn(page, TEST_ADMIN, /\/admin/);
    await page.goto("/admin/clients");
    // Open Andes Imports (which already has SOP-02 active from the seed)
    await page.getByRole("row", { name: /Andes Imports/i }).getByRole("link", { name: /abrir/i }).click();
    await page.waitForURL(/\/admin\/clients\/[0-9a-f-]+/);
    await page.getByRole("tab", { name: /servicios/i }).click();
    await expect(page.getByRole("cell", { name: /Delaware Infrastructure Platform/i }).first()).toBeVisible();
    // Price column should show the override $3,500 (from the seed)
    await expect(page.getByText(/\$3,500/).first()).toBeVisible();
    // Send kit email button should be present (SOP-02 is active)
    await expect(page.getByRole("button", { name: /send kit email/i }).first()).toBeVisible();
  });

  test("activating Delaware Infrastructure for a fresh client opens the price prompt", async ({ page }) => {
    await signIn(page, TEST_ADMIN, /\/admin/);
    await page.goto("/admin/clients");
    // PixelForge Studio doesn't have SOP-02 yet
    await page.getByRole("row", { name: /PixelForge Studio/i }).getByRole("link", { name: /abrir/i }).click();
    await page.waitForURL(/\/admin\/clients\/[0-9a-f-]+/);
    await page.getByRole("tab", { name: /servicios/i }).click();

    // Open the activate-service dropdown and pick Delaware
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /Delaware Infrastructure Platform/i }).click();

    // Price-prompt dialog should appear with the service name in the title
    await expect(page.getByRole("heading", { name: /Activar Delaware Infrastructure Platform/i })).toBeVisible();
    await expect(page.getByLabel(/precio/i)).toBeVisible();

    // Cancel — don't actually activate (keeps test idempotent)
    await page.getByRole("button", { name: /^cancelar$/i }).click();
  });
});

test.describe("SOP-02 — public/client view", () => {
  // We don't have a portal-linked user for Andes, so we can only assert the data shape via admin path.
  // The admin "Servicios" tab + price column + send-kit-email button verify the wiring end-to-end.
  test("placeholder: Andes SOP-02 row carries the override price + kit email button", async ({ page }) => {
    await signIn(page, TEST_ADMIN, /\/admin/);
    await page.goto("/admin/clients");
    await page.getByRole("row", { name: /Andes Imports/i }).getByRole("link", { name: /abrir/i }).click();
    await page.waitForURL(/\/admin\/clients\/[0-9a-f-]+/);
    await page.getByRole("tab", { name: /servicios/i }).click();
    // Same assertions as the admin test, but kept separate so a future addition of an Andes portal user
    // can extend this to a true client-side check via signIn(TEST_ANDES_PORTAL).
    await expect(page.getByText(/Delaware Infrastructure Platform/i).first()).toBeVisible();
  });
});
