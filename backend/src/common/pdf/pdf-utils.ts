/* eslint-disable prettier/prettier */
/**
 * Shared PDF utilities — font registration, layout constants.
 * Fonts are bundled in src/assets/fonts/ and copied to dist/assets/fonts/ via nest-cli.json.
 */
import * as path from 'path';

export const MARGIN = 50;
export const PAGE_W = 595.28; // A4 width in points
export const CONTENT_W = PAGE_W - MARGIN * 2;

// Resolve relative to compiled output: dist/common/pdf/ → dist/assets/fonts/
const FONTS_DIR = path.join(__dirname, '..', '..', 'assets', 'fonts');

const FONT_REGULAR = path.join(FONTS_DIR, 'DejaVuSans.ttf');
const FONT_BOLD    = path.join(FONTS_DIR, 'DejaVuSans-Bold.ttf');

export const FONT = {
  regular: 'DejaVu',
  bold: 'DejaVuBold',
};

export function registerFonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont(FONT.regular, FONT_REGULAR);
  doc.registerFont(FONT.bold, FONT_BOLD);
}

export function footerText(extra: string): string {
  return `Generated on ${new Date().toLocaleString()} · ${extra}`;
}
