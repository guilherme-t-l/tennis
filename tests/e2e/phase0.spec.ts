import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("1. Sign up + profile", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Email").fill("nova@test.local");
  await page.getByLabel("Password").fill("Password123!");
  await page.getByLabel("Display name").fill("Nova Player");
  await page.getByLabel("Level").selectOption({ label: "Intermediate" });
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/onboarding");
  await page.getByRole("checkbox", { name: "Belvedere" }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/");
  await expect(page.getByRole("heading", { name: "Want to play?" })).toBeVisible();
  await page.goto("/profile");
  await expect(page.getByText("Nova Player")).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: "Intermediate" })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: "1500" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Belvedere" })).toBeVisible();
  await expect(page.getByText("0 matches played")).toBeVisible();
});
