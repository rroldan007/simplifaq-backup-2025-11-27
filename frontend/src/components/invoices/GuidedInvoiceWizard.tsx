import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Package, Info } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ClientSelector } from './ClientSelector';
import { InvoiceItemsTable } from './InvoiceItemsTable';
import { EnhancedInvoiceDetails } from './EnhancedInvoiceDetails';
import { WizardProgress } from './WizardProgress';
import { EnhancedProductSearch } from './EnhancedProductSearch';
import { useClients } from '../../hooks/useClients';
import { useAutoFormPreservation } from '../../hooks/useFormDataPreservation';
import { useProducts } from '../../hooks/useProducts';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { applySynonyms } from '../../config/searchSynonyms';
import { api } from '../../services/api';
import { quotesApi } from '../../services/quotesApi';
import { useCurrentUser } from '../../hooks/useAuth';
import { DEFAULT_DISCOUNT_VALUE, DEFAULT_DISCOUNT_TYPE } from '../../constants/discounts';

// Common stopwords set (fr/en) for token filtering — module scoped to avoid hook deps
const STOPWORDS_FR_EN = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'et', 'ou', 'pour', 'par', 'au', 'aux', 'en', 'sur', 'avec', 'sans', 'the', 'a', 'an', 'of', 'for', 'in', 'on', 'and', 'or', 'to'
]);

export type Language = 'fr' | 'de' | 'it' | 'en';
export type Currency = 'CHF' | 'EUR';

export interface Client {
  id: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  vatNumber?: string;
}

type Suggestion = {
  id: string;
  name: string;
  unitPrice: number;
  tvaRate: number;
  score: number;
  exactMatches: number;
};

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  total: number;
  order: number;
  productId?: string;
  unit?: string;
  // Discount fields
  lineDiscountValue?: number;
  lineDiscountType?: 'PERCENT' | 'AMOUNT';
  lineDiscountSource?: 'FROM_PRODUCT' | 'MANUAL' | 'NONE';
  subtotalBeforeDiscount?: number;
  discountAmount?: number;
  subtotalAfterDiscount?: number;
}

export interface InvoiceFormData {
  invoiceNumber: string;
  client: Client | null;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  language: Language;
  currency: Currency;
  // Recurring billing (optional)
  estRecurrente?: boolean;
  frequence?: 'MENSUEL' | 'TRIMESTRIEL' | 'SEMESTRIEL';
  prochaineDateRecurrence?: string; // yyyy-mm-dd
  dateFinRecurrence?: string; // yyyy-mm-dd
  // Global discount (optional)
  globalDiscountValue?: number;
  globalDiscountType?: 'PERCENT' | 'AMOUNT';
  globalDiscountNote?: string;
}

interface GuidedInvoiceWizardProps {
  mode?: 'create' | 'edit';
  documentType?: 'invoice' | 'quote';
  initialData?: Partial<InvoiceFormData>;
  onSubmit: (data: InvoiceFormData) => void;
  onCancel?: () => void;
  onPreview?: (data: InvoiceFormData) => void;
  loading?: boolean;
  lockItems?: boolean;
}

