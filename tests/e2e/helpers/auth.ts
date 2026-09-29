import fs from "node:fs";
import path from "node:path";
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { SEED_PASSWORD, SEED_USERS, type SeedUserKey } from "../../../src/lib/seed-ids";

const authDir = path.join(process.cwd(), "tests/e2e/.auth");

export async function loginAs(page: Page, key: SeedUserKey): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(SEED_USERS[key].email);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  await expect(page.getByRole("link", { name: "Tennis" })).toBeVisible();
}

export async function asUser(browser: Browser, key: SeedUserKey): Promise<{ context: BrowserContext; page: Page }> {
  fs.mkdirSync(authDir, { recursive: true });
  const file = path.join(authDir, `${key}.json`);
  if (!fs.existsSync(file)) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, key);
    await context.storageState({ path: file });
    await context.close();
  }
  const context = await browser.newContext({ storageState: file });
  const page = await context.newPage();
  return { context, page };
}
