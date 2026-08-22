/**
 * REGISTRY — maps component type strings to ComponentDef instances.
 *
 * Open/Closed: adding a component = new file + entry here. No core code changes.
 * Null Object: "Unknown" is a safe fallback that renders a placeholder.
 */

import type { Registry } from "./types.js";
import { pageDef } from "./components/page.js";
import { sectionDef } from "./components/section.js";
import { containerDef } from "./components/container.js";
import { gridDef } from "./components/grid.js";
import { stackDef } from "./components/stack.js";
import { headingDef } from "./components/heading.js";
import { textDef } from "./components/text.js";
import { buttonDef } from "./components/button.js";
import { imageDef } from "./components/image.js";
import { cardDef } from "./components/card.js";
import { pricingCardDef } from "./components/pricing-card.js";
import { navDef } from "./components/nav.js";
import { heroDef } from "./components/hero.js";
import { footerDef } from "./components/footer.js";
import { faqDef } from "./components/faq.js";

// Each def is cast to the base ComponentDef (erasing the specific P type).
// This is safe: consumers that need the exact P type import the def directly.
import type { ComponentDef } from "./types.js";

export const REGISTRY: Registry = {
  [pageDef.type]: pageDef as unknown as ComponentDef,
  [sectionDef.type]: sectionDef as unknown as ComponentDef,
  [containerDef.type]: containerDef as unknown as ComponentDef,
  [gridDef.type]: gridDef as unknown as ComponentDef,
  [stackDef.type]: stackDef as unknown as ComponentDef,
  [headingDef.type]: headingDef as unknown as ComponentDef,
  [textDef.type]: textDef as unknown as ComponentDef,
  [buttonDef.type]: buttonDef as unknown as ComponentDef,
  [imageDef.type]: imageDef as unknown as ComponentDef,
  [cardDef.type]: cardDef as unknown as ComponentDef,
  [pricingCardDef.type]: pricingCardDef as unknown as ComponentDef,
  [navDef.type]: navDef as unknown as ComponentDef,
  [heroDef.type]: heroDef as unknown as ComponentDef,
  [footerDef.type]: footerDef as unknown as ComponentDef,
  [faqDef.type]: faqDef as unknown as ComponentDef,
};
