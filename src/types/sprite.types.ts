/**
 * A cue from a parsed sprite VTT file with numeric coordinates.
 */
export interface SpriteCue {
  from: number;
  to: number;
  x: number;
  y: number;
  w: number;
  h: number;
  file: string;
}

/**
 * Computed sprite frame geometry for rendering a sprite within a container.
 */
export interface ComputedSpriteFrame {
  file: string;
  scale: number;
  bgW: number;
  bgH: number;
  bgPosX: number;
  bgPosY: number;
  offsetX: number;
  offsetY: number;
}
