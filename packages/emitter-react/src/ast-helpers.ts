/**
 * ast-helpers.ts — Pure string helpers for building JSX fragments.
 *
 * No ts-morph: the output is a string pipeline (prop-serializer → ast-helpers →
 * emitter) which prettier then formats into canonical TypeScript.
 *
 * SRP: this module ONLY builds JSX strings, nothing else.
 */

// ---------------------------------------------------------------------------
// JSX element builder
// ---------------------------------------------------------------------------

/**
 * Build a JSX element string.
 *
 * @param type      Component name, e.g. "Hero"
 * @param propsStr  Serialized attribute string, e.g. 'headline={"Hello"} cols={3}'
 * @param children  Inner JSX string (may be empty)
 * @returns         A JSX element string
 *
 * Self-closing when children is empty.
 */
export function buildJsxElement(
  type: string,
  propsStr: string,
  children: string,
): string {
  const attrPart = propsStr ? ` ${propsStr}` : "";
  const trimmedChildren = children.trim();

  if (!trimmedChildren) {
    return `<${type}${attrPart} />`;
  }

  return `<${type}${attrPart}>\n${trimmedChildren}\n</${type}>`;
}

// ---------------------------------------------------------------------------
// Indent helper (used to nest child JSX inside parents)
// ---------------------------------------------------------------------------

export function indent(str: string, spaces = 2): string {
  return str
    .split("\n")
    .map(line => (line.trim() ? " ".repeat(spaces) + line : line))
    .join("\n");
}
