/**
 * 🇨🇭 CSV Import Service - Backend Processing
 * 
 * Service for processing CSV files with invoice items
 */

import { SwissTVACategory } from '../config/swissTaxConfig';

export interface CSVInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  tvaCategory: SwissTVACategory;
}

export interface CSVParseResult {
  success: boolean;
  items: CSVInvoiceItem[];
  errors: Array<{
    row: number;
    field: string;
    message: string;
    value: string;
  }>;
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
  };
}

export class CSVImportService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_ROWS = 1000; // Maximum rows to process

  /**
   * Parse CSV content and validate invoice items
   */
  static parseCSV(csvContent: string, cantonCode: string = 'GE'): CSVParseResult {
    const result: CSVParseResult = {
      success: false,
      items: [],
      errors: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        errorRows: 0
      }
    };

    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        result.errors.push({
          row: 0,
          field: 'file',
          message: 'Le fichier CSV est vide',
          value: ''
        });
        return result;
      }

      // Detect if first row is header
      const hasHeader = this.detectHeader(lines[0]);
      const dataLines = hasHeader ? lines.slice(1) : lines;
      
      if (dataLines.length > this.MAX_ROWS) {
        result.errors.push({
          row: 0,
          field: 'file',
          message: `Trop de lignes. Maximum autorisé: ${this.MAX_ROWS}`,
          value: dataLines.length.toString()
        });
        return result;
      }

      result.summary.totalRows = dataLines.length;

      // Process each data row
      dataLines.forEach((line, index) => {
        const rowNumber = index + (hasHeader ? 2 : 1);
        const parsedRow = this.parseCSVRow(line, rowNumber, cantonCode);
        
        if (parsedRow.errors.length === 0) {
          result.items.push(parsedRow.item!);
          result.summary.validRows++;
        } else {
          result.errors.push(...parsedRow.errors);
          result.summary.errorRows++;
        }
      });

      result.success = result.items.length > 0;
      return result;

    } catch (error) {
      result.errors.push({
        row: 0,
        field: 'file',
        message: 'Erreur lors du parsing du fichier CSV',
        value: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      return result;
    }
  }

  /**
   * Detect if first row contains headers
   */
  private static detectHeader(firstLine: string): boolean {
    const headerKeywords = [
      'description', 'quantité', 'quantity', 'prix', 'price', 
      'tva', 'vat', 'catégorie', 'category'
    ];
    
    const lowerLine = firstLine.toLowerCase();
    return headerKeywords.some(keyword => lowerLine.includes(keyword));
  }

  /**
   * Parse a single CSV row
   */
  private static parseCSVRow(
    line: string, 
    rowNumber: number, 
    cantonCode: string
  ): {
    item?: CSVInvoiceItem;
    errors: Array<{
      row: number;
      field: string;
      message: string;
      value: string;
    }>;
  } {
    const errors: Array<{
      row: number;
      field: string;
      message: string;
      value: string;
    }> = [];

    try {
      const columns = this.parseCSVLine(line);
      
      if (columns.length < 4) {
        errors.push({
          row: rowNumber,
          field: 'structure',
          message: 'Ligne incomplète. 4 colonnes requises: Description, Quantité, Prix, TVA',
          value: line
        });
        return { errors };
      }

      // Extract and validate fields
      const description = columns[0]?.trim() || '';
      const quantityStr = columns[1]?.trim() || '';
      const priceStr = columns[2]?.trim() || '';
      const tvaCategoryStr = columns[3]?.trim() || '';

      // Validate description
      if (!description) {
        errors.push({
          row: rowNumber,
          field: 'description',
          message: 'Description manquante',
          value: description
        });
      } else if (description.length > 500) {
        errors.push({
          row: rowNumber,
          field: 'description',
          message: 'Description trop longue (max 500 caractères)',
          value: description
        });
      }

      // Validate quantity
      const quantity = this.parseNumber(quantityStr);
      if (quantity === null || quantity <= 0) {
        errors.push({
          row: rowNumber,
          field: 'quantity',
          message: 'Quantité invalide (doit être un nombre positif)',
          value: quantityStr
        });
      } else if (quantity > 999999) {
        errors.push({
          row: rowNumber,
          field: 'quantity',
          message: 'Quantité trop élevée (max 999,999)',
          value: quantityStr
        });
      }

      // Validate unit price
      const unitPrice = this.parseNumber(priceStr);
      if (unitPrice === null || unitPrice < 0) {
        errors.push({
          row: rowNumber,
          field: 'unitPrice',
          message: 'Prix unitaire invalide (doit être un nombre positif ou zéro)',
          value: priceStr
        });
      } else if (unitPrice > 999999.99) {
        errors.push({
          row: rowNumber,
          field: 'unitPrice',
          message: 'Prix unitaire trop élevé (max 999,999.99)',
          value: priceStr
        });
      }

      // Validate TVA category
      const tvaCategory = this.validateTVACategory(tvaCategoryStr);
      if (!tvaCategory) {
        errors.push({
          row: rowNumber,
          field: 'tvaCategory',
          message: 'Catégorie TVA invalide. Valeurs acceptées: STANDARD, REDUCED, SPECIAL, EXEMPT, NOT_SUBJECT',
          value: tvaCategoryStr
        });
      }

      // If no errors, create the item
      if (errors.length === 0) {
        const item: CSVInvoiceItem = {
          description,
          quantity: quantity!,
          unitPrice: unitPrice!,
          tvaCategory: tvaCategory!
        };
        return { item, errors: [] };
      }

      return { errors };

    } catch (error) {
      errors.push({
        row: rowNumber,
        field: 'parsing',
        message: 'Erreur lors du parsing de la ligne',
        value: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      return { errors };
    }
  }

  /**
   * Parse a CSV line handling quotes and commas
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current);
    return result;
  }

  /**
   * Parse number from string (handles both . and , as decimal separator)
   */
  private static parseNumber(str: string): number | null {
    if (!str || str.trim() === '') return null;
    
    // Replace comma with dot for decimal separator
    const normalized = str.trim().replace(',', '.');
    const num = parseFloat(normalized);
    
    return isNaN(num) ? null : num;
  }

  /**
   * Validate and normalize TVA category
   */
  private static validateTVACategory(category: string): SwissTVACategory | null {
    if (!category) return null;
    
    const normalizedCategory = category.toUpperCase().trim();
    
    // Direct match
    if (Object.values(SwissTVACategory).includes(normalizedCategory as SwissTVACategory)) {
      return normalizedCategory as SwissTVACategory;
    }
    
    // Fuzzy matching for common variations
    const mappings: Record<string, SwissTVACategory> = {
      'NORMAL': SwissTVACategory.STANDARD,
      'STANDARD': SwissTVACategory.STANDARD,
      '8.1': SwissTVACategory.STANDARD,
      '8,1': SwissTVACategory.STANDARD,
      'REDUIT': SwissTVACategory.REDUCED,
      'REDUCED': SwissTVACategory.REDUCED,
      'RÉDUIT': SwissTVACategory.REDUCED,
      '2.6': SwissTVACategory.REDUCED,
      '2,6': SwissTVACategory.REDUCED,
      'SPECIAL': SwissTVACategory.SPECIAL,
      'SPÉCIAL': SwissTVACategory.SPECIAL,
      '3.8': SwissTVACategory.SPECIAL,
      '3,8': SwissTVACategory.SPECIAL,
      'EXEMPT': SwissTVACategory.EXEMPT,
      'EXONERE': SwissTVACategory.EXEMPT,
      'EXONÉRÉ': SwissTVACategory.EXEMPT,
      '0': SwissTVACategory.EXEMPT,
      'NOT_SUBJECT': SwissTVACategory.NOT_SUBJECT,
      'NON_ASSUJETTI': SwissTVACategory.NOT_SUBJECT,
      'EXPORT': SwissTVACategory.NOT_SUBJECT,
      'INTERNATIONAL': SwissTVACategory.NOT_SUBJECT
    };
    
    return mappings[normalizedCategory] || null;
  }

  /**
   * Generate CSV template
   */
  static generateTemplate(): string {
    return `Description,Quantité,Prix Unitaire,Catégorie TVA
"Consultation IT",1,150.00,STANDARD
"Formation développement",8,75.50,STANDARD
"Hébergement web",1,29.90,STANDARD
"Livre technique",2,45.00,REDUCED
"Service export",1,200.00,NOT_SUBJECT
"Consultation médicale",1,120.00,EXEMPT`;
  }

  /**
   * Validate file before processing
   */
  static validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Fichier trop volumineux. Taille maximum: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      };
    }

    // Check file type
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      return {
        valid: false,
        error: 'Type de fichier invalide. Seuls les fichiers CSV sont acceptés.'
      };
    }

    return { valid: true };
  }
}