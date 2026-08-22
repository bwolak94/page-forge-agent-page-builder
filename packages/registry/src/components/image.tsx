import type { CSSProperties } from "react";
import { z } from "zod";
import type { ComponentDef } from "../types.js";

export const imagePropsSchema = z.object({
  src: z.string().default("").describe("Image source URL or path"),
  alt: z.string().default("").describe("Accessible alt text (required for non-decorative images)"),
  width: z.number().int().positive().optional().describe("Explicit width in pixels"),
  height: z.number().int().positive().optional().describe("Explicit height in pixels"),
  objectFit: z
    .enum(["cover", "contain", "fill", "none", "scale-down"])
    .default("cover")
    .describe("CSS object-fit value"),
});

type ImageProps = z.infer<typeof imagePropsSchema>;

function Image({ src, alt, width, height, objectFit }: ImageProps) {
  const style: CSSProperties = {
    objectFit,
    maxWidth: "100%",
    display: "block",
  };
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      style={style}
      loading="lazy"
    />
  );
}

export { Image };

export const imageDef: ComponentDef<ImageProps> = {
  type: "Image",
  category: "media",
  description: "Responsive image with alt text, explicit dimensions, and object-fit control.",
  propsSchema: imagePropsSchema,
  slots: {}, // leaf
  allowedParents: ["Section", "Container", "Stack", "Card", "Hero"],
  runtime: "static",
  importPath: "@pageforge/registry/components/image",
  Component: Image,
};
