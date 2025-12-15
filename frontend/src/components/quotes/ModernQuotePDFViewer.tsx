import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { quotesApi } from '../../services/quotesApi';
import { useCurrentUser } from '../../hooks/useAuth';

interface ModernQuotePDFViewerProps {
  quoteId: string;
  quoteNumber: string;
  onDownloadPdf: () => void;
}

export const ModernQuotePDFViewer: React.FC<ModernQuotePDFViewerProps> = ({
  quoteId,
  quoteNumber,
  onDownloadPdf
}) => {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loadingPdf, setLoadingPdf] = useState(true);
  const currentUser = useCurrentUser();

  console.log('%c✨ MODERN QUOTE PDF VIEWER LOADED ✨', 'background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 12px;');

  useEffect(() => {
    const loadPdf = async () => {
      if (!quoteId) {
        setLoadingPdf(false);
        return;
      }
      
      try {
        setLoadingPdf(true);
        
        // Get user preferences for PDF
        type UserPdfSettings = { pdfTemplate?: string; pdfPrimaryColor?: string };
        const userPdf = currentUser as UserPdfSettings | null;
        const options: { template?: string; accentColor?: string } = {};
        
        if (userPdf?.pdfTemplate) options.template = userPdf.pdfTemplate;
        if (userPdf?.pdfPrimaryColor) options.accentColor = userPdf.pdfPrimaryColor;
        
        console.log('Loading Quote PDF preview with options:', options);

        // We can use the download function to get the blob for viewing too
        const blob = await quotesApi.downloadQuotePdf(quoteId, options);
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (error) {
        console.error('❌ Error loading Quote PDF:', error);
      } finally {
        setLoadingPdf(false);
      }
    };

    loadPdf();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [quoteId, currentUser]);

  return (
    <div className="relative">
      {/* ULTRA MODERN HEADER */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-gradient-to-r from-blue-600/90 via-indigo-600/90 to-violet-600/90 shadow-2xl rounded-t-2xl">
        <div className="px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-white rounded-2xl blur-xl opacity-50 animate-pulse" />
                <div className="relative bg-white/20 backdrop-blur-sm p-3 rounded-2xl border border-white/30 shadow-xl">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white drop-shadow-lg">Devis {quoteNumber}</h2>
                <p className="text-white/90 text-sm font-medium">Aperçu interactif • Plein écran</p>
              </div>
            </div>
            
            <Button
              onClick={onDownloadPdf}
              className="group bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-2 border-white/40 hover:border-white/60 shadow-2xl hover:shadow-3xl transition-all duration-300 px-6 py-3 rounded-xl font-semibold"
            >
              <svg className="w-5 h-5 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger PDF
            </Button>
          </div>
        </div>
      </div>

      {/* PDF VIEWER AREA */}
      <div className="bg-gradient-to-br from-slate-100 via-slate-50 to-white p-8 rounded-b-2xl">
        {loadingPdf ? (
          <div className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-2xl border-2 border-blue-100 p-20" style={{ height: 'calc(100vh - 220px)' }}>
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur-3xl opacity-40 animate-pulse" />
              <div className="relative w-20 h-20 border-[6px] border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent mb-2">Génération du devis...</h3>
            <p className="text-slate-600 text-lg">Préparation de votre document PDF</p>
          </div>
        ) : pdfUrl ? (
          <div className="relative bg-white rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-violet-500/5 pointer-events-none" />
            <iframe
              src={`${pdfUrl}#view=FitH&toolbar=0&navpanes=0`}
              className="w-full h-full border-0 relative z-10"
              title="Quote PDF"
              style={{ minHeight: '100%' }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center bg-white rounded-3xl shadow-2xl border-2 border-red-100 p-20" style={{ height: 'calc(100vh - 220px)' }}>
            <div className="w-28 h-28 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mb-8 shadow-xl">
              <svg className="w-14 h-14 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">Échec du chargement</h3>
            <p className="text-slate-600 text-lg mb-8">Impossible de charger l'aperçu du devis</p>
            <Button
              onClick={onDownloadPdf}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold shadow-xl text-lg"
            >
              <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger le PDF
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
