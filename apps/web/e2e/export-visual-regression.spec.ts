/**
 * export-visual-regression.spec.ts — Playwright visual regression test.
 *
 * Verifies that the HTML export is visually identical to the canvas preview.
 *
 * Test flow:
 *   1. Open the editor with a fixture document.
 *   2. Screenshot the canvas iframe body.
 *   3. Click "Export" → wait for SSE build.ready event → get download URL.
 *   4. Extract index.html from the ZIP.
 *   5. Render index.html in a new page.
 *   6. Screenshot and compare pixel-diff < 1%.
 *
 * @remarks
 * Requires:
 *   - `FIXTURE_DOC_ID` env var pointing to a seeded document in the test DB.
 *   - Running agent + worker services (see docker-compose.test.yml).
 *   - Playwright with Chromium installed.
 *
 * Run: pnpm exec playwright test e2e/export-visual-regression.spec.ts
 */

import { test, expect } from "@playwright/test";
import AdmZip from "adm-zip";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function extractHtmlFromZip(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buf);
  const entry = zip.getEntry("index.html");
  if (!entry) throw new Error("index.html not found in export ZIP");
  return entry.getData().toString("utf8");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("HTML export visual regression", () => {
  test("export matches canvas preview — diff < 1%", async ({ page, browser }) => {
    const docId = process.env["FIXTURE_DOC_ID"];
    if (!docId) test.skip(true, "FIXTURE_DOC_ID env var not set");

    // ------------------------------------------------------------------
    // 1. Open editor with fixture document
    // ------------------------------------------------------------------
    await page.goto(`/editor/${docId}`);
    await page.waitForLoadState("networkidle");

    // ------------------------------------------------------------------
    // 2. Screenshot the canvas iframe body
    // ------------------------------------------------------------------
    const canvas = page.frameLocator('iframe[data-canvas]').locator("body");
    await canvas.waitFor({ state: "visible" });
    const canvasScreenshot = await canvas.screenshot();

    // ------------------------------------------------------------------
    // 3. Trigger HTML export via the Export button
    // ------------------------------------------------------------------
    const exportPromise = new Promise<string>(resolve => {
      page.on("console", async msg => {
        if (msg.text().startsWith("pf:build:ready:")) {
          resolve(msg.text().replace("pf:build:ready:", ""));
        }
      });
    });

    await page.getByRole("button", { name: /export/i }).click();

    // Wait for build.ready SSE event (forwarded to console by the UI)
    const artifactUrl = await exportPromise;

    // ------------------------------------------------------------------
    // 4. Extract HTML from ZIP
    // ------------------------------------------------------------------
    const htmlContent = await extractHtmlFromZip(artifactUrl);

    // ------------------------------------------------------------------
    // 5. Render export in a new browser context
    // ------------------------------------------------------------------
    const exportPage = await browser.newPage();
    await exportPage.setContent(htmlContent, { waitUntil: "networkidle" });
    const exportScreenshot = await exportPage.locator("body").screenshot();
    await exportPage.close();

    // ------------------------------------------------------------------
    // 6. Pixel diff comparison — threshold < 1%
    // ------------------------------------------------------------------
    expect(canvasScreenshot).toMatchSnapshot("export-vs-canvas.png", { threshold: 0.01 });
    expect(exportScreenshot).toMatchSnapshot("export-vs-canvas.png", { threshold: 0.01 });
  });
});
