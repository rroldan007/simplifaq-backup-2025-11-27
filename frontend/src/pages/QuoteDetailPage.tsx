import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Edit, Trash2, ArrowRight, FileText, Mail, CheckCircle, XCircle, Clock, Sparkles } from 'lucide-react';
import { quotesApi, type Quote } from '../services/quotesApi';
import { SendEmailModal } from '../components/invoices/SendEmailModal';
import { EmailHistoryModal } from '../components/invoices/EmailHistoryModal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Card } from '../components/ui/Card';
import { useCurrentUser } from '../hooks/useAuth';

const QuoteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Loading states for different actions
  const [actionLoading, setActionLoading] = useState({
    download: false,
    convert: false,
    delete: false,
    send: false,
    approve: false,
    reject: false,
  });

  // Email modal states
  const [sendEmailModal, setSendEmailModal] = useState({
    isOpen: false,
    quoteId: '',
    quoteNumber: '',
    clientEmail: '',
  });

  const [emailHistoryModal, setEmailHistoryModal] = useState({
    isOpen: false,
    quoteId: '',
    quoteNumber: '',
  });

  const fetchQuote = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const fetchedQuote = await quotesApi.getQuote(id);
      setQuote(fetchedQuote);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
        ? (e as { message: string }).message
        : 'Erreur de chargement';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!id || actionLoading.download) return;
    setActionLoading(prev => ({ ...prev, download: true }));
    try {
      const options: any = {};
      if ((currentUser as any)?.pdfTemplate) options.template = (currentUser as any).pdfTemplate;
      if ((currentUser as any)?.pdfPrimaryColor) options.accentColor = (currentUser as any).pdfPrimaryColor;
      console.log('Quote PDF download options:', options);
      const blob = await quotesApi.downloadQuotePdf(id, options);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `devis-${quote?.quoteNumber || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading PDF:', e);
      alert('Erreur lors du téléchargement du PDF');
    } finally {
      setActionLoading(prev => ({ ...prev, download: false }));
    }
  };

  const handleSendEmail = () => {
    if (!quote || !id) return;
    setSendEmailModal({
      isOpen: true,
      quoteId: id,
      quoteNumber: quote.quoteNumber,
      clientEmail: quote.client?.email || '',
    });
  };

  const handleViewEmailHistory = () => {
    if (!quote || !id) return;
    setEmailHistoryModal({
      isOpen: true,
      quoteId: id,
      quoteNumber: quote.quoteNumber,
    });
  };

  const handleEmailSent = () => {
    // Wait for backend to update, then refresh quote
    setTimeout(() => {
      fetchQuote();
    }, 800);
  };

  const handleSendQuote = async () => {
    if (!id || actionLoading.send) return;
    setActionLoading(prev => ({ ...prev, send: true }));
    try {
      await quotesApi.sendQuote(id);
      alert('Devis envoyé avec succès');
      await fetchQuote();
    } catch (e) {
      console.error('Error sending quote:', e);
      alert('Erreur lors de l\'envoi du devis');
    } finally {
      setActionLoading(prev => ({ ...prev, send: false }));
    }
  };

  const handleApproveQuote = async () => {
    if (!id || actionLoading.approve) return;
    const confirm = window.confirm('Marquer ce devis comme approuvé ?');
    if (!confirm) return;

    setActionLoading(prev => ({ ...prev, approve: true }));
    try {
      await quotesApi.updateQuote(id, { status: 'accepted' });
      await fetchQuote();
    } catch (e) {
      console.error('Error approving quote:', e);
      alert('Erreur lors de l\'approbation du devis');
    } finally {
      setActionLoading(prev => ({ ...prev, approve: false }));
    }
  };

  const handleRejectQuote = async () => {
    console.log("REJECT QUOTE FUNCTION CALLED");
    if (!id || actionLoading.reject) return;
    const confirm = window.confirm('Marquer ce devis comme refusé ?');
    if (!confirm) return;

    setActionLoading(prev => ({ ...prev, reject: true }));
    try {
      await quotesApi.updateQuote(id, { status: 'rejected' });
      await fetchQuote();
    } catch (e) {
      console.error('Error rejecting quote:', e);
      alert('Erreur lors du refus du devis');
    } finally {
      setActionLoading(prev => ({ ...prev, reject: false }));
    }
  };

  const handleConvertToInvoice = async () => {
    if (!id || actionLoading.convert) return;
    const confirm = window.confirm('Voulez-vous convertir ce devis en facture ?');
    if (!confirm) return;

    setActionLoading(prev => ({ ...prev, convert: true }));
    try {
      const result = await quotesApi.convertToInvoice(id);
      alert(`Devis converti en facture ${result.invoiceNumber}`);
      navigate(`/invoices/${result.id}`);
    } catch (e) {
      console.error('Error converting quote:', e);
      alert('Erreur lors de la conversion du devis');
    } finally {
      setActionLoading(prev => ({ ...prev, convert: false }));
    }
  };

  const handleDelete = async () => {
    if (!id || actionLoading.delete) return;
    const confirm = window.confirm('Êtes-vous sûr de vouloir supprimer ce devis ?');
    if (!confirm) return;

    setActionLoading(prev => ({ ...prev, delete: true }));
    try {
      await quotesApi.deleteQuote(id);
      navigate('/quotes');
    } catch (e) {
      console.error('Error deleting quote:', e);
      alert('Erreur lors de la suppression du devis');
    } finally {
      setActionLoading(prev => ({ ...prev, delete: false }));
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800'
    };
    const labels = {
      draft: 'Brouillon',
      sent: 'Envoyé',
      accepted: 'Accepté',
      rejected: 'Refusé',
      expired: 'Expiré'
    };
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${badges[status as keyof typeof badges] || badges.draft}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-6">
          <div className="text-center text-red-600">
            <p className="font-medium">Erreur</p>
            <p className="text-sm mt-1">{error || 'Devis non trouvé'}</p>
            <button
              onClick={() => navigate('/quotes')}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Retour aux devis
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/quotes')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Retour aux devis
        </button>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Edit button - always visible for non-converted quotes */}
          {!quote.convertedInvoiceId && quote.status !== 'rejected' && (
            <button
              onClick={() => navigate(`/quotes/${id}/edit`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </button>
          )}
          
          {/* Download PDF - always visible */}
          <button
            onClick={handleDownloadPdf}
            disabled={actionLoading.download}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-2" />
            {actionLoading.download ? 'Téléchargement...' : 'PDF'}
          </button>
          
          {/* Email actions */}
          {!quote.convertedInvoiceId && (
            <>
              <button
                onClick={handleSendEmail}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Mail className="h-4 w-4 mr-2" />
                Envoyer par email
              </button>
              
              <button
                onClick={handleViewEmailHistory}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                title="Historique des emails"
              >
                <Clock className="h-4 w-4" />
              </button>
            </>
          )}
          
          {/* Delete button */}
          {!quote.convertedInvoiceId && (
            <button
              onClick={handleDelete}
              disabled={actionLoading.delete}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </button>
          )}
        </div>
      </div>

      {/* Quote Info */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                Devis {quote.quoteNumber}
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge(quote.status)}
              {quote.convertedInvoiceId && (
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800">
                  Converti en facture
                </span>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">
              {quote.total.toFixed(2)} {quote.currency}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Montant total TTC
            </p>
          </div>
        </div>

        {/* Workflow Progress - Visual Status Indicator */}
        {!quote.convertedInvoiceId && quote.status !== 'rejected' && (
          <div className="border-t pt-6 mt-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Progression du devis</h2>
            <div className="flex items-center justify-between relative">
              {/* Progress bar background */}
              <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 -z-10" />
              <div 
                className="absolute top-5 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-600 -z-10 transition-all duration-500"
                style={{ 
                  width: quote.status === 'draft' ? '0%' : 
                         quote.status === 'sent' ? '33%' : 
                         quote.status === 'accepted' ? '66%' : '100%' 
                }}
              />
              
              {/* Step 1: Draft */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  quote.status === 'draft' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs mt-2 font-medium">Brouillon</span>
              </div>
              
              {/* Step 2: Sent */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  quote.status === 'sent' || quote.status === 'accepted' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  <Mail className="w-5 h-5" />
                </div>
                <span className="text-xs mt-2 font-medium">Envoyé</span>
                {quote.status === 'draft' && (
                  <button
                    onClick={handleSendEmail}
                    className="mt-2 text-xs px-3 py-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    Envoyer
                  </button>
                )}
              </div>
              
              {/* Step 3: Approved */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  quote.status === 'accepted' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  <CheckCircle className="w-5 h-5" />
                </div>
                <span className="text-xs mt-2 font-medium">Approuvé</span>
                {quote.status === 'sent' && (
                  <div className="mt-2 flex flex-col gap-1">
                    <button
                      onClick={handleApproveQuote}
                      disabled={actionLoading.approve}
                      className="text-xs px-3 py-1 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading.approve ? '...' : 'Approuver'}
                    </button>
                    <button
                      onClick={handleRejectQuote}
                      disabled={actionLoading.reject}
                      className="text-xs px-3 py-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3 h-3" />
                      {actionLoading.reject ? '...' : 'Refuser'}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Step 4: Convert to Invoice */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  quote.convertedInvoiceId ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-xs mt-2 font-medium">Facture</span>
                {quote.status === 'accepted' && !quote.convertedInvoiceId && (
                  <button
                    onClick={handleConvertToInvoice}
                    disabled={actionLoading.convert}
                    className="mt-2 text-xs px-3 py-1 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {actionLoading.convert ? '...' : (
                      <>
                        <ArrowRight className="w-3 h-3" />
                        Convertir
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Client Info */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Client</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Nom</p>
              <p className="mt-1 text-sm text-gray-900">
                {quote.client?.companyName || 
                 `${quote.client?.firstName || ''} ${quote.client?.lastName || ''}`.trim()}
              </p>
            </div>
            {quote.client?.email && (
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="mt-1 text-sm text-gray-900">{quote.client.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="border-t pt-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dates</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Date d'émission</p>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(quote.issueDate).toLocaleDateString('fr-CH')}
              </p>
            </div>
            {quote.validUntil && (
              <div>
                <p className="text-sm font-medium text-gray-500">Valide jusqu'au</p>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(quote.validUntil).toLocaleDateString('fr-CH')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="border-t pt-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lignes du devis</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantité
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix unitaire
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TVA
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quote.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {item.unitPrice.toFixed(2)} {quote.currency}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.tvaRate}%</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      {item.total.toFixed(2)} {quote.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                    Sous-total HT
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                    {quote.subtotal.toFixed(2)} {quote.currency}
                  </td>
                </tr>
                {(quote as any).globalDiscountValue && (quote as any).globalDiscountValue > 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-3 text-sm font-medium text-red-600 text-right">
                      Rabais global ({(quote as any).globalDiscountValue}{(quote as any).globalDiscountType === 'PERCENT' ? '%' : ' ' + quote.currency})
                      {(quote as any).globalDiscountNote && (
                        <div className="text-xs text-gray-500 mt-1">{(quote as any).globalDiscountNote}</div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-red-600 text-right">
                      -{(() => {
                        const discountValue = (quote as any).globalDiscountValue || 0;
                        const discountType = (quote as any).globalDiscountType;
                        if (discountType === 'PERCENT') {
                          return (quote.subtotal * (discountValue / 100)).toFixed(2);
                        } else {
                          return Math.min(discountValue, quote.subtotal).toFixed(2);
                        }
                      })()} {quote.currency}
                    </td>
                  </tr>
                )}
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                    TVA
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                    {quote.tvaAmount.toFixed(2)} {quote.currency}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-sm font-bold text-gray-900 text-right">
                    Total TTC
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">
                    {quote.total.toFixed(2)} {quote.currency}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="border-t pt-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Notes</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}

        {/* Terms */}
        {quote.terms && (
          <div className="border-t pt-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Conditions</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.terms}</p>
          </div>
        )}
      </Card>

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={sendEmailModal.isOpen}
        onClose={() => setSendEmailModal(prev => ({ ...prev, isOpen: false }))}
        invoiceId={sendEmailModal.quoteId}
        invoiceNumber={sendEmailModal.quoteNumber}
        clientEmail={sendEmailModal.clientEmail}
        onEmailSent={handleEmailSent}
        isQuote={true}
      />

      {/* Email History Modal */}
      <EmailHistoryModal
        isOpen={emailHistoryModal.isOpen}
        onClose={() => setEmailHistoryModal(prev => ({ ...prev, isOpen: false }))}
        invoiceId={emailHistoryModal.quoteId}
        invoiceNumber={emailHistoryModal.quoteNumber}
      />
    </div>
  );
};

export default QuoteDetailPage;
