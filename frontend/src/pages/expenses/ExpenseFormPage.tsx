import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { expensesApi, type Account, type Expense, type Currency } from '../../services/expensesApi';
import { ArrowLeft, Save, X, Receipt, Calendar, DollarSign, FileText, Tag, User, Calculator, TrendingDown, Upload, Camera, FileImage, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

const ExpenseFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // États pour l'analyse de facture
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<{
    accountId: string;
    date: string;
    label: string;
    amount: string;
    currency: Currency;
    tvaRate?: string;
    supplier?: string;
    notes?: string;
  }>({
    accountId: '',
    date: new Date().toISOString().slice(0, 10),
    label: '',
    amount: '',
    currency: 'CHF',
    tvaRate: '',
    supplier: '',
    notes: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const accs = await expensesApi.listAccounts();
        setAccounts(accs);
        if (isEdit && id) {
          const list = await expensesApi.listExpenses({});
          const found = list.find(x => x.id === id);
          if (found) {
            setForm({
              accountId: found.accountId,
              date: new Date(found.date).toISOString().slice(0, 10),
              label: found.label,
              amount: String(found.amount),
              currency: found.currency,
              tvaRate: found.tvaRate != null ? String(found.tvaRate) : '',
              supplier: found.supplier || '',
              notes: found.notes || '',
            });
          }
        }
      } catch (e: any) {
        setError(e?.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit]);

  const canSave = useMemo(() => {
    return form.accountId && form.date && form.label && form.amount && !isNaN(Number(form.amount));
  }, [form]);

  // Calculate TVA déductible in real-time
  const tvaCalculations = useMemo(() => {
    const amount = parseFloat(form.amount || '0') || 0;
    const rate = parseFloat(form.tvaRate || '0') || 0;
    
    if (amount > 0 && rate > 0) {
      const tvaDeductible = amount * (rate / (100 + rate));
      const montantHT = amount - tvaDeductible;
      return { tvaDeductible, montantHT, hasTva: true };
    }
    
    return { tvaDeductible: 0, montantHT: amount, hasTva: false };
  }, [form.amount, form.tvaRate]);

  const formatAmount = (n: number) => new Intl.NumberFormat('fr-CH', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(n);

  const handleFileUpload = async (file: File) => {
    try {
      setAnalyzing(true);
      setError(null);
      setUploadedFile(file);
      
      const result = await expensesApi.analyzeReceipt(file);
      setAnalysisResult(result);
      
      // Remplir automatiquement le formulaire avec les données extraites
      const extracted = result.extractedData;
      setForm({
        accountId: extracted.accountId,
        date: new Date(extracted.date).toISOString().slice(0, 10),
        label: extracted.label,
        amount: String(extracted.amount),
        currency: (extracted.currency as Currency) || 'CHF',
        tvaRate: extracted.tvaRate ? String(extracted.tvaRate) : '',
        supplier: extracted.supplier || '',
        notes: extracted.notes || '',
      });
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'analyse de la facture');
      setAnalysisResult(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    try {
      setSaving(true);
      if (isEdit && id) {
        await expensesApi.updateExpense(id, {
          accountId: form.accountId,
          date: form.date,
          label: form.label,
          amount: Number(form.amount),
          currency: form.currency,
          tvaRate: form.tvaRate ? Number(form.tvaRate) : undefined,
          supplier: form.supplier || undefined,
          notes: form.notes || undefined,
        });
      } else {
        await expensesApi.createExpense({
          accountId: form.accountId,
          date: form.date,
          label: form.label,
          amount: Number(form.amount),
          currency: form.currency,
          tvaRate: form.tvaRate ? Number(form.tvaRate) : undefined,
          supplier: form.supplier || undefined,
          notes: form.notes || undefined,
          id: '' as any, // will be ignored by API typing
        } as any);
      }
      navigate('/expenses');
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/expenses')}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux charges
        </button>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <Receipt className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Modifier charge' : 'Nouvelle charge'}</h1>
            <p className="text-sm text-slate-500">Enregistrez vos dépenses professionnelles</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Upload et Analyse de Facture - Nouveau bloc */}
      {!isEdit && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 p-6 mb-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-purple-900">Analyse Intelligente de Facture</h3>
              <p className="text-sm text-purple-700">Scannez votre facture, l'IA extrait automatiquement les informations</p>
            </div>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-200
              ${analyzing 
                ? 'border-purple-400 bg-purple-100' 
                : 'border-purple-300 bg-white hover:bg-purple-50 hover:border-purple-400'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={analyzing}
            />

            {analyzing ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
                </div>
                <p className="text-purple-700 font-medium">Analyse en cours...</p>
                <p className="text-sm text-purple-600">L'assistant ADM extrait les données de votre facture</p>
              </div>
            ) : uploadedFile ? (
              <div className="space-y-4">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                <div>
                  <p className="text-green-700 font-medium">Facture analysée avec succès !</p>
                  <p className="text-sm text-green-600 mt-1">{uploadedFile.name}</p>
                </div>
                {analysisResult && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200 text-left">
                    <p className="text-sm text-green-800 mb-2">
                      <strong>Résumé:</strong> {analysisResult.summary}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <span className="font-medium">Confiance:</span>
                      <div className="flex-1 bg-green-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${(analysisResult.confidence || 0) * 100}%` }}
                        ></div>
                      </div>
                      <span>{Math.round((analysisResult.confidence || 0) * 100)}%</span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedFile(null);
                    setAnalysisResult(null);
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 underline"
                >
                  Scanner une autre facture
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-purple-100 rounded-full">
                    <Upload className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-medium text-purple-900 mb-1">
                    Glissez-déposez votre facture ici
                  </p>
                  <p className="text-sm text-purple-600">
                    ou cliquez pour sélectionner un fichier
                  </p>
                </div>
                <div className="flex items-center justify-center gap-6 text-sm text-purple-600">
                  <div className="flex items-center gap-2">
                    <FileImage className="w-4 h-4" />
                    <span>PNG, JPG, WEBP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>PDF</span>
                  </div>
                </div>
                <p className="text-xs text-purple-500">
                  Format max: 10 MB • Powered by Assistant ADM
                </p>
              </div>
            )}
          </div>

          {analysisResult && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>✨ Info:</strong> Les données ont été automatiquement remplies dans le formulaire ci-dessous. 
                Vérifiez-les et modifiez si nécessaire avant d'enregistrer.
              </p>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <div className="text-slate-500">Chargement…</div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Compte */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700">Compte comptable</h3>
            </div>
            <select 
              value={form.accountId} 
              onChange={e => setForm({ ...form, accountId: e.target.value })} 
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
              required
            >
              <option value="">Sélectionner un compte…</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-2">Sélectionnez le compte comptable pour cette charge</p>
          </div>

          {/* Date et Montant */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700">Informations financières</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Date
                </label>
                <input 
                  type="date" 
                  value={form.date} 
                  onChange={e => setForm({ ...form, date: e.target.value })} 
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Montant (TTC)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={form.amount} 
                  onChange={e => setForm({ ...form, amount: e.target.value })} 
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                  placeholder="0.00"
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Devise</label>
                <select 
                  value={form.currency} 
                  onChange={e => setForm({ ...form, currency: e.target.value as Currency })} 
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="CHF">CHF</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Détails */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700">Détails de la charge</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Libellé *</label>
                <input 
                  type="text" 
                  value={form.label} 
                  onChange={e => setForm({ ...form, label: e.target.value })} 
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                  placeholder="Description de la charge"
                  required 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">TVA (%)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={form.tvaRate} 
                    onChange={e => setForm({ ...form, tvaRate: e.target.value })} 
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                    placeholder="Ex: 8.1" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    <User className="w-3 h-3 inline mr-1" />
                    Fournisseur
                  </label>
                  <input 
                    type="text" 
                    value={form.supplier} 
                    onChange={e => setForm({ ...form, supplier: e.target.value })} 
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                    placeholder="Nom du fournisseur"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Notes</label>
                <textarea 
                  value={form.notes} 
                  onChange={e => setForm({ ...form, notes: e.target.value })} 
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                  rows={4}
                  placeholder="Notes internes (optionnel)"
                />
              </div>
            </div>
          </div>

          {/* TVA Calculation Summary */}
          {tvaCalculations.hasTva && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-blue-900">Calcul TVA Automatique</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">Montant TTC</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900">
                    {formatAmount(parseFloat(form.amount) || 0)} {form.currency}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">TVA Déductible ({form.tvaRate}%)</span>
                  </div>
                  <span className="text-lg font-bold text-orange-900">
                    {formatAmount(tvaCalculations.tvaDeductible)} {form.currency}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Montant HT</span>
                  </div>
                  <span className="text-lg font-bold text-green-900">
                    {formatAmount(tvaCalculations.montantHT)} {form.currency}
                  </span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> La TVA déductible sera automatiquement enregistrée dans le compte 1170 (Impôt préalable) et pourra être récupérée lors de votre déclaration TVA trimestrielle.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button 
              type="submit" 
              disabled={!canSave || saving} 
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Créer la charge')}
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/expenses')} 
              className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ExpenseFormPage;
