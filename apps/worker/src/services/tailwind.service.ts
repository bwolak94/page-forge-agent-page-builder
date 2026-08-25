/**
 * tailwind.service.ts — wraps Tailwind CSS CLI execution.
 *
 * Uses `--content <rendered-html>` so only classes actually present in the
 * exported HTML are included in styles.css. No safelist required — the HTML
 * is the ground truth for what needs to be styled.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// ---------------------------------------------------------------------------
// TailwindService
// ---------------------------------------------------------------------------

export class TailwindService {
  /**
   * Generate a Tailwind CSS output file from an HTML content file.
   *
   * @param contentPath  - Path to the rendered HTML file (used as content source).
   * @param outputPath   - Destination path for the generated CSS file.
   */
  async build({
    contentPath,
    outputPath,
  }: {
    contentPath: string;
    outputPath: string;
  }): Promise<void> {
    await execAsync(
      `npx tailwindcss --content "${contentPath}" --output "${outputPath}" --minify`,
      { timeout: 30_000 },
    );
  }
}
