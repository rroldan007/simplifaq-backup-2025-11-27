/**
 * CSV Import Modal for Products
 * Allows importing products from a CSV using a mapping flow similar to invoice items import
 */

import React, { useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CURRENT_SWISS_TVA_RATES } from '../../config/swissTaxRates';
import { normalizeUnit } from '../../utils/unitUtils';

export interface CSVImportedProduct {
  name: string;
  description?: string;
  unitPrice: number;
  tvaRate: number;
  unit: string;
  isActive: boolean;
}

interface CSVImportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: CSVImportedProduct[]) => void;
}

interface ParsedRow {
  name: string;
  description: string;
  unitPrice: string;
  tva: string; // can be numeric rate or category string
  unit: string;
  isActive: string; // yes/no true/false 1/0
  rowIndex: number;
  errors: string[];
}

type ColumnMapping = {
  name: number;
  description: number;
  unitPrice: number;
  tva: number;
  unit: number;
  isActive: number;
};

export const CSVImportProductsModal: React.FC<CSVImportProductsModalProps> = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [delimiter, setDelimiter] = useState<string>(',');
  const [hasHeader, setHasHeader] = useState<boolean>(true);
  const [columns, setColumns] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    name: 0,
    description: 1,
    unitPrice: 2,
    tva: 3,
    unit: 4,
    isActive: 5,
  });
  const [defaultUnit, setDefaultUnit] = useState<string>('unité');
  const [defaultActive, setDefaultActive] = useState<boolean>(true);
  const [defaultTVARate, setDefaultTVARate] = useState<number>(CURRENT_SWISS_TVA_RATES[0]?.value ?? 8.1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const csvTemplate = `Nom,Description,Prix Unitaire,TVA,Unité,Actif\n` +
    `Consultation IT,Conseil informatique,150.00,STANDARD,heure,true\n` +
    `Développement Web,Création de site,95.00,STANDARD,heure,true\n` +
    `Livre technique,Documentation,45.00,REDUCED,pièce,true`;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'text/csv' && !f.name.endsWith('.csv')) {
      setErrors(['Veuillez sélectionner un fichier CSV valide']);
      return;
    }
    setFile(f);
    setErrors([]);
  };

  const parseCSV = (csvText: string, delim: string): string[][] => {
    const lines = csvText.split('\n').filter(l => l.trim());
    const out: string[][] = [];
    for (const line of lines) {
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') inQuotes = !inQuotes; else if (ch === delim && !inQuotes) { row.push(current.trim()); current = ''; } else current += ch;
      }
      row.push(current.trim());
      out.push(row);
    }
    return out;
  };

  const detectRateFromInput = (val: string): number | null => {
    if (!val) return null;
    const v = val.trim();
    // numeric like 8.1 or 2.6
    const num = Number(v.replace(',', '.'));
    if (!Number.isNaN(num) && num >= 0 && num <= 100) return num;
    // category string
    const upper = v.toUpperCase();
    const byCategory: Record<string, number> = {
      STANDARD: 8.1,
      NORMAL: 8.1,
      'TAUX NORMAL': 8.1,
      REDUCED: 2.6,
      RÉDUIT: 2.6,
      REDUIT: 2.6,
      SPECIAL: 3.8,
      SPÉCIAL: 3.8,
      EXEMPT: 0,
      EXONERE: 0,
      EXONÉRÉ: 0,
      'NOT_SUBJECT': 0,
      'NON ASSUJETTI': 0,
    };
    // Also try to match from configured labels (extract the leading number from label like '8.1% (Taux normal)')
    const fromLabel = CURRENT_SWISS_TVA_RATES.find(r => r.label.toUpperCase().includes(upper));
    if (fromLabel) return fromLabel.value;
    return byCategory[upper] ?? null;
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
      const header = hasHeader ? rows[0] : rows[0].map((_, idx) => `Colonne ${idx + 1}`);
      setColumns(header);
      setRawRows(rows);

      if (hasHeader) {
        const lower = header.map(h => h.toLowerCase());
        const findIdx = (keys: string[]) => lower.findIndex(h => keys.some(k => h.includes(k)));
        const nameIdx = findIdx(['nom', 'name', 'produit']);
        const descIdx = findIdx(['description', 'libellé', 'libelle']);
        const priceIdx = findIdx(['prix', 'price', 'unitprice', 'unitaire']);
        const tvaIdx = findIdx(['tva', 'vat']);
        const unitIdx = findIdx(['unité', 'unite', 'unit']);
        const activeIdx = findIdx(['actif', 'active', 'status', 'etat']);
        setColumnMapping({
          name: nameIdx >= 0 ? nameIdx : 0,
          description: descIdx >= 0 ? descIdx : 1,
          unitPrice: priceIdx >= 0 ? priceIdx : 2,
          tva: tvaIdx >= 0 ? tvaIdx : 3,
          unit: unitIdx >= 0 ? unitIdx : 4,
          isActive: activeIdx >= 0 ? activeIdx : 5,
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
    const parsed: ParsedRow[] = dataRows.map((row, idx) => {
      const getVal = (i: number) => (i >= 0 ? (row[i]?.trim() || '') : '');
      const name = getVal(columnMapping.name);
      const description = getVal(columnMapping.description);
      const unitPriceStr = getVal(columnMapping.unitPrice);
      const tvaStr = getVal(columnMapping.tva);
      const unitStr = getVal(columnMapping.unit) || defaultUnit;
      const isActiveStr = getVal(columnMapping.isActive);

      const errs: string[] = [];
      if (!name) errs.push('Nom manquant');
      const unitPrice = Number(unitPriceStr.replace(',', '.'));
      if (Number.isNaN(unitPrice) || unitPrice <= 0) errs.push('Prix unitaire invalide');
      const rate = columnMapping.tva === -1 ? defaultTVARate : (detectRateFromInput(tvaStr) ?? defaultTVARate);
      if (rate == null) errs.push('TVA invalide');

      let isActive = defaultActive;
      if (columnMapping.isActive !== -1 && isActiveStr) {
        const s = isActiveStr.toLowerCase();
        isActive = ['true', '1', 'oui', 'yes', 'activo', 'actif'].includes(s);
      }

      return {
        name,
        description,
        unitPrice: unitPriceStr,
        tva: String(rate ?? ''),
        unit: unitStr,
        isActive: String(isActive),
        rowIndex: idx + 1,
        errors: errs,
      };
    });
    setParsedData(parsed);
  };

  const handleImport = () => {
    const valid = parsedData.filter(r => r.errors.length === 0);
    const products: CSVImportedProduct[] = valid.map(r => ({
      name: r.name,
      description: r.description || undefined,
      unitPrice: Number(String(r.unitPrice).replace(',', '.')),
      tvaRate: Number(r.tva),
      // Normalize unit: "Kilogramme" -> "kg", "Litre" -> "liter", etc.
      unit: normalizeUnit(r.unit || defaultUnit),
      isActive: r.isActive.toString().toLowerCase() === 'true',
    }));
    onImport(products);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_produits_simplifaq.csv';
    link.click();
  };

  const validRows = parsedData.filter(r => r.errors.length === 0);
  const invalidRows = parsedData.filter(r => r.errors.length > 0);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importer des produits depuis CSV" size="lg">
      <div className="space-y-6">
        {step === 'upload' && (
          <>
            <div className="surface-elevated border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-blue-800">Format CSV Requis</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Colonnes attendues :</p>
                    <ul className="mt-1 list-disc list-inside">
                      <li><strong>Nom</strong> (obligatoire)</li>
                      <li><strong>Description</strong> (optionnel)</li>
                      <li><strong>Prix Unitaire</strong> (CHF)</li>
                      <li><strong>TVA</strong> (catégorie: STANDARD/REDUCED/SPECIAL/EXEMPT/NOT_SUBJECT ou taux: 8.1/2.6/3.8/0)</li>
                      <li><strong>Unité</strong> (ex: heure, pièce)</li>
                      <li><strong>Actif</strong> (true/false)</li>
                    </ul>
                  </div>
                  <div className="mt-3">
                    <Button variant="secondary" onClick={downloadTemplate} className="text-sm">
                      📥 Télécharger le modèle CSV
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">Délimiteur</label>
                <select value={delimiter} onChange={e => setDelimiter(e.target.value)} className="w-full px-3 py-2 rounded-md input-theme">
                  <option value=",">Virgule (,)</option>
                  <option value=";">Point-virgule (;)</option>
                  <option value="\t">Tabulation (TAB)</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center space-x-2">
                  <input type="checkbox" className="mr-2" checked={hasHeader} onChange={e => setHasHeader(e.target.checked)} />
                  <span>Première ligne = en-têtes</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">TVA par défaut</label>
                <select value={defaultTVARate} onChange={e => setDefaultTVARate(Number(e.target.value))} className="w-full px-3 py-2 rounded-md input-theme">
                  {CURRENT_SWISS_TVA_RATES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">Sélectionner le fichier CSV</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-primary border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <div className="flex text-sm text-secondary">
                    <label htmlFor="csv-products-upload" className="relative cursor-pointer surface rounded-md font-medium text-blue-600 hover:text-blue-500 px-2 py-1">
                      <span>Choisir un fichier</span>
                      <input ref={fileInputRef} id="csv-products-upload" name="csv-products-upload" type="file" accept=".csv" className="sr-only" onChange={handleFileSelect} />
                    </label>
                    <p className="pl-1">ou glisser-déposer</p>
                  </div>
                  {file && (
                    <div className="mt-2 text-sm text-secondary">
                      Fichier sélectionné: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-red-800">Erreurs détectées</h3>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={handleClose}>Annuler</Button>
              <Button onClick={handleParseFile} disabled={!file || isLoading}>{isLoading ? 'Analyse...' : 'Analyser le fichier'}</Button>
            </div>
          </>
        )}

        {step === 'mapping' && (
          <>
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-primary">Mapper les colonnes</h3>
              <p className="text-sm text-secondary">Associez les champs du produit aux colonnes du CSV.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(
                  [
                    { label: 'Nom', key: 'name' as const },
                    { label: 'Description', key: 'description' as const },
                    { label: 'Prix Unitaire', key: 'unitPrice' as const },
                    { label: 'TVA (catégorie ou taux)', key: 'tva' as const },
                    { label: 'Unité', key: 'unit' as const },
                    { label: 'Actif', key: 'isActive' as const },
                  ]
                ).map((field, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-medium text-secondary mb-1">{field.label}</label>
                    <select
                      className="w-full px-3 py-2 rounded-md input-theme"
                      value={columnMapping[field.key]}
                      onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: parseInt(e.target.value, 10) })}
                    >
                      <option value={-1}>— Utiliser la valeur par défaut —</option>
                      {columns.map((c, i) => (
                        <option key={i} value={i}>{c || `Colonne ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Unité par défaut</label>
                  <input className="w-full px-3 py-2 rounded-md input-theme" value={defaultUnit} onChange={e => setDefaultUnit(e.target.value)} />
                </div>
                <div className="flex items-end space-x-2">
                  <label className="inline-flex items-center">
                    <input type="checkbox" className="mr-2" checked={defaultActive} onChange={e => setDefaultActive(e.target.checked)} />
                    <span>Actif par défaut</span>
                  </label>
                  <Button variant="secondary" onClick={buildParsedFromMapping}>Prévisualiser</Button>
                </div>
              </div>
            </div>

            {parsedData.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-primary mb-2">Aperçu</h4>
                <div className="max-h-64 overflow-auto border border-primary rounded">
                  <table className="min-w-full text-sm divide-y divide-[var(--color-border-primary)]">
                    <thead className="surface-elevated">
                      <tr>
                        <th className="px-2 py-1 text-left">#</th>
                        <th className="px-2 py-1 text-left">Nom</th>
                        <th className="px-2 py-1 text-left">Prix</th>
                        <th className="px-2 py-1 text-left">TVA</th>
                        <th className="px-2 py-1 text-left">Unité</th>
                        <th className="px-2 py-1 text-left">Actif</th>
                        <th className="px-2 py-1 text-left">Erreurs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-primary)]">
                      {parsedData.map((r, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1">{r.rowIndex}</td>
                          <td className="px-2 py-1">{r.name}</td>
                          <td className="px-2 py-1">{r.unitPrice}</td>
                          <td className="px-2 py-1">{r.tva}</td>
                          <td className="px-2 py-1">{r.unit}</td>
                          <td className="px-2 py-1">{r.isActive}</td>
                          <td className="px-2 py-1 text-red-600">{r.errors.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-sm text-secondary mt-2">Valides: {validRows.length} | Invalides: {invalidRows.length}</div>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-4">
              <Button variant="secondary" onClick={handleClose}>Retour</Button>
              <Button onClick={handleImport} disabled={validRows.length === 0}>Importer</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
