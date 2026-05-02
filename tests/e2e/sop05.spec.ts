import { test, expect } from "@playwright/test";
import { TEST_ADMIN, TEST_CLIENT, signIn, visitAndAssertClean } from "./helpers";

test.describe("SOP-05 — admin legal cases", () => {
  test("admin can navigate to /admin/legal-cases via sidebar and see the page", async ({ page }) => {
    await signIn(page, TEST_ADMIN, /\/admin/);
    await page.getByRole("link", { name: /^legal$/i }).click();
    await page.waitForURL(/\/admin\/legal-cases/);
    await expect(page.getByRole("heading", { name: /Consultas legales/i })).toBeVisible();
  });

  test("/admin/legal-cases renders filter tabs and table", async ({ page }) => {
    await signIn(page, TEST_ADMIN, /\/admin/);
    await page.goto("/admin/legal-cases");
    await expect(page.getByRole("heading", { name: /Consultas legales/i })).toBeVisible();

    // Filter tabs present
    await expect(page.getByRole("tab", { name: /Abiertos/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Cerrados/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Todos/i })).toBeVisible();
  });
});

test.describe("SOP-05 — client portal subscription gate", () => {
  test("client without SOP-05 subscription sees the locked gate", async ({ page }) => {
    // Maria (Acme) has SOP-03 + SOP-04 active but not SOP-05 — subscription gate should show.
    await signIn(page, TEST_CLIENT, /\/portal/);
    await visitAndAssertClean(page, "/portal/legal", /Consulta legal/);

    await expect(page.getByRole("heading", { name: /Suscripci[oó]n no activa/i })).toBeVisible();
    // Submit button is disabled when no subscription
    await expect(page.getByRole("button", { name: /Nueva consulta/i })).toBeDisabled();
  });

  test("client nav entry 'Consulta legal' is visible in the portal sidebar", async ({ page }) => {
    await signIn(page, TEST_CLIENT, /\/portal/);
    await expect(page.getByRole("link", { name: /consulta legal/i })).toBeVisible();
  });
});
