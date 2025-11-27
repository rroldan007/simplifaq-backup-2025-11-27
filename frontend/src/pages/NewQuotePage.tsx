import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GuidedInvoiceWizard, type InvoiceFormData } from '../components/invoices/GuidedInvoiceWizard';
import { useQuotes } from '../hooks/useQuotes';
import { quotesApi, type Quote } from '../services/quotesApi';
import { NotificationContainer } from '../components/ui/Notification';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function NewQuotePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { createQuote, updateQuote, notifications, removeNotification } = useQuotes();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [existingQuote, setExistingQuote] = useState<Quote | null>(null);

  // Load existing quote if editing
  useEffect(() => {
    if (id) {
      setLoading(true);
      quotesApi.getQuote(id)
        .then(quote => {
          setExistingQuote(quote);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error loading quote:', error);
          alert('Erreur lors du chargement du devis');
          navigate('/quotes');
        });
    }
  }, [id, navigate]);

  const handleCancel = () => {
    const userConfirmed = window.confirm('Êtes-vous sûr de vouloir annuler la création de ce devis ? Toutes les données non sauvegardées seront perdues.');
    if (userConfirmed) {
      navigate('/quotes');
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

      if (!data.items || data.items.length === 0) {
        alert('Veuillez ajouter au moins un article au devis.');
        return;
      }

      const payload: any = {
        clientId: data.client.id,
        validUntil: data.dueDate || undefined, // Use dueDate as validUntil for quotes
        items: (data.items || [])
          .map((it, idx: number) => {
            const description = (it.description || '').trim();
            const quantity = sanitizeNumber(it.quantity, 1);
            const unitPrice = sanitizeNumber(it.unitPrice, 0);
            const tvaRate = sanitizeNumber(it.tvaRate ?? 8.1, 8.1);
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
      };

      // Add global discount if present
      if (data.globalDiscountValue && data.globalDiscountValue > 0) {
        payload.globalDiscountValue = sanitizeNumber(data.globalDiscountValue, 0);
        payload.globalDiscountType = data.globalDiscountType || 'PERCENT';
        payload.globalDiscountNote = data.globalDiscountNote || null;
      }

      console.log('📤 Sending quote payload:', payload);

      let result;
      if (id) {
        // Update existing quote
        result = await updateQuote(id, payload);
      } else {
        // Create new quote
        result = await createQuote(payload);
      }
      
      if (result) {
        // Give time for user context to update with new nextQuoteNumber
        setTimeout(() => {
          navigate('/quotes');
        }, 300);
      }
    } catch (error) {
      console.error('❌ Error creating quote:', error);
      alert('Erreur lors de la création du devis. Vérifiez les données et réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading spinner while fetching existing quote
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Transform existing quote to initial form data
  const initialData = existingQuote ? {
    invoiceNumber: existingQuote.quoteNumber,
    client: existingQuote.client ? {
      id: existingQuote.client.id,
      companyName: existingQuote.client.companyName || '',
      firstName: existingQuote.client.firstName || '',
      lastName: existingQuote.client.lastName || '',
      email: existingQuote.client.email || '',
      address: {
        street: (existingQuote.client as any).street || '',
        city: (existingQuote.client as any).city || '',
        postalCode: (existingQuote.client as any).postalCode || '',
        country: (existingQuote.client as any).country || 'Suisse',
      },
      vatNumber: (existingQuote.client as any).vatNumber,
    } : null,
    issueDate: existingQuote.issueDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    dueDate: existingQuote.validUntil?.slice(0, 10) || '',
    items: (existingQuote.items || []).map(item => ({
      id: item.id,
      description: item.description || '',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      tvaRate: item.tvaRate || 8.1,
      total: item.total || (item.quantity || 1) * (item.unitPrice || 0),
      order: item.order || 0,
      productId: (item as any).productId,
      unit: (item as any).unit,
    })),
    notes: existingQuote.notes || '',
    terms: existingQuote.terms || '',
    language: (existingQuote.language || 'fr') as 'fr' | 'de' | 'it' | 'en',
    currency: (existingQuote.currency || 'CHF') as 'CHF' | 'EUR',
    globalDiscountValue: (existingQuote as any).globalDiscountValue || undefined,
    globalDiscountType: (existingQuote as any).globalDiscountType || undefined,
    globalDiscountNote: (existingQuote as any).globalDiscountNote || undefined,
  } : undefined;

  return (
    <div className="max-w-6xl mx-auto">
      <GuidedInvoiceWizard
        mode={id ? 'edit' : 'create'}
        documentType="quote"
        initialData={initialData}
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
