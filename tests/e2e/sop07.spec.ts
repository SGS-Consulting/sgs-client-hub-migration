import { test, expect } from "@playwright/test";
import { TEST_ADMIN, TEST_CLIENT, signIn } from "./helpers";

test.describe("SOP-07 — admin advisory cases", () => {
  test("admin can navigate to /admin/advisory via sidebar", async ({ page }) => {
    await signIn(page, TEST_ADMIN, /\/admin/);
    await page.getByRole("link", { name: /^asesoría$/i }).click();
    await page.waitForURL(/\/admin\/advisory/);
    await expect(page.getByRole("heading", { name: /Asesoría Empresarial/i })).toBeVisible();
  });

  test("/admin/advisory renders tabs and table", async ({ page }) => {
    await signIn(page, TEST_ADMIN, /\/admin/);
    await page.goto("/admin/advisory");
    await expect(page.getByRole("heading", { name: /Asesoría Empresarial/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Activos/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Cerrados/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Todos/i })).toBeVisible();
  });
});

test.describe("SOP-07 — client portal advisory page", () => {
  test("client sees advisory page at /portal/advisory", async ({ page }) => {
    await signIn(page, TEST_CLIENT, /\/portal/);
    await page.goto("/portal/advisory");
    await expect(page.getByRole("heading", { name: /Asesoría Empresarial/i })).toBeVisible();
  });

  test("client nav has 'Asesoría' link", async ({ page }) => {
    await signIn(page, TEST_CLIENT, /\/portal/);
    await expect(page.getByRole("link", { name: /asesoría/i })).toBeVisible();
  });
});
