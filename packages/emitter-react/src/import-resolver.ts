/**
 * import-resolver.ts — ImportCollector + deduplication + sorting.
 *
 * Pattern: Flyweight — import paths are accumulated once; duplicate named exports
 * from the same path are merged into a single import statement.
 *
 * Zero IO — pure in-memory accumulation.
 */

// ---------------------------------------------------------------------------
// ImportCollector
// ---------------------------------------------------------------------------

export class ImportCollector {
  /** importPath → Set of named exports */
  private readonly map = new Map<string, Set<string>>();

  /**
   * Record that `name` should be imported from `importPath`.
   * Multiple calls with the same (name, path) are idempotent.
   * Multiple names from the same path are merged into one import.
   */
  add(name: string, importPath: string): void {
    if (!this.map.has(importPath)) {
      this.map.set(importPath, new Set());
    }
    this.map.get(importPath)!.add(name);
  }

  /**
   * Render all collected imports as sorted TypeScript import statements.
   * Sorted by import path (alphabetical). Named exports within each import sorted.
   */
  toStatements(): string {
    if (this.map.size === 0) return "";

    return [...this.map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, names]) => {
        const nameList = [...names].sort().join(", ");
        return `import { ${nameList} } from "${path}";`;
      })
      .join("\n");
  }

  /**
   * Return the set of package names used (for generating package.json deps).
   * e.g. "@pageforge/registry/components/hero" → "@pageforge/registry"
   *       "react" → "react"
   */
  usedPackages(): string[] {
    const packages = new Set<string>();
    for (const path of this.map.keys()) {
      if (path.startsWith("@")) {
        // scoped: @scope/name/...
        const parts = path.split("/");
        packages.add(`${parts[0]}/${parts[1]}`);
      } else {
        // unscoped: name/...
        packages.add(path.split("/")[0]!);
      }
    }
    return [...packages].sort();
  }
}
