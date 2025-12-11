import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quotesApi, type Quote } from '../services/quotesApi';
import { SendEmailModal } from '../components/invoices/SendEmailModal';
import { EmailHistoryModal } from '../components/invoices/EmailHistoryModal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useCurrentUser } from '../hooks/useAuth';
import { ModernQuotePDFViewer } from '../components/quotes/ModernQuotePDFViewer';

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

  const fetchQuote = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const handleDownloadPdf = async () => {
    if (!id || actionLoading.download || !quote) return;
    setActionLoading(prev => ({ ...prev, download: true }));
    try {
      type UserPdfSettings = { pdfTemplate?: string; pdfPrimaryColor?: string };
      const userPdf = currentUser as UserPdfSettings | null;
      const options: { template?: string; accentColor?: string } = {};
      if (userPdf?.pdfTemplate) options.template = userPdf.pdfTemplate;
      if (userPdf?.pdfPrimaryColor) options.accentColor = userPdf.pdfPrimaryColor;
      
      const blob = await quotesApi.downloadQuotePdf(id, options);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quote.quoteNumber || id}.pdf`;
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
    setTimeout(() => {
      fetchQuote();
    }, 800);
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

  const formatDate = (date?: string) => {
    return date ? new Intl.DateTimeFormat('fr-CH', { dateStyle: 'medium' }).format(new Date(date)) : '—';
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-800 ring-slate-200',
      sent: 'bg-blue-50 text-blue-700 ring-blue-200',
      accepted: 'bg-green-50 text-green-700 ring-green-200',
      rejected: 'bg-red-50 text-red-700 ring-red-200',
      expired: 'bg-orange-50 text-orange-700 ring-orange-200'
    };
    return statusMap[status.toLowerCase()] || statusMap.draft;
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: 'Brouillon',
      sent: 'Envoyé',
      accepted: 'Accepté',
      rejected: 'Refusé',
      expired: 'Expiré'
    };
    return statusMap[status?.toLowerCase()] || status || 'Brouillon';
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
            <Button onClick={() => navigate('/quotes')} className="mt-4">
              Retour aux devis
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* HEADER SECTION */}
      <div className="relative">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Left: Title & Status */}
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/quotes')}
              className="p-2 hover:bg-white/50 transition-colors rounded-full"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Devis {quote.quoteNumber}
                </h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${getStatusColor(quote.status)}`}>
                  {getStatusLabel(quote.status)}
                </span>
                {quote.convertedInvoiceId && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ring-1 ring-inset bg-purple-50 text-purple-700 ring-purple-200">
                    Converti
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Émis le {formatDate(quote.issueDate)}</span>
                </div>
                {quote.client && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{quote.client.companyName || `${quote.client.firstName} ${quote.client.lastName}`}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Primary Actions */}
          <div className="flex items-center gap-3">
            {!quote.convertedInvoiceId && quote.status !== 'rejected' && (
              <Button
                onClick={() => navigate(`/quotes/${id}/edit`)}
                className="bg-white/80 backdrop-blur-sm hover:bg-slate-50 text-slate-700 border border-slate-200/60 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 rounded-xl px-4"
              >
                <span className="mr-2 text-lg">✏️</span> Modifier
              </Button>
            )}
            {!quote.convertedInvoiceId && quote.status !== 'rejected' && (
              <Button
                variant="primary"
                onClick={handleConvertToInvoice}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-900/20 transition-all hover:shadow-purple-900/30 hover:-translate-y-0.5 rounded-xl px-5 border-0"
              >
                <span className="mr-2 text-lg">✨</span> Convertir en Facture
              </Button>
            )}
            {quote.status === 'sent' && (
               <Button
                variant="primary"
                onClick={handleApproveQuote}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-900/20 transition-all hover:shadow-green-900/30 hover:-translate-y-0.5 rounded-xl px-5 border-0"
              >
                <span className="mr-2 text-lg">✅</span> Approuver
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* INFO CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Client & Details Card */}
        <div className="lg:col-span-2">
           <Card className="h-full border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-blue-100 rounded-md text-blue-600">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
                Détails du devis
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Client</h4>
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
                      {(quote.client?.companyName?.[0] || quote.client?.firstName?.[0] || '?').toUpperCase()}
                   </div>
                   <div>
                      <p className="font-semibold text-slate-900 text-lg">
                        {quote.client?.companyName || `${quote.client?.firstName || ''} ${quote.client?.lastName || ''}`.trim()}
                      </p>
                      {quote.client?.email && (
                        <p className="text-sm text-slate-500">{quote.client.email}</p>
                      )}
                   </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Montants & Validité</h4>
                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total TTC:</span>
                      <span className="text-xl font-bold text-slate-900">{quote.total.toFixed(2)} {quote.currency}</span>
                   </div>
                   {quote.validUntil && (
                     <div className="flex justify-between items-center">
                        <span className="text-slate-600">Valide jusqu'au:</span>
                        <span className="text-slate-900 font-medium">{formatDate(quote.validUntil)}</span>
                     </div>
                   )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 2. Quick Actions Card */}
        <div className="space-y-6">
          <Card className="border-slate-200/60 shadow-sm p-5 bg-white/80 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
              Actions Rapides
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {!quote.convertedInvoiceId && (
                <Button
                  variant="secondary"
                  onClick={handleSendEmail}
                  disabled={actionLoading.send}
                  className="w-full justify-start text-sm h-auto py-3 px-4 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 rounded-xl transition-all group"
                >
                  <span className="mr-3 text-lg group-hover:scale-110 transition-transform">📤</span> 
                  {actionLoading.send ? 'Envoi...' : 'Envoyer par email'}
                </Button>
              )}
              
              <Button
                variant="secondary"
                onClick={handleDownloadPdf}
                disabled={actionLoading.download}
                className="w-full justify-start text-sm h-auto py-3 px-4 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 rounded-xl transition-all group"
              >
                <span className="mr-3 text-lg group-hover:scale-110 transition-transform">📄</span> 
                {actionLoading.download ? 'Téléchargement...' : 'Télécharger PDF'}
              </Button>

              {!quote.convertedInvoiceId && quote.status !== 'rejected' && (
                <Button
                  variant="secondary"
                  onClick={handleConvertToInvoice}
                  disabled={actionLoading.convert}
                  className="w-full justify-start text-sm h-auto py-3 px-4 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 hover:text-purple-700 rounded-xl transition-all group"
                >
                  <span className="mr-3 text-lg group-hover:scale-110 transition-transform">✨</span> 
                  {actionLoading.convert ? 'Conversion...' : 'Convertir en Facture'}
                </Button>
              )}
              
              {!quote.convertedInvoiceId && (
                 <div className="grid grid-cols-2 gap-3 mt-2">
                    {quote.status === 'sent' && (
                      <Button
                        variant="secondary"
                        onClick={handleRejectQuote}
                        disabled={actionLoading.reject}
                        className="w-full justify-start text-sm h-auto py-3 px-4 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50/50 hover:text-red-700 rounded-xl transition-all group"
                      >
                        <span className="mr-2 text-lg group-hover:scale-110 transition-transform">❌</span> 
                        Refuser
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      onClick={handleDelete}
                      disabled={actionLoading.delete}
                      className={`w-full justify-start text-sm h-auto py-3 px-4 bg-red-50/50 text-red-600 border border-red-100 hover:bg-red-100 hover:border-red-200 hover:text-red-700 rounded-xl transition-all group ${quote.status !== 'sent' ? 'col-span-2' : ''}`}
                    >
                      <span className="mr-2 text-lg group-hover:scale-110 transition-transform">🗑️</span> 
                      Supprimer
                    </Button>
                 </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* NEW MODERN PDF VIEWER COMPONENT */}
      <div className="animate-fade-in-up">
        <ModernQuotePDFViewer 
          quoteId={quote.id}
          quoteNumber={quote.quoteNumber} 
          onDownloadPdf={handleDownloadPdf}
        />
      </div>

      {/* Modals */}
      <SendEmailModal
        isOpen={sendEmailModal.isOpen}
        onClose={() => setSendEmailModal(prev => ({ ...prev, isOpen: false }))}
        invoiceId={sendEmailModal.quoteId}
        invoiceNumber={sendEmailModal.quoteNumber}
        clientEmail={sendEmailModal.clientEmail}
        onEmailSent={handleEmailSent}
        isQuote={true}
      />

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
