import { expect, test } from "@playwright/test";
import { applyResult } from "../../src/lib/domain/elo";
import { levelForRating } from "../../src/lib/domain/level";
import { formatDelta, formatHistoryRow } from "../../src/lib/format";
import { SEED_IDS } from "../../src/lib/seed-ids";
import { replaySeedResults } from "../../src/lib/seed-replay";
import { loginAs } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

const matchUrl = `/matches/${SEED_IDS.matchLucas}`;

test("12. Record result", async ({ page, browser }) => {
  await loginAs(page, "guilherme");
  await page.goto(matchUrl);
  await expect(page.getByRole("heading", { name: "Record result" })).toBeVisible();
  await page.getByRole("radio", { name: "Guilherme" }).check();
  await page.getByLabel("Score").fill("6-4 6-3");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Result pending Lucas's confirmation")).toBeVisible();

  const lucas = await browser.newContext();
  const lucasPage = await lucas.newPage();
  await loginAs(lucasPage, "lucas");
  await lucasPage.goto("/inbox");
  await expect(lucasPage.getByRole("button", { name: "Guilherme reported a result" })).toBeVisible();
  await lucas.close();
});

test("13. Opponent confirms → rating updates and history shows", async ({ page }) => {
  await loginAs(page, "lucas");
  await page.goto(matchUrl);
  const guilhermeLine = await page.getByRole("listitem").filter({ hasText: "Guilherme rating" }).innerText();
  const lucasLine = await page.getByRole("listitem").filter({ hasText: "Lucas rating" }).innerText();
  const guilhermeRating = Number(guilhermeLine.match(/rating (\d+)/)?.[1]);
  const lucasRating = Number(lucasLine.match(/rating (\d+)/)?.[1]);
  const guilhermeRated = Number(guilhermeLine.match(/(\d+) rated/)?.[1]);
  const lucasRated = Number(lucasLine.match(/(\d+) rated/)?.[1]);
  const expected = applyResult({
    ratingA: guilhermeRating,
    ratingB: lucasRating,
    ratedMatchesA: guilhermeRated,
    ratedMatchesB: lucasRated,
    winner: "A",
    format: "singles",
  });
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Confirmed")).toBeVisible();
  await expect(page.getByText(formatDelta("Guilherme", expected.deltaA))).toBeVisible();
  await expect(page.getByText(formatDelta("Lucas", expected.deltaB))).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Confirmed")).toBeVisible();
  await expect(page.getByText(formatDelta("Guilherme", expected.deltaA))).toBeVisible();
});

test("14. Profile Your tennis", async ({ page }) => {
  const replay = replaySeedResults();
  const expected = applyResult({
    ratingA: replay.guilherme.rating,
    ratingB: replay.lucas.rating,
    ratedMatchesA: replay.guilherme.ratedMatches,
    ratedMatchesB: replay.lucas.ratedMatches,
    winner: "A",
    format: "singles",
  });
  await loginAs(page, "guilherme");
  await page.goto("/profile");
  await expect(page.getByRole("definition").filter({ hasText: levelForRating(expected.ratingA) })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: String(expected.ratingA) })).toBeVisible();
  await expect(page.getByText("4 matches played")).toBeVisible();
  await expect(page.getByText("4 in the last 30 days")).toBeVisible();
  await expect(page.getByText("4 connections")).toBeVisible();
  const history = page.getByRole("region", { name: "Match history" });
  await expect(history.getByText("Lucas")).toBeVisible();
  await expect(history.getByText("João")).toHaveCount(2);
  await expect(history.getByText("Pedro")).toBeVisible();
  await expect(page.getByRole("region", { name: "Rating history" })).toContainText(formatHistoryRow(expected.deltaA, "Lucas"));
  await expect(page.getByRole("region", { name: "Upcoming matches" })).toBeVisible();
});
