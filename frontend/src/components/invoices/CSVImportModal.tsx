/**
 * 🇨🇭 CSV Import Modal for Invoice Items
 * 
 * Modal component that allows users to import invoice items from CSV files
 */

import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SwissTVACategory } from '../../hooks/useTVA';

export interface CSVInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  tvaCategory: SwissTVACategory;
}

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: CSVInvoiceItem[]) => void;
  availableTVACategories: Array<{
    category: SwissTVACategory;
    label: string;
  }>;
}

interface ParsedRow {
  description: string;
  quantity: string;
  unitPrice: string;
  tvaCategory: string;
  rowIndex: number;
  errors: string[];
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  availableTVACategories
}) => {
  // Preserve original precision up to 3 decimals on import to avoid unintended rounding
  // Example: 22.006 should remain 22.006 even if user's display is 2 decimals
  const roundQty = (val: number) => {
    const factor = 1000; // store up to 3 decimals (matches backend InvoiceItem.quantity @db.Decimal(10, 3))
    return Math.round((Number.isFinite(val) ? val : 0) * factor) / factor;
  };
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [columnMapping, setColumnMapping] = useState({
    description: 0,
    quantity: 1,
    unitPrice: 2,
    tvaCategory: 3
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [delimiter, setDelimiter] = useState<string>(',');
  const [hasHeader, setHasHeader] = useState<boolean>(true);
  const [columns, setColumns] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [defaultTvaCategory, setDefaultTvaCategory] = useState<SwissTVACategory>(SwissTVACategory.STANDARD);

  const csvTemplate = `Description,Quantité,Prix Unitaire,Catégorie TVA
Consultation IT,1,150.00,STANDARD
Formation développement,8,75.50,STANDARD
Hébergement web,1,29.90,STANDARD
Livre technique,2,45.00,REDUCED
Service export,1,200.00,NOT_SUBJECT`;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setErrors(['Veuillez sélectionner un fichier CSV valide']);
        return;
      }
      setFile(selectedFile);
      setErrors([]);
    }
  };

  const parseCSV = (csvText: string, delim: string): string[][] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const result: string[][] = [];
    
    for (const line of lines) {
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delim && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      row.push(current.trim());
      result.push(row);
    }
    
    return result;
  };

  const validateTVACategory = (category: string): SwissTVACategory | null => {
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
      'EXPORT': SwissTVACategory.NOT_SUBJECT
    };
    
    return mappings[normalizedCategory] || null;
  };

  const handleParseFile = async () => {
    if (!file) return;
    
    setIsLoading(true);
    setErrors([]);
    
    try {
      const text = await file.text();
      const rows = parseCSV(text, delimiter);
      
      if (rows.length === 0) {
        setErrors(['Le fichier CSV est vide']);
        setIsLoading(false);
        return;
      }
      // Prepare mapping step
      const header = hasHeader ? rows[0] : rows[0].map((_, idx) => `Colonne ${idx + 1}`);
      setColumns(header);
      setRawRows(rows);
      // Try to auto-detect mapping by header names if present
      if (hasHeader) {
        const lower = header.map(h => h.toLowerCase());
        const findIdx = (keys: string[]) => lower.findIndex(h => keys.some(k => h.includes(k)));
        const descIdx = findIdx(['description', 'libellé', 'libelle']);
        const qtyIdx = findIdx(['quantité', 'quantite', 'qty', 'qté']);
        const priceIdx = findIdx(['prix', 'unitaire', 'unit']);
        const tvaIdx = findIdx(['tva', 'vat', 'catégorie', 'categorie']);
        setColumnMapping({
          description: descIdx >= 0 ? descIdx : 0,
          quantity: qtyIdx >= 0 ? qtyIdx : 1,
          unitPrice: priceIdx >= 0 ? priceIdx : 2,
          tvaCategory: tvaIdx >= 0 ? tvaIdx : 3,
        });
      }
      setStep('mapping');
    } catch {
      setErrors(['Erreur lors de la lecture du fichier CSV']);
    } finally {
      setIsLoading(false);
    }
  };

  const buildParsedFromMapping = () => {
    const rows = rawRows;
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const parsed: ParsedRow[] = dataRows.map((row, index) => {
      const errors: string[] = [];
      const getVal = (idx: number) => (idx >= 0 ? (row[idx]?.trim() || '') : '');
      const description = getVal(columnMapping.description);
      const quantityStr = getVal(columnMapping.quantity);
      const priceStr = getVal(columnMapping.unitPrice);
      const tvaFromCsv = getVal(columnMapping.tvaCategory);
      const tvaCategoryStr = columnMapping.tvaCategory === -1 ? defaultTvaCategory : tvaFromCsv;
      
      // Validation
      if (!description) errors.push('Description manquante');
      if (!quantityStr || isNaN(parseFloat(quantityStr))) errors.push('Quantité invalide');
      if (!priceStr || isNaN(parseFloat(priceStr))) errors.push('Prix invalide');
      if (columnMapping.tvaCategory !== -1 && !validateTVACategory(String(tvaCategoryStr))) errors.push('Catégorie TVA invalide');
      
      return {
        description,
        quantity: quantityStr,
        unitPrice: priceStr,
        tvaCategory: String(tvaCategoryStr),
        rowIndex: index + 1,
        errors
      };
    });
    setParsedData(parsed);
  };

  const handleImport = (e?: React.MouseEvent) => {
    // Prevent event propagation to avoid interfering with parent form
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const validItems = parsedData
      .filter(row => row.errors.length === 0)
      .map(row => ({
        description: row.description,
        quantity: roundQty(parseFloat(String(row.quantity).replace(',', '.'))),
        unitPrice: parseFloat(row.unitPrice),
        tvaCategory: validateTVACategory(row.tvaCategory) || defaultTvaCategory,
      }));

    onImport(validItems);
    handleClose();
  };

  const handleClose = (e?: React.MouseEvent) => {
    // Prevent event propagation to avoid interfering with parent form
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_facture_simplifaq.csv';
    link.click();
  };

  const validRows = parsedData.filter(row => row.errors.length === 0);
  const invalidRows = parsedData.filter(row => row.errors.length > 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importer des articles depuis un fichier CSV"
      size="lg"
    >
      {/* Form isolation wrapper to prevent event bubbling to parent form */}
      <div 
        className="space-y-6"
        onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onReset={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onKeyDown={(e) => {
          // Prevent Enter key from submitting parent form
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {step === 'upload' && (
          <>
            {/* Template Download */}
            <div className="surface-elevated border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-blue-800">
                    Format CSV Requis
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Votre fichier CSV doit contenir les colonnes suivantes :</p>
                    <ul className="mt-1 list-disc list-inside">
                      <li><strong>Description</strong> : Description de l'article</li>
                      <li><strong>Quantité</strong> : Nombre d'unités (ex: 1, 2.5)</li>
                      <li><strong>Prix Unitaire</strong> : Prix par unité en CHF (ex: 150.00)</li>
                      <li><strong>Catégorie TVA</strong> : STANDARD, REDUCED, SPECIAL, EXEMPT, NOT_SUBJECT</li>
                    </ul>
                  </div>
                  <div className="mt-3">
                    <Button
                      variant="secondary"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); downloadTemplate(); }}
                      className="text-sm"
                    >
                      📥 Télécharger le modèle CSV
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Paramètres d'analyse */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">Délimiteur de colonnes</label>
                <select
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                  className="w-full px-3 py-2 rounded-md input-theme"
                >
                  <option value=",">Virgule (,)</option>
                  <option value=";">Point-virgule (;)</option>
                  <option value="\t">Tabulation (TAB)</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center space-x-2">
                  <input type="checkbox" className="mr-2" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
                  <span>La première ligne contient les en-têtes</span>
                </label>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Sélectionner le fichier CSV
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-primary border-dashed rounded-md transition-colors">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-secondary">
                    <label htmlFor="csv-upload" className="relative cursor-pointer surface rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-2 py-1">
                      <span>Choisir un fichier</span>
                      <input
                        ref={fileInputRef}
                        id="csv-upload"
                        name="csv-upload"
                        type="file"
                        accept=".csv"
                        className="sr-only"
                        onChange={handleFileSelect}
                      />
                    </label>
                    <p className="pl-1">ou glisser-déposer</p>
                  </div>
                  <p className="text-xs text-secondary">CSV jusqu'à 10MB</p>
                </div>
              </div>
              
              {file && (
                <div className="mt-2 text-sm text-secondary">
                  Fichier sélectionné: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Erreurs détectées</h3>
                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={(e) => handleClose(e)}>
                Annuler
              </Button>
              <Button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleParseFile(); }}
                disabled={!file || isLoading}
              >
                {isLoading ? 'Analyse...' : 'Analyser le fichier'}
              </Button>
            </div>
          </>
        )}

        {step === 'mapping' && (
          <>
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-primary">Mapper les colonnes</h3>
              <p className="text-sm text-secondary">Associez chaque champ de la facture à la colonne correspondante du fichier CSV.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Description</label>
                  <select className="w-full px-3 py-2 rounded-md input-theme" value={columnMapping.description} onChange={(e)=>setColumnMapping({...columnMapping, description: parseInt(e.target.value)})}>
                    <option value={-1}>— Aucune —</option>
                    {columns.map((c, idx)=>(<option key={idx} value={idx}>{c || `Colonne ${idx+1}`}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Quantité</label>
                  <select className="w-full px-3 py-2 rounded-md input-theme" value={columnMapping.quantity} onChange={(e)=>setColumnMapping({...columnMapping, quantity: parseInt(e.target.value)})}>
                    <option value={-1}>— Aucune —</option>
                    {columns.map((c, idx)=>(<option key={idx} value={idx}>{c || `Colonne ${idx+1}`}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Prix unitaire</label>
                  <select className="w-full px-3 py-2 rounded-md input-theme" value={columnMapping.unitPrice} onChange={(e)=>setColumnMapping({...columnMapping, unitPrice: parseInt(e.target.value)})}>
                    <option value={-1}>— Aucune —</option>
                    {columns.map((c, idx)=>(<option key={idx} value={idx}>{c || `Colonne ${idx+1}`}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Catégorie TVA</label>
                  <select className="w-full px-3 py-2 rounded-md input-theme" value={columnMapping.tvaCategory} onChange={(e)=>setColumnMapping({...columnMapping, tvaCategory: parseInt(e.target.value)})}>
                    <option value={-1}>— Aucune —</option>
                    {columns.map((c, idx)=>(<option key={idx} value={idx}>{c || `Colonne ${idx+1}`}</option>))}
                  </select>
                  {columnMapping.tvaCategory === -1 && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-secondary mb-1">Catégorie TVA par défaut</label>
                      <select
                        className="w-full px-3 py-2 rounded-md input-theme"
                        value={defaultTvaCategory}
                        onChange={(e)=>setDefaultTvaCategory(e.target.value as SwissTVACategory)}
                      >
                        {(availableTVACategories && availableTVACategories.length > 0
                          ? availableTVACategories.map(opt => (
                              <option key={opt.category} value={opt.category}>{opt.label}</option>
                            ))
                          : Object.values(SwissTVACategory).map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))
                        )}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="secondary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStep('upload'); }}>← Retour</Button>
              <div className="space-x-3">
                <Button variant="secondary" onClick={(e) => handleClose(e)}>Annuler</Button>
                <Button onClick={(e) => { e.preventDefault(); e.stopPropagation(); buildParsedFromMapping(); setStep('preview'); }}>Continuer</Button>
              </div>
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
            {/* Summary */}
            <div className="surface-elevated rounded-lg p-4 border border-primary">
              <h3 className="text-lg font-medium text-primary mb-2">Résumé de l'importation</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-2xl font-bold text-green-600">{validRows.length}</div>
                  <div className="text-secondary">Articles valides</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{invalidRows.length}</div>
                  <div className="text-secondary">Articles avec erreurs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{parsedData.length}</div>
                  <div className="text-secondary">Total analysé</div>
                </div>
              </div>
            </div>

            {/* Preview Table */}
            <div className="max-h-96 overflow-y-auto border border-primary rounded-lg">
              <table className="min-w-full divide-y divide-[var(--color-border-primary)]">
                <thead className="surface-elevated sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Ligne
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Qté
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Prix
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      TVA
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-primary)]">
                  {parsedData.map((row, index) => (
                    <tr key={index} className={row.errors.length > 0 ? 'bg-red-50' : ''}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {row.rowIndex}
                      </td>
                      <td className="px-4 py-4 text-sm text-primary">
                        {row.description || <span className="text-secondary italic">Manquant</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {row.quantity || <span className="text-secondary italic">-</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {row.unitPrice ? `${row.unitPrice} CHF` : <span className="text-secondary italic">-</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                        {row.tvaCategory || <span className="text-secondary italic">-</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {row.errors.length === 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium chip-success">
                            ✓ Valide
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium chip-error">
                              ✗ Erreur
                            </span>
                            <div className="mt-1 text-xs text-red-600">
                              {row.errors.join(', ')}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="secondary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStep('upload'); }}>
                ← Retour
              </Button>
              <div className="space-x-3">
                <Button variant="secondary" onClick={(e) => handleClose(e)}>
                  Annuler
                </Button>
                <Button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleImport(e); }}
                  disabled={validRows.length === 0}
                >
                  Importer {validRows.length} article{validRows.length > 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};