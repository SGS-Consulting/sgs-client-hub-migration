import { test, expect } from "@playwright/test";
import { TEST_ADMIN, TEST_CLIENT, signIn } from "./helpers";

test.describe("SOP-06 — admin insurance", () => {
  test("admin can navigate to /admin/insurance via sidebar", async ({ page }) => {
    await signIn(page, TEST_ADMIN, /\/admin/);
    await page.getByRole("link", { name: /^seguros$/i }).click();
    await page.waitForURL(/\/admin\/insurance/);
    await expect(page.getByRole("heading", { name: /Seguros y Riesgo/i })).toBeVisible();
  });

  test("/admin/insurance renders table headers", async ({ page }) => {
    await signIn(page, TEST_ADMIN, /\/admin/);
    await page.goto("/admin/insurance");
    await expect(page.getByRole("heading", { name: /Seguros y Riesgo/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /GL Insurance/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /WC Insurance/i })).toBeVisible();
  });
});

test.describe("SOP-06 — client portal insurance page", () => {
  test("client sees insurance coverage page at /portal/insurance", async ({ page }) => {
    await signIn(page, TEST_CLIENT, /\/portal/);
    await page.goto("/portal/insurance");
    await expect(page.getByRole("heading", { name: /Seguros y Riesgo/i })).toBeVisible();
  });

  test("client nav has 'Seguros' link", async ({ page }) => {
    await signIn(page, TEST_CLIENT, /\/portal/);
    await expect(page.getByRole("link", { name: /seguros/i })).toBeVisible();
  });
});
