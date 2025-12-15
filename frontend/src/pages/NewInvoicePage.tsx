import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GuidedInvoiceWizard, type InvoiceFormData } from '../components/invoices/GuidedInvoiceWizard';
import { useInvoices } from '../hooks/useInvoices';
import { NotificationContainer } from '../components/ui/Notification';

export default function NewInvoicePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { createInvoice, notifications, removeNotification } = useInvoices();
  const [submitting, setSubmitting] = useState(false);

  // Get preselected client from navigation state
  const preselectedClient = (location.state as { preselectedClient?: unknown } | null)?.preselectedClient;

  const handleCancel = () => {
    console.log('🚨 CANCEL TRIGGERED - NewInvoicePage handleCancel called');
    console.trace('Cancel call stack');

    // Add a small delay to prevent accidental cancellations from modal events
    const userConfirmed = window.confirm('Êtes-vous sûr de vouloir annuler la création de cette facture ? Toutes les données non sauvegardées seront perdues.');
    if (userConfirmed) {
      navigate('/invoices');
    }
  };

  const handleSubmit = async (data: InvoiceFormData) => {
    try {
      setSubmitting(true);
      // Map form data to API create request
      const sanitizeNumber = (v: unknown, fallback = 0): number => {
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        const parsed = parseFloat(String(v));
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      // Basic guard: ensure a client is selected
      if (!data.client?.id) {
        // useInvoices will also show notifications on API errors; here we just prevent an invalid call
        alert('Veuillez sélectionner un client avant de créer la facture.');
        return;
      }

      console.log('[NewInvoicePage] RAW data.items:', data.items);
      console.log('[NewInvoicePage] Global discount:', {
        globalDiscountValue: data.globalDiscountValue,
        globalDiscountType: data.globalDiscountType,
        globalDiscountNote: data.globalDiscountNote,
      });

      const rawItems = (data.items || []).map((it, idx: number) => {
        const description = (it.description || '').trim();
        const quantity = sanitizeNumber(it.quantity, 0);
        const unitPrice = sanitizeNumber(it.unitPrice, 0);
        const tvaRate = sanitizeNumber(it.tvaRate ?? 0, 0);
        const order = typeof it.order === 'number' ? it.order : idx;
        const productId = it.productId || undefined;
        const unit = it.unit || undefined;

        // Line discount - Access directly from InvoiceItem type
        const lineDiscountValue = it.lineDiscountValue;
        const lineDiscountType = it.lineDiscountType;
        const lineDiscountSource = it.lineDiscountSource || 'NONE';

        console.log(`[NewInvoicePage] Item ${idx} discount fields:`, {
          description,
          lineDiscountValue,
          lineDiscountType,
          lineDiscountSource,
        });

        const subtotalBefore = quantity * unitPrice;
        let discount = 0;
        if (lineDiscountValue && lineDiscountValue > 0 && lineDiscountType) {
          discount = lineDiscountType === 'PERCENT'
            ? subtotalBefore * (lineDiscountValue / 100)
            : Math.min(lineDiscountValue, subtotalBefore);
        }
        const total = Math.max(0, subtotalBefore - discount);

        const itemPayload = {
          description,
          quantity,
          unitPrice,
          tvaRate,
          total,
          order,
          productId,
          unit,
          lineDiscountSource,
          // Include discount fields if present
          ...(lineDiscountSource !== 'NONE' && lineDiscountValue !== undefined && lineDiscountType ? {
            lineDiscountValue,
            lineDiscountType,
          } : {}),
        };

        console.log(`[NewInvoicePage] Item ${idx} payload:`, itemPayload);
        return itemPayload;
      });

      const filteredItems = rawItems.filter((it) => it.description.length > 0 && it.quantity > 0);

      console.log('[DEBUG] Invoice payload preparation:', {
        rawItemsCount: rawItems.length,
        filteredItemsCount: filteredItems.length,
        rawItems,
        filteredItems
      });

      const payload = {
        // DO NOT send invoiceNumber - let backend generate it automatically
        clientId: data.client.id,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        items: filteredItems,
        notes: data.notes || '',
        terms: data.terms || '',
        language: data.language || 'fr',
        currency: data.currency || 'CHF',
        // Global discount (optional)
        ...(data.globalDiscountValue && data.globalDiscountValue > 0 ? {
          globalDiscountValue: data.globalDiscountValue,
          globalDiscountType: data.globalDiscountType || 'PERCENT',
          globalDiscountNote: data.globalDiscountNote || undefined,
        } : {}),
        // Recurrence (optional)
        ...(data.estRecurrente ? {
          estRecurrente: true,
          frequence: data.frequence,
          prochaineDateRecurrence: data.prochaineDateRecurrence,
          dateFinRecurrence: data.dateFinRecurrence || undefined,
        } : {}),
      } as const satisfies Parameters<typeof createInvoice>[0];

      const created = await createInvoice(payload);
      if (created) {
        // Wait for form data and user context (nextInvoiceNumber) to refresh before navigating
        setTimeout(() => {
          const params = new URLSearchParams(location.search);
          if (params.get('from') === 'onboarding') {
            navigate('/dashboard');
          } else {
            navigate('/invoices');
          }
        }, 300);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <GuidedInvoiceWizard
        mode="create"
        loading={submitting}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        initialData={preselectedClient ? { client: preselectedClient } : undefined}
      />
      {/* Notifications for create flow */}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
        position="top-right"
      />
    </div>
  );
}
