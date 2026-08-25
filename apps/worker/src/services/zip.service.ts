/**
 * zip.service.ts — wraps the `archiver` library for ZIP file creation.
 */

import archiver from "archiver";
import { createWriteStream } from "node:fs";

// ---------------------------------------------------------------------------
// ZipEntry
// ---------------------------------------------------------------------------

export interface ZipEntry {
  /** Absolute path of the source file. */
  path: string;
  /** Name of the file inside the ZIP archive. */
  name: string;
}

// ---------------------------------------------------------------------------
// ZipService
// ---------------------------------------------------------------------------

export class ZipService {
  /**
   * Create a ZIP archive at `outputPath` containing the given `entries`.
   *
   * Resolves when the archive is fully written and the stream is closed.
   */
  async create(outputPath: string, entries: ZipEntry[]): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", resolve);
      archive.on("error", reject);
      archive.pipe(output);

      for (const entry of entries) {
        archive.file(entry.path, { name: entry.name });
      }

      archive.finalize();
    });
  }
}
