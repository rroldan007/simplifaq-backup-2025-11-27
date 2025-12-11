import React, { useState } from 'react';
import { Input } from '../ui/Input';

interface InvoiceDetailsData {
  invoiceNumber: string;
  language: 'fr' | 'de' | 'it' | 'en';
  issueDate: string;
  dueDate: string;
  currency: 'CHF' | 'EUR';
}

interface EnhancedInvoiceDetailsProps {
  data: InvoiceDetailsData;
  onChange: (field: keyof InvoiceDetailsData, value: InvoiceDetailsData[keyof InvoiceDetailsData]) => void;
  errors?: Record<string, string>;
}

interface ValidationState {
  invoiceNumber: 'valid' | 'invalid' | 'pending';
  issueDate: 'valid' | 'invalid' | 'pending';
  dueDate: 'valid' | 'invalid' | 'pending';
}

const LANGUAGE_OPTIONS = [
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
];

const CURRENCY_OPTIONS = [
  { value: 'CHF', label: 'CHF', symbol: '₣', description: 'Franc suisse' },
  { value: 'EUR', label: 'EUR', symbol: '€', description: 'Euro' },
];

const DATE_PRESETS = [
  { label: '15 jours', days: 15 },
  { label: '30 jours', days: 30 },
  { label: '60 jours', days: 60 },
  { label: '90 jours', days: 90 },
];

