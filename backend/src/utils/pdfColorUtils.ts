type RGBColor = {
  r: number;
  g: number;
  b: number;
};

const WHITE: RGBColor = { r: 255, g: 255, b: 255 };
const BLACK: RGBColor = { r: 0, g: 0, b: 0 };

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHexColor(color: string): RGBColor | null {
  const hex = color.replace('#', '').trim();
  if (hex.length !== 3 && hex.length !== 6) {
    return null;
  }

  const expanded = hex.length === 3
    ? hex.split('').map((char) => char + char).join('')
    : hex;

  const intVal = parseInt(expanded, 16);
  if (Number.isNaN(intVal)) {
    return null;
  }

  return {
    r: clampChannel((intVal >> 16) & 255),
    g: clampChannel((intVal >> 8) & 255),
    b: clampChannel(intVal & 255),
  };
}

function parseRgbColor(color: string): RGBColor | null {
  const match = color.match(/rgba?\(([^)]+)\)/i);
  if (!match) {
    return null;
  }

  const parts = match[1].split(',').map((part) => parseFloat(part.trim()));
  if (parts.length < 3) {
    return null;
  }

  const [r, g, b] = parts;
  if ([r, g, b].some((channel) => Number.isNaN(channel))) {
    return null;
  }

  return {
    r: clampChannel(r),
    g: clampChannel(g),
    b: clampChannel(b),
  };
}

function parseColorToRgb(color?: string): RGBColor | null {
  if (!color) {
    return null;
  }

  const trimmed = color.trim();
  if (trimmed.startsWith('#')) {
    return parseHexColor(trimmed);
  }

  if (trimmed.startsWith('rgb')) {
    return parseRgbColor(trimmed);
  }

  return null;
}

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance({ r, g, b }: RGBColor): number {
  const linearR = channelToLinear(r);
  const linearG = channelToLinear(g);
  const linearB = channelToLinear(b);

  return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
}

function getContrastRatio(l1: number, l2: number): number {
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

const WHITE_LUMINANCE = getRelativeLuminance(WHITE);
const BLACK_LUMINANCE = getRelativeLuminance(BLACK);

/**
 * Returns an accessible accent color for text displayed over a given background.
 * If the preferred color does not provide enough contrast, the function falls back
 * to white or dark slate depending on which yields a better contrast ratio.
 */
export function getAccessibleAccentColor(backgroundColor: string | undefined, preferredColor: string): string {
  const background = parseColorToRgb(backgroundColor) ?? WHITE;
  const preferred = parseColorToRgb(preferredColor) ?? parseHexColor('#059669') ?? WHITE;

  const backgroundLum = getRelativeLuminance(background);
  const preferredLum = getRelativeLuminance(preferred);
  const preferredContrast = getContrastRatio(backgroundLum, preferredLum);

  if (preferredContrast >= 4.5) {
    return preferredColor;
  }

  const whiteContrast = getContrastRatio(backgroundLum, WHITE_LUMINANCE);
  const blackContrast = getContrastRatio(backgroundLum, BLACK_LUMINANCE);

  if (whiteContrast >= blackContrast && whiteContrast >= 3) {
    return 'rgba(255,255,255,0.92)';
  }

  if (blackContrast >= 3) {
    return '#0f172a';
  }

  return whiteContrast > blackContrast ? 'rgba(255,255,255,0.92)' : '#0f172a';
}
