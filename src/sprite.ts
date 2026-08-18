/**
 * Pure sprite frame computation — DOM-free, no browser globals.
 * Computes cover-scale geometry for a sprite frame within a container.
 */

import type { SpriteCue, ComputedSpriteFrame } from './types/sprite.types';

export type { SpriteCue, ComputedSpriteFrame } from './types/sprite.types';

/**
 * Find the matching sprite cue for a given seek time and compute cover-scale
 * geometry for rendering within the specified container dimensions.
 *
 * @param vttArray - Array of sprite cues with numeric coordinates
 * @param seekTime - Current seek time in seconds
 * @param container - Container dimensions (width and height in pixels)
 * @param sheetSizes - Map of sprite sheet file URLs to their pixel dimensions
 * @returns Computed sprite frame geometry, or null if no match or invalid data
 */
export function computeSpriteFrame(
  vttArray: SpriteCue[],
  seekTime: number,
  container: { width: number; height: number },
  sheetSizes: Record<string, { w: number; h: number }>,
): ComputedSpriteFrame | null {
  if (!container.width || !container.height) return null;

  for (const cue of vttArray) {
    if (seekTime >= cue.from && seekTime <= cue.to) {
      const frameW = cue.w;
      const frameH = cue.h;

      if (!frameW || !frameH) return null;

      const sheet = sheetSizes[cue.file];
      if (!sheet) return null;

      const scale = Math.max(container.width / frameW, container.height / frameH);

      const bgW = sheet.w * scale;
      const bgH = sheet.h * scale;
      const bgPosX = -(cue.x * scale);
      const bgPosY = -(cue.y * scale);

      const offsetX = (container.width - frameW * scale) / 2;
      const offsetY = (container.height - frameH * scale) / 2;

      return { file: cue.file, scale, bgW, bgH, bgPosX, bgPosY, offsetX, offsetY };
    }
  }

  return null;
}
