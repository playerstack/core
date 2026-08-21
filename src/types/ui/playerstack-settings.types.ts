/**
 * Types for the `playerstack-settings` UI_Element. Kept out of the logic file per the
 * type-organization rules (Req 14): the element imports these names so the Markup_Contract
 * (parts), the configurable accessible-name attribute, the minimal i18n shape and the
 * public quality-option shape stay documented in one place as a single source of truth.
 */

/**
 * Named Shadow DOM `part`s exposed by `playerstack-settings` so Skins can style the
 * settings button, the main menu panel and the per-category submenu through the shadow
 * boundary (Req 5.1, 5.3). The Style_Layer targets these exact names:
 *   - `settings-button` holds the gear glyph and toggles the menu open/closed.
 *   - `menu` is the main panel listing the top-level entries (Speed / Quality).
 *   - `submenu` is the panel shown when a top-level entry is selected.
 *   - `menu-item` / `submenu-item` are the individual selectable rows.
 */
export type SettingsPart = 'settings-button' | 'menu' | 'submenu' | 'menu-item' | 'submenu-item';

/**
 * Default accessible name applied to the settings button when the consumer does not set
 * an `aria-label` attribute (Req 1.5). English fallback kept as a named constant type so
 * the element and tests agree on the default.
 */
export type SettingsDefaultLabel = 'Settings';

/**
 * Public quality option shape accepted through the element's `qualityOptions` setter.
 * Mirrors the entry shape `buildSettingsOptions` consumes so callers can feed the same
 * `{ label, value, isFullHD? }` records the rest of Core uses (e.g. `1080`/`1080`).
 */
export interface SettingsQualityOption {
  label: string;
  value: string;
  isFullHD?: boolean;
}

/**
 * Minimal i18n label bag the element accepts. Every field is optional; missing fields
 * fall back to the English defaults so the element renders correct labels with no i18n
 * provided (Req 1.5). Extra keys are tolerated to stay forward-compatible with the wider
 * translation record used elsewhere in Core.
 */
export interface SettingsI18n {
  speed?: string;
  quality?: string;
  auto?: string;
  normal?: string;
  [key: string]: string | undefined;
}
