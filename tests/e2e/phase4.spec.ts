import { expect, test } from "@playwright/test";
import { nextSaturday10 } from "../../src/lib/dates";
import { currentlyAvailableLabel } from "../../src/lib/format";
import { loginAs } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

test("17. Discovery shows 2nd-degree contact", async ({ page }) => {
  await loginAs(page, "guilherme");
  await page.goto("/network?tab=second");
  const section = page.getByRole("region", { name: "People connected to people you know" });
  await expect(section).toContainText("Rafael");
  await expect(section).toContainText("via João");
  await expect(section).toContainText("Intermediate");
  await expect(section.getByRole("button", { name: "Connect" })).toBeVisible();
  await expect(section).not.toContainText("Pedro");
  await expect(section).not.toContainText("Lucas");
});

test("18. Nearby compatible players", async ({ page }) => {
  await loginAs(page, "guilherme");
  await page.goto("/network?tab=nearby");
  const section = page.getByRole("region", { name: "Nearby compatible" });
  await expect(section).toContainText("Rafael");
  await expect(section).not.toContainText("André");
});

test("19. People currently available", async ({ page }) => {
  await loginAs(page, "guilherme");
  await page.goto("/network?tab=available");
  const start = nextSaturday10();
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const section = page.getByRole("region", { name: "Currently available" });
  await expect(section).toContainText("João");
  await expect(section).toContainText(currentlyAvailableLabel(start, end, "Belvedere", "singles"));
  await expect(section.getByRole("link", { name: "Fix a match" })).toHaveAttribute("href", /\/fix\?/);
});

test("20. Motivation prompts on Home", async ({ page }) => {
  await loginAs(page, "guilherme");
  await page.goto("/");
  const prompts = page.getByRole("region", { name: "Motivation" });
  await expect(prompts).toContainText("João is available Saturday at Belvedere");
  await expect(prompts).toContainText("You've played 4 times in the last 30 days");
  await expect(prompts).toContainText("You haven't played Pedro in 3 weeks");
  await expect(prompts.getByRole("listitem")).toHaveCount(3);
  await expect(prompts.getByRole("link", { name: "Fix a match" }).first()).toBeVisible();
});
