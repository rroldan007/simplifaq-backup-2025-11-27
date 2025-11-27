import React, { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

type Plan = {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  price: number;
  currency: string;
  isActive: boolean;
  maxInvoicesPerMonth: number;
  maxClientsTotal: number;
  maxProductsTotal: number;
  hasEmailSupport: boolean;
  hasPrioritySupport: boolean;
  hasAdvancedReports: boolean;
  hasApiAccess: boolean;
  hasCustomBranding: boolean;
  storageLimit: number;
  hasSwissQRBill: boolean;
  hasMultiCurrency: boolean;
  hasMultiLanguage: boolean;
  entitlements?: Array<{
    id: string;
    features?: Record<string, unknown>;
    limits?: Record<string, unknown>;
    stripePriceId?: string;
    isActive: boolean;
  }>;
};

export const SubscriptionsPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [modules, setModules] = useState<{ expenses: boolean }>({ expenses: false });
  const [form, setForm] = useState<Partial<Plan>>({
    name: '',
    displayName: '',
    description: '',
    price: 0,
    currency: 'CHF',
    isActive: true,
    maxInvoicesPerMonth: 10,
    maxClientsTotal: 50,
    maxProductsTotal: 20,
    hasEmailSupport: false,
    hasPrioritySupport: false,
    hasAdvancedReports: false,
    hasApiAccess: false,
    hasCustomBranding: false,
    storageLimit: 100,
    hasSwissQRBill: true,
    hasMultiCurrency: false,
    hasMultiLanguage: false,
  });

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const resp = await adminApi.getPlans();
      if (!resp.success) throw new Error(resp.error?.message || 'Erreur lors du chargement des plans');
      setPlans((resp.data as unknown as Plan[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: '',
      displayName: '',
      description: '',
      price: 0,
      currency: 'CHF',
      isActive: true,
      maxInvoicesPerMonth: 10,
      maxClientsTotal: 50,
      maxProductsTotal: 20,
      hasEmailSupport: false,
      hasPrioritySupport: false,
      hasAdvancedReports: false,
      hasApiAccess: false,
      hasCustomBranding: false,
      storageLimit: 100,
      hasSwissQRBill: true,
      hasMultiCurrency: false,
      hasMultiLanguage: false,
    });
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (p: Plan) => {
    setEditing(p);
    setForm({ ...p });
    // derive modules from entitlements
    const hasExpenses = !!p.entitlements?.some((e) => {
      const features = (e.features || {}) as Record<string, unknown>;
      return (features.module as string) === 'expenses' && e.isActive !== false;
    });
    setModules({ expenses: hasExpenses });
    setShowModal(true);
  };

  const savePlan = async () => {
    try {
      setError(null);
      if (!form.name || !form.displayName) {
        setError('Nom et nom affiché sont requis');
        return;
      }
      const payload: Record<string, unknown> = {
        name: form.name,
        displayName: form.displayName,
        description: form.description,
        price: form.price,
        currency: form.currency,
        isActive: form.isActive,
        maxInvoicesPerMonth: form.maxInvoicesPerMonth,
        maxClientsTotal: form.maxClientsTotal,
        maxProductsTotal: form.maxProductsTotal,
        hasEmailSupport: form.hasEmailSupport,
        hasPrioritySupport: form.hasPrioritySupport,
        hasAdvancedReports: form.hasAdvancedReports,
        hasApiAccess: form.hasApiAccess,
        hasCustomBranding: form.hasCustomBranding,
        storageLimit: form.storageLimit,
        hasSwissQRBill: form.hasSwissQRBill,
        hasMultiCurrency: form.hasMultiCurrency,
        hasMultiLanguage: form.hasMultiLanguage,
      };

      // Build entitlements for modules that are not booleans in Plan (e.g., Expenses)
      let entitlements = editing?.entitlements ? [...editing.entitlements] : [];
      // remove existing expenses entry
      entitlements = entitlements.filter((e) => {
        const features = (e.features || {}) as Record<string, unknown>;
        return (features.module as string) !== 'expenses';
      });
      if (modules.expenses) {
        entitlements.push({
          // id will be created by backend on createMany
          features: { module: 'expenses' },
          limits: {},
          isActive: true,
        } as any);
      }
      // Only send entitlements field if we're editing or if we toggled expenses during create
      if (editing || modules.expenses) {
        (payload as any).entitlements = entitlements.map((e) => ({
          features: e.features ?? {},
          limits: e.limits ?? {},
          stripePriceId: e.stripePriceId,
          isActive: e.isActive !== false,
        }));
      }
      if (editing) {
        await adminApi.updatePlan(editing.id, payload);
      } else {
        await adminApi.createPlan(payload);
      }
      setShowModal(false);
      await fetchPlans();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement');
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('Supprimer ce plan ?')) return;
    try {
      await adminApi.deletePlan(id);
      await fetchPlans();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Plans & Modules</h1>
        <Button onClick={openCreate}>Nouveau plan</Button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border-primary)]">
            <thead className="surface-elevated">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Prix</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Limites</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Modules</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-primary)]">
              {loading ? (
                <tr><td className="px-6 py-4" colSpan={6}>Chargement...</td></tr>
              ) : plans.length === 0 ? (
                <tr><td className="px-6 py-4" colSpan={6}>Aucun plan</td></tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--color-bg-secondary)]">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-primary">{p.displayName}</div>
                      <div className="text-xs text-secondary">{p.name}</div>
                      {p.description && <div className="text-xs text-secondary mt-1">{p.description}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm">{p.price} {p.currency}/mois</td>
                    <td className="px-6 py-4 text-xs text-secondary">
                      <div>Factures/mois: {p.maxInvoicesPerMonth}</div>
                      <div>Clients: {p.maxClientsTotal}</div>
                      <div>Produits: {p.maxProductsTotal}</div>
                      <div>Stockage: {p.storageLimit} MB</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="space-y-1 text-secondary">
                        <div>Charges/Expenses: {p.entitlements?.some((e) => (e.features as any)?.module === 'expenses' && e.isActive !== false) ? 'Oui' : 'Non'}</div>
                        <div>Swiss QR Bill: {p.hasSwissQRBill ? 'Oui' : 'Non'}</div>
                        <div>Multi-devise: {p.hasMultiCurrency ? 'Oui' : 'Non'}</div>
                        <div>Multi-langue: {p.hasMultiLanguage ? 'Oui' : 'Non'}</div>
                        <div>API: {p.hasApiAccess ? 'Oui' : 'Non'}</div>
                        <div>Rapports avancés: {p.hasAdvancedReports ? 'Oui' : 'Non'}</div>
                        <div>Marque personnalisée: {p.hasCustomBranding ? 'Oui' : 'Non'}</div>
                        <div>Support email: {p.hasEmailSupport ? 'Oui' : 'Non'}</div>
                        <div>Support prioritaire: {p.hasPrioritySupport ? 'Oui' : 'Non'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {p.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <button className="text-blue-600" onClick={() => openEdit(p)}>Éditer</button>
                      <button className="text-red-600" onClick={() => deletePlan(p.id)}>Supprimer</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Modifier le plan' : 'Nouveau plan'}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm text-primary space-y-1">
                <span>Nom (unique)</span>
                <Input placeholder="Nom (unique)" value={form.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label className="text-sm text-primary space-y-1">
                <span>Nom affiché</span>
                <Input placeholder="Nom affiché" value={form.displayName || ''} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
              </label>
              <label className="text-sm text-primary space-y-1 md:col-span-2">
                <span>Description</span>
                <Input placeholder="Description" value={form.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </label>
              <label className="text-sm text-primary space-y-1">
                <span>Prix</span>
                <Input type="number" placeholder="Prix (CHF)" value={form.price ?? 0} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
              </label>
              <label className="text-sm text-primary space-y-1">
                <span>Devise</span>
                <Input placeholder="Devise" value={form.currency || 'CHF'} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" checked={!!form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                <span>Actif</span>
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="text-sm text-primary space-y-1">
                <span>Factures/mois</span>
                <Input type="number" placeholder="Factures/mois" value={form.maxInvoicesPerMonth ?? 0} onChange={(e) => setForm((f) => ({ ...f, maxInvoicesPerMonth: Number(e.target.value) }))} />
              </label>
              <label className="text-sm text-primary space-y-1">
                <span>Clients max</span>
                <Input type="number" placeholder="Clients max" value={form.maxClientsTotal ?? 0} onChange={(e) => setForm((f) => ({ ...f, maxClientsTotal: Number(e.target.value) }))} />
              </label>
              <label className="text-sm text-primary space-y-1">
                <span>Produits max</span>
                <Input type="number" placeholder="Produits max" value={form.maxProductsTotal ?? 0} onChange={(e) => setForm((f) => ({ ...f, maxProductsTotal: Number(e.target.value) }))} />
              </label>
              <label className="text-sm text-primary space-y-1">
                <span>Stockage (MB)</span>
                <Input type="number" placeholder="Stockage (MB)" value={form.storageLimit ?? 0} onChange={(e) => setForm((f) => ({ ...f, storageLimit: Number(e.target.value) }))} />
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <label className="flex items-center space-x-2"><input type="checkbox" checked={modules.expenses} onChange={(e) => setModules((m) => ({ ...m, expenses: e.target.checked }))} /><span>Charges / Expenses</span></label>
              <label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.hasSwissQRBill} onChange={(e) => setForm((f) => ({ ...f, hasSwissQRBill: e.target.checked }))} /><span>Swiss QR Bill</span></label>
              <label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.hasMultiCurrency} onChange={(e) => setForm((f) => ({ ...f, hasMultiCurrency: e.target.checked }))} /><span>Multi-devise</span></label>
              <label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.hasMultiLanguage} onChange={(e) => setForm((f) => ({ ...f, hasMultiLanguage: e.target.checked }))} /><span>Multi-langue</span></label>
              <label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.hasApiAccess} onChange={(e) => setForm((f) => ({ ...f, hasApiAccess: e.target.checked }))} /><span>API</span></label>
              <label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.hasAdvancedReports} onChange={(e) => setForm((f) => ({ ...f, hasAdvancedReports: e.target.checked }))} /><span>Rapports avancés</span></label>
              <label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.hasCustomBranding} onChange={(e) => setForm((f) => ({ ...f, hasCustomBranding: e.target.checked }))} /><span>Marque personnalisée</span></label>
              <label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.hasEmailSupport} onChange={(e) => setForm((f) => ({ ...f, hasEmailSupport: e.target.checked }))} /><span>Support email</span></label>
              <label className="flex items-center space-x-2"><input type="checkbox" checked={!!form.hasPrioritySupport} onChange={(e) => setForm((f) => ({ ...f, hasPrioritySupport: e.target.checked }))} /><span>Support prioritaire</span></label>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
              <Button onClick={savePlan}>{editing ? 'Mettre à jour' : 'Créer'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};