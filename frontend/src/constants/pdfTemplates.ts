export const PDF_TEMPLATES = [
  'swiss_minimal',
  'modern_blue',
  'creative_bold',
] as const;

export type PdfTemplateKey = (typeof PDF_TEMPLATES)[number];

export const PDF_TEMPLATE_LABELS: Record<PdfTemplateKey, string> = {
  swiss_minimal: 'Swiss Minimal',
  modern_blue: 'Modern Blue',
  creative_bold: 'Creative Bold',
};

// Map old legacy names to new themes if necessary for backward compatibility in UI logic
const TEMPLATE_ALIASES: Record<string, PdfTemplateKey> = {
  elegant_classic: 'swiss_minimal',
  minimal_modern: 'swiss_minimal',
  formal_pro: 'modern_blue',
  creative_premium: 'creative_bold',
  clean_creative: 'creative_bold',
  bold_statement: 'creative_bold',
  swiss_classic: 'swiss_minimal',
  european_minimal: 'swiss_minimal',
  swiss_blue: 'modern_blue',
  german_formal: 'swiss_minimal',
  minimal_moderm: 'swiss_minimal', // typo alias
};

export const normalizePdfTemplate = (value: unknown): PdfTemplateKey | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  
  // Check direct match
  if ((PDF_TEMPLATES as readonly string[]).includes(normalized)) {
    return normalized as PdfTemplateKey;
  }

  // Check alias
  const alias = TEMPLATE_ALIASES[normalized];
  return alias || 'swiss_minimal'; // Default fallback
};
