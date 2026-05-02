import { test, expect, type Page } from "@playwright/test";
import { signIn } from "./helpers";

const TEAM = {
  germain: { email: "germain@sgs.test", password: "team123!" },
  jesus:   { email: "jesus@sgs.test",   password: "team123!" },
  karen:   { email: "karen@sgs.test",   password: "team123!" },
  ana_acct: { email: "ana_acct@sgs.test", password: "team123!" },
};

function sidebar(page: Page) {
  // shadcn Sidebar renders the menu inside elements with data-sidebar="menu"
  return page.locator('[data-sidebar="menu"]');
}
async function expectSidebarVisible(page: Page, label: RegExp | string) {
  await expect(sidebar(page).getByRole("link", { name: label }).first()).toBeVisible();
}
async function expectSidebarHidden(page: Page, label: RegExp | string) {
  await expect(sidebar(page).getByRole("link", { name: label })).toHaveCount(0);
}

test.describe("Role hierarchy — sidebar gating", () => {
  test("Germain (head_accounting) does NOT see Facturas / Servicios / Legal / Asesoría / Seguros / Branding", async ({ page }) => {
    await signIn(page, TEAM.germain, /\/admin/);
    await page.waitForLoadState("domcontentloaded");
    await expectSidebarHidden(page, /^facturas$/i);
    await expectSidebarHidden(page, /^servicios$/i);
    await expectSidebarHidden(page, /^legal$/i);
    await expectSidebarHidden(page, /^asesoría$/i);
    await expectSidebarHidden(page, /^seguros$/i);
    await expectSidebarHidden(page, /^branding$/i);
    await expectSidebarHidden(page, /^intake$/i);
    // But CAN see clients, tasks, queries, documents
    await expectSidebarVisible(page, /^clientes$/i);
    await expectSidebarVisible(page, /^consultas$/i);
    await expectSidebarVisible(page, /^documentos$/i);
  });

  test("Jesus (head_branding) sees Branding but NOT Facturas / Legal / Asesoría / Seguros", async ({ page }) => {
    await signIn(page, TEAM.jesus, /\/admin/);
    await page.waitForLoadState("domcontentloaded");
    await expectSidebarVisible(page, /^branding$/i);
    await expectSidebarHidden(page, /^facturas$/i);
    await expectSidebarHidden(page, /^legal$/i);
    await expectSidebarHidden(page, /^asesoría$/i);
    await expectSidebarHidden(page, /^seguros$/i);
  });

  test("Karen (head_it) sees Configuración + Workspaces but NOT Facturas / Servicios / Branding", async ({ page }) => {
    await signIn(page, TEAM.karen, /\/admin/);
    await page.waitForLoadState("domcontentloaded");
    await expectSidebarVisible(page, /^configuración$/i);
    await expectSidebarVisible(page, /^workspaces$/i);
    await expectSidebarHidden(page, /^facturas$/i);
    await expectSidebarHidden(page, /^servicios$/i);
    await expectSidebarHidden(page, /^branding$/i);
  });
});

test.describe("Role hierarchy — page-level access", () => {
  test("Germain navigating to /admin/invoices is blocked", async ({ page }) => {
    await signIn(page, TEAM.germain, /\/admin/);
    await page.goto("/admin/invoices");
    // ProtectedRoute redirects when cap missing — should NOT see the invoices heading
    await expect(page.getByRole("heading", { name: /Facturas/i })).toHaveCount(0, { timeout: 5000 });
  });

  test("Jesus accessing /admin/branding works", async ({ page }) => {
    await signIn(page, TEAM.jesus, /\/admin/);
    await page.goto("/admin/branding");
    await expect(page.getByRole("heading", { name: /Branding & Identidad/i })).toBeVisible();
  });
});

test.describe("Role hierarchy — client detail tabs", () => {
  test("Germain sees Workers + Estrategia fiscal but NOT Facturas / Servicios", async ({ page }) => {
    await signIn(page, TEAM.germain, /\/admin/);
    const ACME_ID = "c944ade0-fe80-48aa-9da3-9f5495c419d5";
    await page.goto(`/admin/clients/${ACME_ID}`);
    await expect(page.getByRole("tab", { name: /^Workers$/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Estrategia fiscal/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^Facturas$/i })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: /^Servicios$/i })).toHaveCount(0);
  });

  test("Analyst accounting can also see Workers tab", async ({ page }) => {
    await signIn(page, TEAM.ana_acct, /\/admin/);
    const ACME_ID = "c944ade0-fe80-48aa-9da3-9f5495c419d5";
    await page.goto(`/admin/clients/${ACME_ID}`);
    await expect(page.getByRole("tab", { name: /^Workers$/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^Facturas$/i })).toHaveCount(0);
  });
});
