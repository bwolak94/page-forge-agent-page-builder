/**
 * @pageforge/registry — public API
 *
 * Zero IO. Everything exported is a pure type, constant, or function.
 */

// Types
export type { ComponentDef, SlotDef, Runtime, Registry } from "./types.js";

// Registry
export { REGISTRY } from "./registry.js";

// Constraints
export { canAccept, getValidDropTargets } from "./constraints.js";

// Manifest
export { registryManifest } from "./manifest.js";

// Defaults
export { createDefaultProps, createDefaultNode } from "./defaults.js";

// Theme
export { DEFAULT_THEME, DEFAULT_BREAKPOINTS, tokenVar } from "./theme.js";

// Component defs — for direct import by canvas/emitters
export { pageDef, pagePropsSchema } from "./components/page.js";
export { sectionDef, sectionPropsSchema } from "./components/section.js";
export { containerDef, containerPropsSchema } from "./components/container.js";
export { gridDef, gridPropsSchema } from "./components/grid.js";
export { stackDef, stackPropsSchema } from "./components/stack.js";
export { headingDef, headingPropsSchema } from "./components/heading.js";
export { textDef, textPropsSchema } from "./components/text.js";
export { buttonDef, buttonPropsSchema } from "./components/button.js";
export { imageDef, imagePropsSchema } from "./components/image.js";
export { cardDef, cardPropsSchema } from "./components/card.js";
export { pricingCardDef, pricingCardPropsSchema } from "./components/pricing-card.js";
export { navDef, navPropsSchema } from "./components/nav.js";
export { heroDef, heroPropsSchema } from "./components/hero.js";
export { footerDef, footerPropsSchema } from "./components/footer.js";
export { faqDef, faqPropsSchema } from "./components/faq.js";
