import { test, expect } from "@playwright/test";
import { TEST_ADMIN, TEST_CLIENT, signIn } from "./helpers";

test.describe("SOP-09 — admin branding projects", () => {
  test("admin can navigate to /admin/branding via sidebar", async ({ page }) => {
    await signIn(page, TEST_ADMIN, /\/admin/);
    await page.getByRole("link", { name: /^branding$/i }).click();
    await page.waitForURL(/\/admin\/branding/);
    await expect(page.getByRole("heading", { name: /Branding & Identidad/i })).toBeVisible();
  });

  test("/admin/branding renders tabs and table", async ({ page }) => {
    await signIn(page, TEST_ADMIN, /\/admin/);
    await page.goto("/admin/branding");
    await expect(page.getByRole("heading", { name: /Branding & Identidad/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Activos/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Entregados/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Todos/i })).toBeVisible();
  });
});

test.describe("SOP-09 — client portal branding page", () => {
  test("client sees branding page at /portal/branding", async ({ page }) => {
    await signIn(page, TEST_CLIENT, /\/portal/);
    await page.goto("/portal/branding");
    await expect(page.getByRole("heading", { name: /Branding & Identidad/i })).toBeVisible();
  });

  test("client nav has 'Branding' link", async ({ page }) => {
    await signIn(page, TEST_CLIENT, /\/portal/);
    await expect(page.getByRole("link", { name: /branding/i })).toBeVisible();
  });
});
