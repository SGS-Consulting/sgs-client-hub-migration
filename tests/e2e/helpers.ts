import { expect, type Page } from "@playwright/test";

// Shared dev-Supabase test users (seeded via dev_seed.sql + the SOP-01/03 smoke test).
export const TEST_ADMIN = { email: "admin@sgs.test", password: "admin123!" };
export const TEST_CLIENT = { email: "maria@acmecoffee.example", password: "smoketest123!" };

// Sign in via the /auth page UI. Waits until the post-login redirect lands.
export async function signIn(page: Page, who: { email: string; password: string }, expectPath: RegExp) {
  // Capture any console errors during sign-in
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/auth");
  await page.getByLabel(/correo|email/i).fill(who.email);
  await page.getByLabel(/contraseña|password/i).fill(who.password);
  await page.getByRole("button", { name: /^entrar$|sign in|log in/i }).first().click();
  await page.waitForURL(expectPath, { timeout: 10_000 });
  return { consoleErrors };
}

// Hit a route as the currently-authenticated user and assert no console errors fired.
export async function visitAndAssertClean(page: Page, path: string, expectText?: RegExp | string) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("Failed to load resource")) {
      errors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

  const res = await page.goto(path);
  expect(res?.ok(), `${path} should respond 2xx`).toBe(true);
  if (expectText) await expect(page.getByText(expectText).first()).toBeVisible({ timeout: 8_000 });

  // Give React a beat to throw any late errors
  await page.waitForTimeout(500);
  expect(errors, `console errors on ${path}: ${errors.join(" | ")}`).toHaveLength(0);
}