export const EnhancedInvoiceDetails: React.FC<EnhancedInvoiceDetailsProps> = ({
  data,
  onChange,
  errors = {}
}) => {
  const [showDatePresets, setShowDatePresets] = useState(false);

  // Real-time validation using useMemo to avoid infinite re-renders
  const validation = React.useMemo<ValidationState>(() => {
    return {
      invoiceNumber: data.invoiceNumber.length >= 3 ? 'valid' : 'invalid',
      issueDate: data.issueDate ? 'valid' : 'invalid',
      dueDate: data.dueDate && new Date(data.dueDate) > new Date(data.issueDate) ? 'valid' : 'invalid',
    };
  }, [data.invoiceNumber, data.issueDate, data.dueDate]);

  const fieldClass = (field: keyof ValidationState) => {
    switch (validation[field]) {
      case 'valid': return 'border-[var(--color-border-primary)]';
      case 'invalid': return 'border-red-300';
      case 'pending': return 'border-[var(--color-border-primary)]';
    }
  };

  // Localized labels (minimal set)
  const L = React.useMemo(() => {
    const lang = data.language || 'fr';
    const dict: Record<string, Record<string, string>> = {
      fr: {
        number: 'Numéro',
        language: 'Langue',
        currency: 'Devise',
        issue: "Date d'émission",
        due: "Date d'échéance",
        min3: 'Minimum 3 caractères',
        mustAfter: "Doit être après la date d'émission",
        presetsIn: 'Échéance dans:'
      },
      en: {
        number: 'Number',
        language: 'Language',
        currency: 'Currency',
        issue: 'Issue date',
        due: 'Due date',
        min3: 'Minimum 3 characters',
        mustAfter: 'Must be after issue date',
        presetsIn: 'Due in:'
      },
      de: {
        number: 'Nummer',
        language: 'Sprache',
        currency: 'Währung',
        issue: 'Ausstellungsdatum',
        due: 'Fälligkeitsdatum',
        min3: 'Mindestens 3 Zeichen',
        mustAfter: 'Muss nach dem Ausstellungsdatum liegen',
        presetsIn: 'Fällig in:'
      },
      it: {
        number: 'Numero',
        language: 'Lingua',
        currency: 'Valuta',
        issue: 'Data di emissione',
        due: 'Data di scadenza',
        min3: 'Minimo 3 caratteri',
        mustAfter: "Deve essere dopo la data d'emissione",
        presetsIn: 'Scadenza tra:'
      },
    };
    return dict[lang] || dict.fr;
  }, [data.language]);

  const handleDatePreset = (days: number) => {
    const issueDate = new Date(data.issueDate);
    const dueDate = new Date(issueDate.getTime() + days * 24 * 60 * 60 * 1000);
    onChange('dueDate', dueDate.toISOString().split('T')[0]);
    setShowDatePresets(false);
  };

  const calculateDaysBetween = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDateLabel = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* Numéro */}
        <div className="space-y-0.5">
          <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">{L.number}</label>
          <div className={`rounded-md border ${fieldClass('invoiceNumber')} bg-[var(--color-bg-primary)] px-2 py-1`}>
            <Input
              type="text"
              value={data.invoiceNumber}
              onChange={(e) => onChange('invoiceNumber', e.target.value)}
              placeholder="FAC-2025-001"
              error={errors.invoiceNumber}
              className="border-0 bg-transparent p-0 focus:ring-0 text-[13px]"
            />
          </div>
          {validation.invoiceNumber === 'invalid' && (
            <p className="text-[10px] text-red-600">{L.min3}</p>
          )}
        </div>

        {/* Langue */}
        <div className="space-y-0.5">
          <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">{L.language}</label>
          <div className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1">
            <select
              value={data.language}
              onChange={(e) => onChange('language', e.target.value)}
              className="w-full border-0 bg-transparent p-0 focus:ring-0 appearance-none cursor-pointer text-[13px] text-[var(--color-text-primary)]"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.flag} {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Devise */}
        <div className="space-y-0.5">
          <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">{L.currency}</label>
          <div className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1">
            <select
              value={data.currency}
              onChange={(e) => onChange('currency', e.target.value)}
              className="w-full border-0 bg-transparent p-0 focus:ring-0 appearance-none cursor-pointer text-[13px] text-[var(--color-text-primary)]"
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.symbol} {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* Émission */}
        <div className="space-y-0.5">
          <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">{L.issue}</label>
          <div className={`rounded-md border ${fieldClass('issueDate')} bg-[var(--color-bg-primary)] px-2 py-1`}>
            <Input
              type="date"
              value={data.issueDate}
              onChange={(e) => onChange('issueDate', e.target.value)}
              error={errors.issueDate}
              className="border-0 bg-transparent p-0 focus:ring-0 text-[13px]"
            />
          </div>
          {data.issueDate && (
            <p className="text-[10px] text-[var(--color-text-tertiary)]">{formatDateLabel(data.issueDate)}</p>
          )}
        </div>

        {/* Échéance */}
        <div className="space-y-0.5 relative">
          <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">{L.due}</label>
          <div className={`rounded-md border ${fieldClass('dueDate')} bg-[var(--color-bg-primary)] px-2 py-1 flex items-center gap-2`}>
            <Input
              type="date"
              value={data.dueDate}
              onChange={(e) => onChange('dueDate', e.target.value)}
              error={errors.dueDate}
              className="border-0 bg-transparent p-0 focus:ring-0 flex-1 text-[13px]"
            />
            <button
              type="button"
              onClick={() => setShowDatePresets(v => !v)}
              className="text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-1.5 py-0.5 rounded border border-[var(--color-border-primary)]"
              title="Presets"
            >
              ⚡
            </button>
          </div>
          {showDatePresets && (
            <div className="absolute top-full right-0 z-10 mt-1 min-w-[160px] rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] shadow-md">
              <div className="p-2 space-y-1">
                <p className="text-[10px] text-[var(--color-text-tertiary)]">{L.presetsIn}</p>
                <div className="grid grid-cols-4 gap-1">
                  {DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => { handleDatePreset(preset.days); setShowDatePresets(false); }}
                      className="px-1.5 py-0.5 rounded border border-[var(--color-border-primary)] hover:bg-[var(--color-bg-secondary)] text-[11px]"
                    >
                      {preset.days}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {data.issueDate && data.dueDate && validation.dueDate === 'valid' && (
            <p className="text-[10px] text-[var(--color-text-tertiary)]">
              {calculateDaysBetween(data.issueDate, data.dueDate)} jours • {formatDateLabel(data.dueDate)}
            </p>
          )}
          {validation.dueDate === 'invalid' && (
            <p className="text-[10px] text-red-600">{L.mustAfter}</p>
          )}
        </div>
      </div>
    </div>
  );
}
  ;