export const GuidedInvoiceWizard: React.FC<GuidedInvoiceWizardProps> = ({
  mode = 'create',
  documentType = 'invoice',
  initialData,
  onSubmit,
  onCancel,
  onPreview,
  loading = false,
  lockItems = false,
}) => {
  const t = useMemo(() => {
    if (documentType === 'quote') {
      return {
        docName: 'devis',
        newDoc: 'Nouveau devis',
        editDoc: 'Modifier le devis',
        restore: 'Un brouillon enregistré a été trouvé pour ce devis. Voulez-vous le restaurer ?',
        finish: 'Terminer et créer le devis',
      };
    }
    return {
      docName: 'facture',
      newDoc: 'Nouvelle facture',
      editDoc: 'Modifier la facture',
      restore: 'Un brouillon enregistré a été trouvé pour cette facture. Voulez-vous le restaurer ?',
      finish: 'Terminer et créer la facture',
    };
  }, [documentType]);

  // Feature flags
  const { isEnabled } = useFeatureFlags();
  const useEnhanced = isEnabled('enhancedInvoiceWizard');
  const useSmartSearch = isEnabled('smartProductSearch');
  const useAnimations = isEnabled('animatedTransitions');

  const [step, setStep] = useState<number>(1); // 1..3
  const { clients, loading: clientsLoading } = useClients({});
  const { products } = useProducts({ autoRefresh: false });
  const user = useCurrentUser();

  const [data, setData] = useState<InvoiceFormData>({
    invoiceNumber: '',
    client: null,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    notes: '',
    terms: '',
    language: 'fr',
    currency: 'CHF',
    estRecurrente: false,
    frequence: 'MENSUEL',
    prochaineDateRecurrence: undefined,
    dateFinRecurrence: undefined,
    ...(initialData || {}),
  });

  // Local UI state for recurrence end mode: none | 12 | 24 | custom
  const [recurrenceEndMode, setRecurrenceEndMode] = useState<'none' | '12' | '24' | 'custom'>('none');
  const [recurrenceBase, setRecurrenceBase] = useState<'issue' | 'due'>('issue');

  // Helpers to manage dates
  const toISODate = (d: Date) => d.toISOString().split('T')[0];
  const addMonths = (dateStr: string, months: number) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const nd = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
    return toISODate(nd);
  };

  // Add months preserving day-of-month where possible; if the next month doesn't have that day, use last day of month
  const addMonthsSameDay = (dateStr: string, months: number) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();
    const target = new Date(year, month + months + 1, 0); // last day of target month
    const chosenDay = Math.min(day, target.getDate());
    return toISODate(new Date(year, month + months, chosenDay));
  };

  // Auto compute next recurrence date flag
  const [autoNextDate, setAutoNextDate] = useState<boolean>(true);

  // Ref to track previous recurrence base dates to prevent infinite loops
  const prevRecurrenceRef = useRef<{ issueDate: string; dueDate: string; frequence?: string }>({ issueDate: '', dueDate: '' });

  // Load saved preference for recurrence base
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('recurrenceBasePreference');
      if (saved === 'issue' || saved === 'due') {
        setRecurrenceBase(saved as 'issue' | 'due');
      }
    } catch { /* ignore storage errors */ }
  }, []);

  // Persist preference when it changes
  useEffect(() => {
    try {
      window.localStorage.setItem('recurrenceBasePreference', recurrenceBase);
    } catch { /* ignore storage errors */ }
  }, [recurrenceBase]);

  // Load backend preference if available (overrides local)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const profile = await api.getProfile();
        const pref = (profile?.user?.recurrenceBasePreference || '').toString();
        if (mounted && (pref === 'issue' || pref === 'due')) {
          setRecurrenceBase(pref as 'issue' | 'due');
          try { window.localStorage.setItem('recurrenceBasePreference', pref); } catch { /* ignore */ }
        }
      } catch {
        // ignore profile errors; fallback to localStorage handled above
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Recompute prochaineDateRecurrence when frequency or issueDate changes and auto is on
  useEffect(() => {
    if (!data.estRecurrente) return;
    if (!autoNextDate) return;

    // Check if the base date actually changed to prevent infinite loop
    const baseDate = recurrenceBase === 'due' ? data.dueDate : data.issueDate;
    const prevBase = recurrenceBase === 'due'
      ? prevRecurrenceRef.current.dueDate
      : prevRecurrenceRef.current.issueDate;

    // Only recalculate if the base date actually changed
    if (baseDate === prevBase && data.frequence === prevRecurrenceRef.current.frequence) {
      return;
    }

    // Update the ref with current values
    prevRecurrenceRef.current = {
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      frequence: data.frequence
    };

    const base = baseDate || toISODate(new Date());
    let months = 1;
    if (data.frequence === 'TRIMESTRIEL') months = 3;
    if (data.frequence === 'SEMESTRIEL') months = 6;
    const next = addMonthsSameDay(base, months);
    setData(prev => ({ ...prev, prochaineDateRecurrence: next }));
    // Also update end date if preset selected
    if (recurrenceEndMode === '12') {
      setData(prev => ({ ...prev, dateFinRecurrence: addMonthsSameDay(next, 11) }));
    } else if (recurrenceEndMode === '24') {
      setData(prev => ({ ...prev, dateFinRecurrence: addMonthsSameDay(next, 23) }));
    }
    // TODO: REVISAR DEPENDENCIAS - Falta: addMonthsSameDay (necesita useCallback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.estRecurrente, data.frequence, data.issueDate, data.dueDate, autoNextDate, recurrenceEndMode, recurrenceBase]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productQuery, setProductQuery] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Autosave minimal (enhancements planned)
  const hasId = (obj: unknown): obj is { id?: string } => {
    return !!obj && typeof obj === 'object' && 'id' in obj;
  };
  const editId = hasId(initialData) && typeof initialData.id === 'string' ? initialData.id : undefined;
  const preservationOptions = useMemo(() => ({
    expiryHours: 48,
    encrypt: true,
    debounceMs: 1500,
    sensitiveFields: ['vatNumber', 'email', 'notes'],
  }), []);
  const preservation = useAutoFormPreservation(`${t.docName}-wizard-${mode}${editId ? `-${editId}` : ''}`, data as unknown as Record<string, unknown>, preservationOptions);

  const { preservationId, restoreMostRecent, clearFormData } = preservation;
  const [showRestoreBanner, setShowRestoreBanner] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [showCreateClient, setShowCreateClient] = useState<boolean>(false);
  const [createClientLoading, setCreateClientLoading] = useState<boolean>(false);
  const [newClient, setNewClient] = useState<{
    companyName?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    vatNumber?: string;
  }>({
    email: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'CH',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    window.setTimeout(() => setToastVisible(false), 2500);
  };

  const hasMeaningfulDiff = (cur: InvoiceFormData, cand: Partial<InvoiceFormData> | null): boolean => {
    if (!cand) return false;
    const keys: (keyof InvoiceFormData)[] = ['invoiceNumber', 'issueDate', 'dueDate', 'language', 'currency', 'notes', 'terms'];
    if (keys.some(k => String(cur[k] ?? '').trim() !== String((cand as Record<string, unknown>)[k] ?? '').trim())) return true;
    const curClient = cur.client?.id ?? '';
    const candClient = (cand.client as Client | undefined)?.id ?? '';
    if (curClient !== candClient) return true;
    const curItems = Array.isArray(cur.items) ? cur.items : [];
    const candItems = Array.isArray(cand.items) ? (cand.items as InvoiceItem[]) : [];
    if (curItems.length !== candItems.length) return true;
    for (let i = 0; i < curItems.length; i++) {
      const a = curItems[i];
      const b = candItems[i] as Partial<InvoiceItem> | undefined;
      if (
        String(a.description || '') !== String(b?.description || '') ||
        Number(a.quantity || 0) !== Number(b?.quantity || 0) ||
        Number(a.unitPrice || 0) !== Number(b?.unitPrice || 0) ||
        Number(a.tvaRate || 0) !== Number(b?.tvaRate || 0)
      ) return true;
    }
    return false;
  };

  // Create stable key for draft detection to prevent infinite re-renders
  // Only re-check when meaningful fields change, not on every keystroke
  const draftDetectionKey = useMemo(
    () => JSON.stringify({
      clientId: data.client?.id,
      itemsCount: data.items?.length,
      hasNumber: !!data.invoiceNumber
    }),
    [data.client?.id, data.items?.length, data.invoiceNumber]
  );

  useEffect(() => {
    // Only prompt restore if preserved draft actually differs
    if (!preservationId) return;
    (async () => {
      try {
        const cand = await restoreMostRecent?.();
        if (cand && hasMeaningfulDiff(data, cand)) {
          setShowRestoreBanner(true);
        }
      } catch (err) {
        console.debug('[GuidedInvoiceWizard] restoreMostRecent failed', err);
      }
    })();
    // Use stable key instead of full data object to prevent loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preservationId, restoreMostRecent, draftDetectionKey]);

  const handleRestoreDraft = async () => {
    try {
      const restored = await restoreMostRecent?.();
      if (restored) {
        // Basic sanity: ensure required fields exist; fallback to current defaults
        setData(prev => ({
          ...prev,
          ...restored,
          // guard dates to strings (ISO yyyy-mm-dd)
          issueDate: String(restored.issueDate || prev.issueDate),
          dueDate: String(restored.dueDate || prev.dueDate),
          items: Array.isArray(restored.items) ? restored.items : prev.items,
        }));
        showToast('Brouillon restauré');
      }
    } finally {
      setShowRestoreBanner(false);
    }
  };

  const handleDismissDraft = async () => {
    try {
      await clearFormData?.();
    } finally {
      setShowRestoreBanner(false);
      showToast('Brouillon ignoré');
    }
  };

  // Generate number preview for create mode using user configuration from Settings
  // NOTE: This is only a preview. The actual number is generated by the backend
  // when the document is created, using the same logic to ensure consistency.
  useEffect(() => {
    // Only generate number if we're creating a new document
    if (mode !== 'create' || !user) return;

    const generateNumberPreview = (prefix: string, nextNumber: number, padding: number): string => {
      const pad = Math.max(0, Number(padding || 0));
      const numeric = String(nextNumber);
      const padded = pad > 0 ? numeric.padStart(pad, '0') : numeric;
      const pref = (prefix || '').trim();
      return pref ? `${pref}-${padded}` : padded;
    };

    let mounted = true;
    (async () => {
      try {
        const isQuote = documentType === 'quote';

        // For quotes, get the actual next number from the backend
        if (isQuote) {
          try {
            const nextNumber = await quotesApi.getNextNumber();
            if (mounted) {
              setData(prev => ({ ...prev, invoiceNumber: nextNumber }));
            }
            return;
          } catch (e) {
            console.error('Error fetching next quote number:', e);
            // Fall through to old logic if API call fails
          }
        }

        // For invoices, use the existing logic
        const full = await api.getMyProfile().catch(() => null);
        type UserWithInvoiceSettings = { invoicePrefix?: string; nextInvoiceNumber?: number; invoicePadding?: number } | null;
        const u = (full || user) as UserWithInvoiceSettings;
        const userFallback = user as UserWithInvoiceSettings;

        const prefix = u?.invoicePrefix || userFallback?.invoicePrefix || '';
        const nextNumber = u?.nextInvoiceNumber ?? userFallback?.nextInvoiceNumber ?? 1;
        const padding = u?.invoicePadding ?? userFallback?.invoicePadding ?? 0;

        let preview = generateNumberPreview(prefix, Number(nextNumber || 1), Number(padding || 0));

        // Apply fallback ONLY if no prefix and too short → increase padding to 3
        if ((preview || '').trim().length < 3) {
          if (!String(prefix).trim()) {
            const paddedPreview = generateNumberPreview('', Number(nextNumber || 1), Math.max(3, Number(padding || 0)));
            preview = paddedPreview;
          }
          // As a very last resort keep a sensible default
          if ((preview || '').trim().length < 3) {
            preview = 'INV-001';
          }
        }

        if (mounted) {
          setData(prev => ({ ...prev, invoiceNumber: preview }));
        }
      } catch {
        // Non-blocking: if profile fetch fails, keep current user-derived number
      }
    })();

    return () => { mounted = false; };
  }, [mode, documentType, user]);

  const totals = useMemo(() => {
    // Calculate subtotal AFTER line discounts
    const subtotalAfterLineDiscounts = (data.items || []).reduce((s, it) => {
      const itemSubtotalBefore = it.quantity * it.unitPrice;
      let lineDiscount = 0;

      if (it.lineDiscountValue && it.lineDiscountValue > 0) {
        if (it.lineDiscountType === 'PERCENT') {
          lineDiscount = itemSubtotalBefore * (it.lineDiscountValue / 100);
        } else {
          lineDiscount = Math.min(it.lineDiscountValue, itemSubtotalBefore);
        }
      }

      return s + (itemSubtotalBefore - lineDiscount);
    }, 0);

    // Calculate global discount
    let globalDiscount = 0;
    if (data.globalDiscountValue && data.globalDiscountValue > 0) {
      if (data.globalDiscountType === 'PERCENT') {
        globalDiscount = subtotalAfterLineDiscounts * (data.globalDiscountValue / 100);
      } else {
        globalDiscount = Math.min(data.globalDiscountValue, subtotalAfterLineDiscounts);
      }
    }

    const subtotalAfterGlobalDiscount = subtotalAfterLineDiscounts - globalDiscount;

    // Calculate TVA on amount AFTER all discounts
    const totalTva = (data.items || []).reduce((s, it) => {
      const itemSubtotalBefore = it.quantity * it.unitPrice;
      let lineDiscount = 0;

      if (it.lineDiscountValue && it.lineDiscountValue > 0) {
        if (it.lineDiscountType === 'PERCENT') {
          lineDiscount = itemSubtotalBefore * (it.lineDiscountValue / 100);
        } else {
          lineDiscount = Math.min(it.lineDiscountValue, itemSubtotalBefore);
        }
      }

      const itemSubtotalAfterLine = itemSubtotalBefore - lineDiscount;
      // Apply proportional global discount to this item
      const itemProportion = subtotalAfterLineDiscounts > 0 ? itemSubtotalAfterLine / subtotalAfterLineDiscounts : 0;
      const itemGlobalDiscount = globalDiscount * itemProportion;
      const itemFinalSubtotal = itemSubtotalAfterLine - itemGlobalDiscount;

      return s + (itemFinalSubtotal * (it.tvaRate / 100));
    }, 0);

    return {
      subtotal: subtotalAfterLineDiscounts,
      globalDiscount,
      subtotalAfterGlobal: subtotalAfterGlobalDiscount,
      totalTva,
      total: subtotalAfterGlobalDiscount + totalTva
    };
  }, [data.items, data.globalDiscountValue, data.globalDiscountType]);

  const update = (field: keyof InvoiceFormData, value: InvoiceFormData[keyof InvoiceFormData]) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Search normalization: lower, strip diacritics, tokenize
  const normalize = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics (fr)
      .replace(/[^a-z0-9\s]/g, ' ') // non-alnum to space
      .replace(/\s+/g, ' ')
      .trim();
  const lemmatize = (t: string) => {
    // simple plural trim for en/fr: remove trailing 's' if >3 chars and not 'ss'
    if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
    return t;
  };
  const tokenize = useCallback((s: string) =>
    normalize(s)
      .split(' ')
      .filter(Boolean)
      .map(lemmatize)
      .filter(t => t.length > 1 && !STOPWORDS_FR_EN.has(t))
    , []);

  // Levenshtein distance for fuzzy matching
  const levenshtein = (a: string, b: string) => {
    if (a === b) return 0;
    const al = a.length, bl = b.length;
    if (al === 0) return bl;
    if (bl === 0) return al;
    const dp = Array.from({ length: al + 1 }, () => Array<number>(bl + 1).fill(0));
    for (let i = 0; i <= al; i++) dp[i][0] = i;
    for (let j = 0; j <= bl; j++) dp[0][j] = j;
    for (let i = 1; i <= al; i++) {
      for (let j = 1; j <= bl; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[al][bl];
  };

  const tokenSimilarity = useCallback((qa: string, hb: string) => {
    if (!qa || !hb) return 0;
    if (hb.includes(qa)) return 1; // substring bonus
    const d = levenshtein(qa, hb);
    const m = Math.max(qa.length, hb.length) || 1;
    return 1 - d / m; // 1 perfect, 0 worst
  }, []);

  const suggestions = useMemo((): Suggestion[] => {
    if (!productQuery) return [] as Suggestion[];
    const qTokens = applySynonyms(tokenize(productQuery));
    if (qTokens.length === 0) return [] as Suggestion[];
    return products
      .map(p => {
        const hay = `${p.name} ${p.description || ''}`;
        const hTokens = applySynonyms(tokenize(hay));
        const exactMatches = qTokens.filter(t => hTokens.includes(t)).length;
        // Fuzzy: for each query token, take best similarity against any hay token
        const sims = qTokens.map(qt => (hTokens.length ? Math.max(...hTokens.map(ht => tokenSimilarity(qt, ht))) : 0));
        const avgSim = sims.reduce((s, v) => s + v, 0) / (sims.length || 1);
        const score = avgSim + exactMatches * 0.25; // small boost for exact matches
        return { id: p.id, name: p.name, unitPrice: p.unitPrice, tvaRate: p.tvaRate, score, exactMatches } as Suggestion;
      })
      // Require at least a minimal similarity across tokens
      .filter((s: Suggestion) => s.score >= 0.5) // avg ~0.5 threshold with possible exact boost
      .sort((a: Suggestion, b: Suggestion) => b.score - a.score || b.exactMatches - a.exactMatches || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [productQuery, products, tokenize, tokenSimilarity]);

  const addProductAsItem = (sugg: { id: string; name: string; unitPrice: number; tvaRate: number }) => {
    const nextOrder = (data.items?.length || 0);
    const newItem: InvoiceItem = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description: sugg.name,
      quantity: 1,
      unitPrice: Number.isFinite(sugg.unitPrice) ? sugg.unitPrice : 0,
      tvaRate: Number.isFinite(sugg.tvaRate) ? sugg.tvaRate : 0,
      total: (1 * (Number.isFinite(sugg.unitPrice) ? sugg.unitPrice : 0)),
      order: nextOrder,
      productId: sugg.id,
    };
    const next = [...(data.items || []), newItem];
    update('items', next);
    setProductQuery('');
    setShowSuggestions(false);
  };

  const validateStep = (targetStep = step): boolean => {
    const err: Record<string, string> = {};
    if (targetStep === 1) {
      if (!data.client) err.client = 'Veuillez sélectionner un client';
      if (!data.items || data.items.length === 0) err.items = 'Veuillez ajouter au moins un article';
      const bad = (data.items || []).some(it => !String(it.description || '').trim() || it.quantity <= 0 || it.unitPrice < 0);
      if (bad) err.items = 'Veuillez compléter tous les articles correctement';
    }
    if (targetStep === 2) {
      if (!String(data.invoiceNumber || '').trim()) err.invoiceNumber = 'Le numéro de facture est requis';
      if (!data.issueDate) err.issueDate = "La date d'émission est requise";
      if (!data.dueDate) err.dueDate = "La date d'échéance est requise";
      if (data.issueDate && data.dueDate && data.dueDate < data.issueDate) {
        err.dueDate = "La date d'échéance doit être postérieure à la date d'émission";
      }
      // Recurrence validation (accept default 'MENSUEL' if not set in state yet)
      if (data.estRecurrente) {
        const freq = data.frequence || 'MENSUEL';
        if (!freq) err.frequence = 'Veuillez choisir une fréquence';
        if (!data.prochaineDateRecurrence) err.prochaineDateRecurrence = 'Veuillez choisir la prochaine date';
        if (recurrenceEndMode === 'custom' && !data.dateFinRecurrence) {
          err.dateFinRecurrence = 'Veuillez choisir la date de fin';
        }
        if (data.dateFinRecurrence && data.prochaineDateRecurrence && data.dateFinRecurrence < data.prochaineDateRecurrence) {
          err.dateFinRecurrence = 'La date de fin doit être postérieure à la prochaine date';
        }
      }
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const goNext = () => {
    if (validateStep(step)) setStep(prev => Math.min(3, prev + 1));
  };
  const goPrev = () => setStep(prev => Math.max(1, prev - 1));

  const handleFinish = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Validate all steps before submit (now 3-step wizard)
    const ok = [1, 2].every(s => validateStep(s));
    if (!ok) {
      setStep([1, 2].find(s => !validateStep(s)) || 1);
      return;
    }
    // Clear autosave on success (best effort) then submit
    try { await clearFormData?.(); } catch (err) {
      console.debug('[GuidedInvoiceWizard] clearFormData failed', err);
    }
    onSubmit(data);
  };

  return (
    <form onSubmit={handleFinish} className="max-w-3xl mx-auto space-y-6 overflow-x-hidden"
      style={{ maxWidth: '100%', overflowX: 'hidden' }}
    >
      {toastVisible && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md px-3 py-2 shadow-md border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] text-sm">
          {toastMessage}
        </div>
      )}
      {showRestoreBanner && (
        <div className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-4 py-3 text-[var(--color-text-secondary)] flex items-center justify-between">
          <div className="text-sm">
            {t.restore}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleDismissDraft}>Ignorer</Button>
            <Button size="sm" variant="primary" onClick={handleRestoreDraft}>Restaurer</Button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
          {mode === 'create' ? t.newDoc : t.editDoc}
        </h1>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
            Annuler
          </button>
        )}
      </div>

      {/* Enhanced Stepper with progress bar */}
      {useEnhanced ? (
        <WizardProgress
          currentStep={step}
          steps={[
            { number: 1, label: 'Client + Articles', icon: <FileText className="w-6 h-6" />, description: 'Sélectionnez le client et ajoutez les articles' },
            { number: 2, label: 'Détails', icon: <Info className="w-6 h-6" />, description: 'Complétez les informations' },
            { number: 3, label: 'Résumé', icon: <Package className="w-6 h-6" />, description: 'Vérifiez et confirmez' }
          ]}
          animated={useAnimations}
          variant="default"
        />
      ) : (
        <div className="rounded-xl border card-theme bg-[var(--color-bg-primary)] shadow-sm p-4">
          <div className="flex items-center justify-between gap-3">
            {["Client + Articles", "Détails", "Résumé"].map((label, idx) => {
              const num = idx + 1;
              const isActive = step === num;
              const isDone = step > num;
              const circleBase = 'w-7 h-7 min-w-[1.75rem] rounded-full flex items-center justify-center text-sm font-semibold border';
              const circleClass = isDone
                ? `${circleBase} bg-[var(--color-border-focus)] text-white border-[var(--color-border-focus)]`
                : isActive
                  ? `${circleBase} bg-[color:var(--color-border-focus)/0.1] text-[var(--color-border-focus)] border-[var(--color-border-focus)]`
                  : `${circleBase} bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] border-[var(--color-border-primary)]`;
              const labelClass = isActive
                ? 'text-[var(--color-text-primary)] font-medium'
                : 'text-[var(--color-text-secondary)]';
              return (
                <div key={label} className="flex flex-col items-center flex-1" aria-current={isActive ? 'step' : undefined} aria-label={`${num}. ${label}`}>
                  <div className={circleClass}>{num}</div>
                  <div className={`mt-2 text-xs text-center ${labelClass}`}>{label}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <div className="h-1.5 w-full rounded-full bg-[color:var(--color-border-primary)/0.35]">
              <div
                className="h-1.5 rounded-full bg-[var(--color-border-focus)] transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, Math.round(((step - 1) / 2) * 100)))}%` }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.max(0, Math.min(100, Math.round(((step - 1) / 2) * 100)))}
                aria-label={`Progression: ${Math.max(0, Math.min(100, Math.round(((step - 1) / 2) * 100)))}%`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={useAnimations ? { opacity: 0, x: 20 } : undefined}
              animate={useAnimations ? { opacity: 1, x: 0 } : undefined}
              exit={useAnimations ? { opacity: 0, x: -20 } : undefined}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 space-y-4">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Client</h2>
                {errors.client && <div className="text-sm text-error-theme mb-2">{errors.client}</div>}
                <ClientSelector
                  clients={clients}
                  selectedClient={data.client}
                  onClientSelect={(c) => update('client', c)}
                  loading={clientsLoading}
                  onCreateNew={() => setShowCreateClient(true)}
                />

                {showCreateClient && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl border">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold">Nouveau client</h3>
                        <button type="button" onClick={() => setShowCreateClient(false)} className="text-slate-500 hover:text-slate-700">✕</button>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Société</label>
                            <input className="w-full border rounded px-2 py-1" value={newClient.companyName || ''} onChange={(e) => setNewClient(prev => ({ ...prev, companyName: e.target.value }))} />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">TVA (optionnel)</label>
                            <input className="w-full border rounded px-2 py-1" value={newClient.vatNumber || ''} onChange={(e) => setNewClient(prev => ({ ...prev, vatNumber: e.target.value }))} />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Prénom</label>
                            <input className="w-full border rounded px-2 py-1" value={newClient.firstName || ''} onChange={(e) => setNewClient(prev => ({ ...prev, firstName: e.target.value }))} />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Nom</label>
                            <input className="w-full border rounded px-2 py-1" value={newClient.lastName || ''} onChange={(e) => setNewClient(prev => ({ ...prev, lastName: e.target.value }))} />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-slate-600 mb-1">Email</label>
                            <input className="w-full border rounded px-2 py-1" value={newClient.email} onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))} />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-slate-600 mb-1">Rue</label>
                            <input className="w-full border rounded px-2 py-1" value={newClient.street} onChange={(e) => setNewClient(prev => ({ ...prev, street: e.target.value }))} />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Code postal</label>
                            <input className="w-full border rounded px-2 py-1" value={newClient.postalCode} onChange={(e) => setNewClient(prev => ({ ...prev, postalCode: e.target.value }))} />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Ville</label>
                            <input className="w-full border rounded px-2 py-1" value={newClient.city} onChange={(e) => setNewClient(prev => ({ ...prev, city: e.target.value }))} />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-slate-600 mb-1">Pays</label>
                            <input className="w-full border rounded px-2 py-1" value={newClient.country} onChange={(e) => setNewClient(prev => ({ ...prev, country: e.target.value }))} />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <Button type="button" variant="secondary" onClick={() => setShowCreateClient(false)}>Annuler</Button>
                          <Button type="button" variant="primary" isLoading={createClientLoading} onClick={async () => {
                            setCreateClientLoading(true);
                            try {
                              type CreateClientPayload = Parameters<typeof api.createClient>[0];
                              const created = await api.createClient({
                                companyName: newClient.companyName || undefined,
                                firstName: newClient.firstName || undefined,
                                lastName: newClient.lastName || undefined,
                                email: newClient.email,
                                address: {
                                  street: newClient.street,
                                  city: newClient.city,
                                  postalCode: newClient.postalCode,
                                  country: newClient.country || 'CH',
                                },
                                vatNumber: newClient.vatNumber || undefined,
                                language: 'fr',
                                paymentTerms: 30,
                                isActive: true,
                              } as CreateClientPayload);
                              // Map API client to form Client type
                              type CreatedClient = { id: string; companyName?: string; firstName?: string; lastName?: string; email?: string; vatNumber?: string; address?: { street?: string; city?: string; postalCode?: string; country?: string }; street?: string; city?: string; postalCode?: string; country?: string };
                              const c = created as CreatedClient;
                              const mapped: Client = {
                                id: c.id,
                                companyName: c.companyName,
                                firstName: c.firstName,
                                lastName: c.lastName,
                                email: c.email || '',
                                address: {
                                  street: c.address?.street || c.street || '',
                                  city: c.address?.city || c.city || '',
                                  postalCode: c.address?.postalCode || c.postalCode || '',
                                  country: c.address?.country || c.country || 'CH',
                                },
                                vatNumber: c.vatNumber,
                              };
                              update('client', mapped);
                              setShowCreateClient(false);
                              setNewClient({ email: '', street: '', city: '', postalCode: '', country: 'CH' });
                              showToast('Client créé');
                            } catch {
                              showToast("Erreur lors de la création du client");
                            } finally {
                              setCreateClientLoading(false);
                            }
                          }}>Enregistrer</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Articles (fused into Step 1) */}
                <div className="mt-6 h-px bg-[var(--color-border-primary)]" />
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Articles</h2>
                {errors.items && <div className="text-sm text-error-theme mb-2">{errors.items}</div>}
                {/* Product search / autocomplete */}
                {useSmartSearch ? (
                  <EnhancedProductSearch
                    value={productQuery}
                    onChange={setProductQuery}
                    suggestions={suggestions}
                    onSelectProduct={addProductAsItem}
                    currency={data.currency}
                    placeholder="Rechercher un produit ou service..."
                    autoFocus={false}
                  />
                ) : (
                  <div className="relative">
                    <input
                      value={productQuery}
                      onChange={(e) => { setProductQuery(e.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (suggestions.length > 0) addProductAsItem(suggestions[0]);
                        }
                        if (e.key === 'Escape') {
                          setShowSuggestions(false);
                        }
                      }}
                      placeholder="Rechercher produit (ex: carne picada)"
                      className="w-full px-3 py-2 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-transparent"
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] shadow-lg">
                        {suggestions.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => addProductAsItem(s)}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--color-bg-secondary)] text-left"
                          >
                            <span className="text-sm">{s.name}</span>
                            <span className="text-xs text-[var(--color-text-tertiary)]">
                              {new Intl.NumberFormat('fr-CH', { style: 'currency', currency: data.currency }).format(s.unitPrice)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <InvoiceItemsTable
                  items={data.items}
                  onItemsChange={(items) => update('items', items)}
                  currency={data.currency}
                  readOnly={lockItems}
                />
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={useAnimations ? { opacity: 0, x: 20 } : undefined}
              animate={useAnimations ? { opacity: 1, x: 0 } : undefined}
              exit={useAnimations ? { opacity: 0, x: -20 } : undefined}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 space-y-4">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Détails</h2>
                <EnhancedInvoiceDetails
                  data={{
                    invoiceNumber: data.invoiceNumber,
                    language: data.language,
                    issueDate: data.issueDate,
                    dueDate: data.dueDate,
                    currency: data.currency,
                  }}
                  onChange={update}
                  errors={errors}
                />
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Notes (optionnel)</label>
                    <textarea
                      value={data.notes}
                      onChange={(e) => update('notes', e.target.value)}
                      rows={3}
                      placeholder="Notes internes..."
                      className="w-full px-3 py-2 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Conditions (optionnel)</label>
                    <textarea
                      value={data.terms}
                      onChange={(e) => update('terms', e.target.value)}
                      rows={3}
                      placeholder="Conditions de paiement..."
                      className="w-full px-3 py-2 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-transparent"
                    />
                  </div>
                  {/* Global Discount */}
                  <div className="pt-2 border-t border-[var(--color-border-primary)]">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(data.globalDiscountValue && data.globalDiscountValue > 0)}
                        onChange={(e) => {
                          console.log('[GuidedInvoiceWizard] Global discount checkbox:', e.target.checked);
                          if (e.target.checked) {
                            update('globalDiscountValue', DEFAULT_DISCOUNT_VALUE);
                            update('globalDiscountType', DEFAULT_DISCOUNT_TYPE);
                          } else {
                            update('globalDiscountValue', undefined);
                            update('globalDiscountType', undefined);
                            update('globalDiscountNote', undefined);
                          }
                        }}
                      />
                      <span className="font-medium text-[var(--color-text-primary)]">💰 Appliquer un rabais global</span>
                    </label>
                    {data.globalDiscountValue !== undefined && (
                      <div className="mt-3 p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Valeur</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={data.globalDiscountValue === 0 ? '' : (data.globalDiscountValue || '')}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                const finalVal = isNaN(val) ? 0 : val;
                                console.log('[GuidedInvoiceWizard] Global discount value changed:', {
                                  oldValue: data.globalDiscountValue,
                                  newValue: finalVal,
                                  rawInput: e.target.value
                                });
                                update('globalDiscountValue', finalVal);
                              }}
                              placeholder="0,00"
                              className="w-full px-3 py-2 rounded-md border border-orange-300 bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Type</label>
                            <select
                              value={data.globalDiscountType || 'PERCENT'}
                              onChange={(e) => update('globalDiscountType', e.target.value as 'PERCENT' | 'AMOUNT')}
                              className="w-full px-3 py-2 rounded-md border border-orange-300 bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                              <option value="PERCENT">% Pourcentage</option>
                              <option value="AMOUNT">{data.currency} Montant</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Note (optionnel)</label>
                          <input
                            type="text"
                            value={data.globalDiscountNote || ''}
                            onChange={(e) => update('globalDiscountNote', e.target.value)}
                            placeholder="Raison du rabais..."
                            className="w-full px-3 py-2 rounded-md border border-orange-300 bg-white text-[var(--color-text-secondary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        {data.globalDiscountValue > 0 && totals.subtotal > 0 && (
                          <div className="p-3 bg-white rounded border border-orange-300 text-sm">
                            <div className="text-xs text-[var(--color-text-tertiary)] mb-2">Aperçu du rabais global :</div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-[var(--color-text-secondary)]">Sous-total des lignes :</span>
                                <span className="font-medium">{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: data.currency }).format(totals.subtotal)}</span>
                              </div>
                              <div className="flex justify-between text-orange-600">
                                <span>Rabais global :</span>
                                <span className="font-medium">-{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: data.currency }).format(totals.globalDiscount)}</span>
                              </div>
                              <div className="flex justify-between font-semibold text-green-700 border-t border-orange-200 pt-1">
                                <span>Sous-total après rabais :</span>
                                <span>{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: data.currency }).format(totals.subtotalAfterGlobal)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          Le rabais global s'applique sur le sous-total après les rabais de lignes individuelles.
                        </p>
                      </div>
                    )}
                  </div>
                  {documentType !== 'quote' && (
                    <div className="pt-2 border-t border-[var(--color-border-primary)]">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(data.estRecurrente)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            update('estRecurrente', checked);
                            if (checked) {
                              if (!data.frequence) update('frequence', 'MENSUEL');
                              if (!data.prochaineDateRecurrence) {
                                const fallback = data.dueDate || data.issueDate || new Date().toISOString().split('T')[0];
                                update('prochaineDateRecurrence', fallback);
                              }
                              setRecurrenceEndMode(prev => (prev === 'none' ? '12' : prev));
                            }
                          }}
                        />
                        <span className="font-medium text-[var(--color-text-primary)]">Facture récurrente</span>
                      </label>
                      {data.estRecurrente && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Fréquence</label>
                            <select
                              className="w-full border rounded px-2 py-2 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                              value={data.frequence || 'MENSUEL'}
                              onChange={(e) => update('frequence', e.target.value as InvoiceFormData['frequence'])}
                            >
                              <option value="MENSUEL">Mensuelle</option>
                              <option value="TRIMESTRIEL">Trimestrielle</option>
                              <option value="SEMESTRIEL">Semestrielle</option>
                            </select>
                            {errors.frequence && <div className="text-xs text-error-theme mt-1">{errors.frequence}</div>}
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Base de calcul</label>
                            <select
                              className="w-full border rounded px-2 py-2 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                              value={recurrenceBase}
                              onChange={async (e) => {
                                const val = (e.target.value as 'issue' | 'due');
                                setRecurrenceBase(val);
                                try {
                                  await api.updateProfile({ recurrenceBasePreference: val });
                                } catch { /* ignore profile update errors */ }
                              }}
                              title="Choisir la base pour calculer la prochaine date"
                            >
                              <option value="issue">Date d'émission</option>
                              <option value="due">Date d'échéance</option>
                            </select>
                            <div className="text-[10px] text-[var(--color-text-tertiary)] mt-1">
                              Conseillé: Date d'émission pour garder le même jour chaque mois.
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Prochaine date</label>
                            {autoNextDate ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="date"
                                  className="w-full border rounded px-2 py-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                                  value={data.prochaineDateRecurrence || ''}
                                  readOnly
                                />
                                <button
                                  type="button"
                                  className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                                  onClick={() => setAutoNextDate(false)}
                                  title="Définir manuellement"
                                >
                                  Modifier
                                </button>
                              </div>
                            ) : (
                              <input
                                type="date"
                                className="w-full border rounded px-2 py-2 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                                value={data.prochaineDateRecurrence || ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  update('prochaineDateRecurrence', v)
                                  if (v && (recurrenceEndMode === '12' || recurrenceEndMode === '24')) {
                                    const months = recurrenceEndMode === '12' ? 11 : 23;
                                    const end = addMonthsSameDay(v, months);
                                    update('dateFinRecurrence', end);
                                  }
                                }}
                              />
                            )}
                            {errors.prochaineDateRecurrence && <div className="text-xs text-error-theme mt-1">{errors.prochaineDateRecurrence}</div>}
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Durée / Fin</label>
                            <div className="flex flex-col gap-2 text-sm">
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="rec-end"
                                  checked={recurrenceEndMode === '12'}
                                  onChange={() => {
                                    setRecurrenceEndMode('12');
                                    if (data.prochaineDateRecurrence) {
                                      update('dateFinRecurrence', addMonths(data.prochaineDateRecurrence, 11));
                                    }
                                  }}
                                />
                                <span>12 mois</span>
                              </label>
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="rec-end"
                                  checked={recurrenceEndMode === '24'}
                                  onChange={() => {
                                    setRecurrenceEndMode('24');
                                    if (data.prochaineDateRecurrence) {
                                      update('dateFinRecurrence', addMonths(data.prochaineDateRecurrence, 23));
                                    }
                                  }}
                                />
                                <span>24 mois</span>
                              </label>
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="rec-end"
                                  checked={recurrenceEndMode === 'custom'}
                                  onChange={() => setRecurrenceEndMode('custom')}
                                />
                                <span>Date personnalisée</span>
                              </label>
                              {recurrenceEndMode === 'custom' && (
                                <input
                                  type="date"
                                  className="w-full border rounded px-2 py-2 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                                  value={data.dateFinRecurrence || ''}
                                  onChange={(e) => update('dateFinRecurrence', e.target.value)}
                                />
                              )}
                              {errors.dateFinRecurrence && <div className="text-xs text-error-theme mt-1">{errors.dateFinRecurrence}</div>}
                              <button
                                type="button"
                                className="self-start text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                                onClick={() => { setRecurrenceEndMode('none'); update('dateFinRecurrence', ''); }}
                                title="Sans fin (optionnel)"
                              >
                                Sans fin
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={useAnimations ? { opacity: 0, x: 20 } : undefined}
              animate={useAnimations ? { opacity: 1, x: 0 } : undefined}
              exit={useAnimations ? { opacity: 0, x: -20 } : undefined}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 space-y-4">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Résumé</h2>
                <div className="space-y-4">
                  {/* Client */}
                  <div className="rounded-md border p-3 text-sm">
                    <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Client</div>
                    <div className="font-medium text-[var(--color-text-primary)]">
                      {data.client?.companyName || `${data.client?.firstName || ''} ${data.client?.lastName || ''}`.trim() || '—'}
                    </div>
                    <div className="text-[var(--color-text-secondary)]">
                      {data.client?.address?.street || ''}
                      {data.client?.address?.postalCode || data.client?.address?.city ? (
                        <>
                          <br />{`${data.client?.address?.postalCode || ''} ${data.client?.address?.city || ''}`.trim()}
                        </>
                      ) : null}
                      {data.client?.address?.country ? (<><br />{data.client?.address?.country}</>) : null}
                    </div>
                  </div>
                  {/* Invoice info */}
                  <div className="rounded-md border p-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">Numéro</div>
                      <div className="font-semibold">{data.invoiceNumber || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">Devise</div>
                      <div className="font-semibold">{data.currency}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">Date d'émission</div>
                      <div className="font-semibold">{data.issueDate || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">Échéance</div>
                      <div className="font-semibold">{data.dueDate || '—'}</div>
                    </div>
                  </div>
                  {/* Items */}
                  <div className="overflow-x-auto rounded-md border">
                    <table className="min-w-full text-sm">
                      <thead className="bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                        <tr>
                          <th className="px-3 py-2 text-left">Description</th>
                          <th className="px-3 py-2 text-right">Qté</th>
                          <th className="px-3 py-2 text-right">Prix</th>
                          <th className="px-3 py-2 text-right">TVA</th>
                          <th className="px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((it) => {
                          const itemSubtotalBefore = it.quantity * it.unitPrice;
                          let lineDiscount = 0;
                          if (it.lineDiscountValue && it.lineDiscountValue > 0) {
                            if (it.lineDiscountType === 'PERCENT') {
                              lineDiscount = itemSubtotalBefore * (it.lineDiscountValue / 100);
                            } else {
                              lineDiscount = Math.min(it.lineDiscountValue, itemSubtotalBefore);
                            }
                          }
                          const itemSubtotalAfter = itemSubtotalBefore - lineDiscount;
                          
                          return (
                            <tr key={it.id} className="border-t border-[var(--color-border-primary)]">
                              <td className="px-3 py-2">
                                <div>{it.description}</div>
                                {it.lineDiscountValue && it.lineDiscountValue > 0 && (
                                  <div className="text-xs text-red-600 mt-1">
                                    💰 Rabais: -{it.lineDiscountValue}{it.lineDiscountType === 'PERCENT' ? '%' : ` ${data.currency}`}
                                    {lineDiscount > 0 && ` (-${lineDiscount.toFixed(2)} ${data.currency})`}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">{it.quantity}</td>
                              <td className="px-3 py-2 text-right">{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: data.currency }).format(it.unitPrice)}</td>
                              <td className="px-3 py-2 text-right">{it.tvaRate}%</td>
                              <td className="px-3 py-2 text-right">{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: data.currency }).format(itemSubtotalAfter)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Totals */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">Articles</span><span className="font-medium">{data.items.length}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">Sous-total</span><span className="font-medium">{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: data.currency }).format(totals.subtotal)}</span></div>
                    {totals.globalDiscount > 0 && (
                      <>
                        <div className="flex justify-between text-orange-600">
                          <span className="flex items-center gap-1">
                            <span>💰</span>
                            <span>Rabais global</span>
                            {data.globalDiscountValue && (
                              <span className="text-xs">({data.globalDiscountValue}{data.globalDiscountType === 'PERCENT' ? '%' : ' CHF'})</span>
                            )}
                          </span>
                          <span className="font-medium">-{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: data.currency }).format(totals.globalDiscount)}</span>
                        </div>
                        {data.globalDiscountNote && (
                          <div className="text-xs text-[var(--color-text-tertiary)] italic ml-6">
                            {data.globalDiscountNote}
                          </div>
                        )}
                        <div className="flex justify-between font-semibold text-green-700">
                          <span>Sous-total après rabais</span>
                          <span>{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: data.currency }).format(totals.subtotalAfterGlobal)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">TVA</span><span className="font-medium">{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: data.currency }).format(totals.totalTva)}</span></div>
                    <div className="border-t border-[var(--color-border-primary)] pt-3 flex justify-between text-lg font-bold"><span>Total</span><span>{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: data.currency }).format(totals.total)}</span></div>
                  </div>
                  {/* Notes & Terms */}
                  {Boolean(data.notes?.trim()) && (
                    <div className="rounded-md border p-3 text-sm">
                      <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Notes</div>
                      <div className="whitespace-pre-wrap text-[var(--color-text-secondary)]">{data.notes}</div>
                    </div>
                  )}
                  {Boolean(data.terms?.trim()) && (
                    <div className="rounded-md border p-3 text-sm">
                      <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Conditions</div>
                      <div className="whitespace-pre-wrap text-[var(--color-text-secondary)]">{data.terms}</div>
                    </div>
                  )}
                  {onPreview && (
                    <div>
                      <Button type="button" variant="secondary" onClick={() => onPreview(data)}>
                        Aperçu
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 left-0 right-0 py-3 bg-[color:var(--color-bg-primary)/0.85] backdrop-blur border-t card-theme">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 px-2">
          <div>
            {step > 1 ? (
              <Button type="button" variant="secondary" onClick={goPrev}>
                Précédent
              </Button>
            ) : (
              <span />
            )}
          </div>
          <div className="flex items-center gap-2">
            {step < 3 && (
              <Button type="button" variant="primary" onClick={goNext}>
                Suivant
              </Button>
            )}
            {step === 3 && (
              <Button type="submit" variant="primary" isLoading={loading}>
                {mode === 'create' ? t.finish : 'Enregistrer'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};