/**
 * Expense Parser - Extract expense data from natural language text
 * Fallback when AI doesn't generate JSON action
 */

export interface ParsedExpense {
  label: string;
  amount: number;
  currency: string;
  supplier?: string;
}

/**
 * Extract expense information from text
 */
export function extractExpenseFromText(text: string): ParsedExpense | null {
  const textLower = text.toLowerCase();
  
  // Patterns for "create expense" intent
  const intentPatterns = [
    /registra.*gasto/i,
    /crea.*gasto/i,
    /añade.*gasto/i,
    /crear.*gasto/i,
    /créer.*dépense/i,
    /enregistr.*dépense/i,
    /create.*expense/i,
    /add.*expense/i
  ];
  
  // Check if text has create expense intent
  const hasIntent = intentPatterns.some(pattern => pattern.test(text));
  if (!hasIntent) {
    return null;
  }

  // Extract amount (number before "francos", "CHF", "francs", etc.)
  const amountPattern = /(\d+(?:\.\d+)?)\s*(?:franc(?:o|s|os)?|chf)/i;
  const amountMatch = text.match(amountPattern);
  
  if (!amountMatch) {
    return null; // No amount found
  }
  
  const amount = parseFloat(amountMatch[1]);

  // Extract currency
  const currency = text.match(/chf/i) ? 'CHF' : 
                   text.match(/eur/i) ? 'EUR' : 
                   text.match(/usd/i) ? 'USD' : 'CHF';

  // Extract label (try to find category/description)
  let label = 'Gasto';
  
  // Common expense categories
  const categories = [
    { keywords: ['electricidad', 'electricité', 'electricity', 'luz'], label: 'Electricidad' },
    { keywords: ['agua', 'eau', 'water'], label: 'Agua' },
    { keywords: ['internet', 'web', 'wifi'], label: 'Internet' },
    { keywords: ['teléfono', 'telephone', 'phone', 'móvil', 'mobile'], label: 'Teléfono' },
    { keywords: ['alquiler', 'loyer', 'rent'], label: 'Alquiler' },
    { keywords: ['gasolina', 'essence', 'fuel', 'carburant'], label: 'Gasolina' },
    { keywords: ['oficina', 'bureau', 'office'], label: 'Oficina' },
    { keywords: ['comida', 'repas', 'food', 'restaurante'], label: 'Comida' },
    { keywords: ['transporte', 'transport'], label: 'Transporte' },
    { keywords: ['seguro', 'assurance', 'insurance'], label: 'Seguro' }
  ];

  for (const category of categories) {
    if (category.keywords.some(kw => textLower.includes(kw))) {
      label = category.label;
      break;
    }
  }

  // Extract supplier (usually after "de" or "a" and before amount)
  let supplier: string | undefined;
  
  // Pattern: "... a/de SUPPLIER AMOUNT francos"
  const supplierPattern = /(?:a|de|para|chez|at|to)\s+([A-Za-zÀ-ÿ0-9\s]+?)\s+\d+/i;
  const supplierMatch = text.match(supplierPattern);
  
  if (supplierMatch) {
    supplier = supplierMatch[1].trim();
  } else {
    // Alternative: Look for capitalized words (likely company names)
    const capitalizedPattern = /\b([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)\b/g;
    const matches = text.match(capitalizedPattern);
    
    if (matches && matches.length > 0) {
      // Filter out common words that are not suppliers
      const excludeWords = ['Registra', 'Crea', 'Añade', 'Créer', 'Create', 'Add', 'Gasto', 'Dépense', 'Expense'];
      const potentialSuppliers = matches.filter(m => !excludeWords.includes(m));
      
      if (potentialSuppliers.length > 0) {
        supplier = potentialSuppliers[potentialSuppliers.length - 1]; // Take last one (usually the supplier)
      }
    }
  }

  return {
    label,
    amount,
    currency,
    supplier
  };
}

/**
 * Check if text is an expense creation request
 */
export function isExpenseCreationRequest(text: string): boolean {
  const intentPatterns = [
    /registra.*gasto/i,
    /crea.*gasto/i,
    /añade.*gasto/i,
    /crear.*gasto/i,
    /créer.*dépense/i,
    /enregistr.*dépense/i,
    /create.*expense/i,
    /add.*expense/i
  ];
  
  return intentPatterns.some(pattern => pattern.test(text));
}
