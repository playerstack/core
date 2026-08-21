/**
 * Types for the `playerstack-audio-controls` UI_Element. Kept out of the logic file per the
 * type-organization rules (Req 14): the element imports these names so the Markup_Contract
 * (parts) plus the configurable accessible-name attribute stay documented in one place and
 * the element and any future tests share a single source of truth.
 */

/**
 * Named Shadow DOM `part`s exposed by `playerstack-audio-controls` so Skins can style the
 * compact audio controls cluster through the shadow boundary (Req 5.1, 5.3):
 *   - `audio-controls` is the container; it carries the reflected `data-playing` state so the
 *     Style_Layer can swap the play/pause affordance glyph.
 *   - `play-button` is the play/pause toggle affordance.
 *   - `time` is the current-time read-out.
 *   - `slider` / `track` / `track-fill` are the progress/seek bar and its played fill.
 */
export type AudioControlsPart = 'audio-controls' | 'play-button' | 'time' | 'slider' | 'track' | 'track-fill';

/**
 * Default accessible name applied to the play/pause button when the consumer does not set an
 * `aria-label` attribute (Req 1.5). English fallback kept as a named constant type so the
 * element and tests agree on the default.
 */
export type AudioControlsDefaultLabel = 'Play';
