// SMuFL glyph anchor points in staff spaces
// See:
//   - https://w3c.github.io/smufl/latest/specification/glyphswithanchors.html
//   - https://w3c.github.io/smufl/latest/specification/glyph-registration-notes-flags.html
//   - https://github.com/steinbergmedia/bravura/blob/master/redist/bravura_metadata.json
//
// stemUpSE: [x, y] - Attachment point for up-stems (South-East, right side)
// stemDownNW: [x, y] - Attachment point for down-stems (North-West, left side)
// Values are in staff spaces (1 staff space = distance between staff lines)

import { Glyphs } from "./glyphs";

export interface GlyphAnchor {
  stemUpSE?: [number, number];
  stemDownNW?: [number, number];
}

export const GlyphAnchors: Record<string, GlyphAnchor> = {
  [Glyphs.noteheadBlack]: { stemUpSE: [1.18, 0.168], stemDownNW: [0.0, -0.168] },
  [Glyphs.noteheadHalf]: { stemUpSE: [1.18, 0.168], stemDownNW: [0.0, -0.168] },
};

/**
 * Get the stem attachment point for a glyph in staff spaces.
 * @param glyphName - The canonical glyph name (e.g., 'noteheadBlack')
 * @param stemDirection - 1 for up-stem, -1 for down-stem
 * @returns [x, y] offset in staff spaces, or null if not found
 */
export function getStemAttachment(
  glyphName: string,
  stemDirection: number
): [number, number] | null {
  const anchor = GlyphAnchors[glyphName];
  if (!anchor) return null;

  if (stemDirection > 0 && anchor.stemUpSE) {
    return anchor.stemUpSE;
  } else if (stemDirection < 0 && anchor.stemDownNW) {
    return anchor.stemDownNW;
  }
  return null;
}
