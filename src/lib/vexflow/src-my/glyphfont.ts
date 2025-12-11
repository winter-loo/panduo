import opentype from 'opentype.js';
import { RenderContext } from './rendercontext';
import bravuraFontUrl from "@vexflow-fonts/bravura/bravura.otf?url";

export class GlyphFont {
  static cache: Record<string, opentype.Font> = {};

  /**
   * Load a music font using opentype.js.
   * @param fontName The name of the font (e.g., 'Bravura', 'Petaluma').
   * @param fontUrl Optional URL to the font file. If not provided, it looks up in Font.FILES.
   */
  static async load(fontName: string, fontUrl?: string): Promise<opentype.Font> {
    if (GlyphFont.cache[fontName]) {
      return GlyphFont.cache[fontName];
    }

    if (!fontUrl) {
      fontUrl = bravuraFontUrl;
    }

    try {
      const response = await fetch(fontUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch font from ${fontUrl}: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      const font = opentype.parse(buffer);
      GlyphFont.cache[fontName] = font;
      return font;
    } catch (e) {
      throw new Error(`Could not load font ${fontName}: ${e}`);
    }
  }

  /**
   * Get the loaded font from cache.
   */
  static get(fontName: string): opentype.Font | undefined {
    let fonts = fontName.split(",");
    for (let i = 0; i < fonts.length; i++) {
      let font = GlyphFont.cache[fonts[i]];
      if (font) {
        return font;
      }
    }
    return undefined;
  }

  /**
   * Get the glyph path object (useful if you need bounding box etc).
   */
  static getPathObject(glyphChar: string, fontName: string, fontSize: number = 16): opentype.Path | undefined {
    const font = GlyphFont.get(fontName);
    if (!font) return undefined;
    const glyph = font.charToGlyph(glyphChar);
    if (!glyph) return undefined;
    return glyph.getPath(0, 0, fontSize);
  }

  /**
   * Render a glyph as a path on the provided RenderContext.
   */
  static renderGlyph(ctx: RenderContext, glyphChar: string, fontName: string, fontSize: number, x: number, y: number): void {
    const font = GlyphFont.get(fontName);
    if (!font) {
      // Fallback or warning? For now, we assume check is done before calling.
      console.warn(`Font ${fontName} not loaded. Call GlyphFont.load() first.`);
      return;
    }

    const glyph = font.charToGlyph(glyphChar);
    if (!glyph) return;

    const path = glyph.getPath(x, y, fontSize);

    ctx.beginPath();
    for (const cmd of path.commands) {
      switch (cmd.type) {
        case 'M':
          ctx.moveTo(cmd.x, cmd.y);
          break;
        case 'L':
          ctx.lineTo(cmd.x, cmd.y);
          break;
        case 'Q':
          ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
          break;
        case 'C':
          ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
          break;
        case 'Z':
          ctx.closePath();
          break;
      }
    }
    ctx.fill();
  }
}
