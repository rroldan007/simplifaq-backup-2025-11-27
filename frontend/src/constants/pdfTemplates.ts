export const PDF_TEMPLATES = [
  'elegant_classic',
  'minimal_modern',
  'formal_pro',
  'creative_premium',
  'clean_creative',
  'bold_statement',
  'swiss_classic',
  'european_minimal',
  'swiss_blue',
  'german_formal',
] as const;

export type PdfTemplateKey = (typeof PDF_TEMPLATES)[number];

export const PDF_TEMPLATE_LABELS: Record<PdfTemplateKey, string> = {
  elegant_classic: 'Classique Suisse (V2)',
  minimal_modern: 'Minimaliste Européen',
  formal_pro: 'Professionnel Moderne',
  creative_premium: 'Créatif Premium',
  clean_creative: 'Design Épuré',
  bold_statement: 'Signature Audacieuse',
  swiss_classic: 'Classique Suisse',
  european_minimal: 'Européen Minimal',
  swiss_blue: 'Bleu Corporatif',
  german_formal: 'Formel Allemand',
};

const TEMPLATE_ALIASES: Record<string, PdfTemplateKey> = {
  minimal_moderm: 'minimal_modern',
  minimal_modern_v2: 'minimal_modern',
  formal_pro_v2: 'formal_pro',
  swiss_default: 'swiss_classic',
};

export const normalizePdfTemplate = (value: unknown): PdfTemplateKey | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  const alias = TEMPLATE_ALIASES[normalized as keyof typeof TEMPLATE_ALIASES];
  const candidate = (alias || normalized) as PdfTemplateKey;
  return (PDF_TEMPLATES as readonly string[]).includes(candidate) ? candidate : undefined;
};
