import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuidedInvoiceWizard, type InvoiceFormData } from '../components/invoices/GuidedInvoiceWizard';
import { useInvoices } from '../hooks/useInvoices';
import { NotificationContainer } from '../components/ui/Notification';

export function NewDevisPage() {
  const navigate = useNavigate();
  const { createInvoice, notifications, removeNotification } = useInvoices({ isQuote: true });
  const [submitting, setSubmitting] = useState(false);

  const handleCancel = () => {
    const userConfirmed = window.confirm("Êtes-vous sûr de vouloir annuler la création de ce devis ? Toutes les données non sauvegardées seront perdues.");
    if (userConfirmed) {
      navigate('/devis');
    }
  };

  const handleSubmit = async (data: InvoiceFormData) => {
    try {
      setSubmitting(true);
      const sanitizeNumber = (v: unknown, fallback = 0): number => {
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        const parsed = parseFloat(String(v));
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      if (!data.client?.id) {
        alert('Veuillez sélectionner un client avant de créer le devis.');
        return;
      }

      const payload = {
        invoiceNumber: data.invoiceNumber,
        clientId: data.client.id,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        items: (data.items || [])
          .map((it, idx: number) => {
            const description = (it.description || '').trim();
            const quantity = sanitizeNumber(it.quantity, 0);
            const unitPrice = sanitizeNumber(it.unitPrice, 0);
            const tvaRate = sanitizeNumber(it.tvaRate ?? 0, 0);
            const order = typeof it.order === 'number' ? it.order : idx;
            const total = quantity * unitPrice;
            const productId = (it as any).productId || undefined;
            const unitRaw = (it as any).unit;
            const unit = typeof unitRaw === 'string' ? unitRaw.trim() : undefined;
            return { description, quantity, unitPrice, tvaRate, total, order, productId, unit };
          })
          .filter((it) => it.description.length > 0 && it.quantity > 0),
        notes: data.notes || '',
        terms: data.terms || '',
        language: data.language || 'fr',
        currency: data.currency || 'CHF',
        // Mark as quote
        isQuote: true,
      } as const;

      const created = await createInvoice(payload as any);
      if (created) {
        setTimeout(() => {
          navigate('/devis');
        }, 100);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
            <GuidedInvoiceWizard
        mode="create"
        documentType="quote"
        loading={submitting}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
        position="top-right"
      />
    </div>
  );
}
