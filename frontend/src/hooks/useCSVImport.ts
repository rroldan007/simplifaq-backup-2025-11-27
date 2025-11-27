/**
 * 🇨🇭 CSV Import Hook - Frontend CSV Processing
 * 
 * Custom hook for handling CSV file imports and API communication
 */

import { useState } from 'react';
import { SwissTVACategory } from './useTVA';

export interface CSVInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  tvaCategory: SwissTVACategory;
}

export interface CSVImportError {
  row: number;
  field: string;
  message: string;
  value: string;
}

export interface CSVImportResult {
  success: boolean;
  items: CSVInvoiceItem[];
  errors: CSVImportError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
  };
}

export function useCSVImport() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload and parse CSV file via API
   */
  const uploadCSVFile = async (file: File): Promise<CSVImportResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch('/api/csv-import/parse', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Erreur lors du traitement du fichier');
      }

      return {
        success: result.success,
        items: result.data.items || [],
        errors: result.data.errors || [],
        summary: result.data.summary || { totalRows: 0, validRows: 0, errorRows: 0 }
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      
      return {
        success: false,
        items: [],
        errors: [{
          row: 0,
          field: 'file',
          message: errorMessage,
          value: ''
        }],
        summary: { totalRows: 0, validRows: 0, errorRows: 0 }
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Validate CSV content without file upload
   */
  const validateCSVContent = async (csvContent: string, cantonCode?: string): Promise<CSVImportResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/csv-import/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          csvContent,
          cantonCode
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Erreur lors de la validation');
      }

      return {
        success: result.data.isValid,
        items: result.data.items || [],
        errors: result.data.errors || [],
        summary: result.data.summary || { totalRows: 0, validRows: 0, errorRows: 0 }
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      
      return {
        success: false,
        items: [],
        errors: [{
          row: 0,
          field: 'validation',
          message: errorMessage,
          value: ''
        }],
        summary: { totalRows: 0, validRows: 0, errorRows: 0 }
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Download CSV template
   */
  const downloadTemplate = async (): Promise<void> => {
    try {
      const response = await fetch('/api/csv-import/template', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement du template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_facture_simplifaq.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du téléchargement';
      setError(errorMessage);
    }
  };

  /**
   * Parse CSV content locally (client-side)
   */
  const parseCSVLocally = (csvContent: string): {
    rows: string[][];
    hasHeader: boolean;
  } => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const rows: string[][] = [];
    
    for (const line of lines) {
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      row.push(current.trim());
      rows.push(row);
    }

    // Detect header
    const hasHeader = rows.length > 0 && rows[0].some(cell => 
      cell.toLowerCase().includes('description') || 
      cell.toLowerCase().includes('quantité') ||
      cell.toLowerCase().includes('prix') ||
      cell.toLowerCase().includes('tva')
    );

    return { rows, hasHeader };
  };

  /**
   * Validate TVA category
   */
  const validateTVACategory = (category: string): SwissTVACategory | null => {
    if (!category) return null;
    
    const normalizedCategory = category.toUpperCase().trim();
    
    // Direct match
    if (Object.values(SwissTVACategory).includes(normalizedCategory as SwissTVACategory)) {
      return normalizedCategory as SwissTVACategory;
    }
    
    // Fuzzy matching
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
      'EXPORT': SwissTVACategory.NOT_SUBJECT
    };
    
    return mappings[normalizedCategory] || null;
  };

  /**
   * Generate CSV template content
   */
  const generateTemplateContent = (): string => {
    return `Description,Quantité,Prix Unitaire,Catégorie TVA
"Consultation IT",1,150.00,STANDARD
"Formation développement",8,75.50,STANDARD
"Hébergement web",1,29.90,STANDARD
"Livre technique",2,45.00,REDUCED
"Service export",1,200.00,NOT_SUBJECT
"Consultation médicale",1,120.00,EXEMPT`;
  };

  /**
   * Download template locally (without API call)
   */
  const downloadTemplateLocally = (): void => {
    const content = generateTemplateContent();
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_facture_simplifaq.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return {
    // State
    isLoading,
    error,
    
    // API methods
    uploadCSVFile,
    validateCSVContent,
    downloadTemplate,
    
    // Local methods
    parseCSVLocally,
    validateTVACategory,
    generateTemplateContent,
    downloadTemplateLocally,
    
    // Utilities
    clearError: () => setError(null)
  };
}