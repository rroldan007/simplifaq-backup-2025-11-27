import { useNavigate } from 'react-router-dom';

export function SimpleInvoicesPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
    >
      {/* Header */}
      <header
        className="shadow"
        style={{
          background: 'linear-gradient(135deg, var(--color-surface-primary) 0%, var(--color-surface-secondary) 100%)',
          color: 'var(--color-text-primary)',
          borderBottom: '1px solid var(--color-border-primary)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={handleBack}
                className="transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'; }}
              >
                ← Retour
              </button>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                📄 Factures
              </h1>
            </div>
            <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              + Facture
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Gestion des factures
            </h2>
            
            {/* Mock invoices */}
            <div className="space-y-4">
              {[
                { id: 1, number: 'FAC-2025-001', client: 'Chocolaterie Suisse SA', amount: 'CHF 1,250.00', status: 'Payée', date: '15/01/2025' },
                { id: 2, number: 'FAC-2025-002', client: 'Restaurant Le Lac', amount: 'CHF 850.00', status: 'Envoyée', date: '20/01/2025' },
                { id: 3, number: 'FAC-2025-003', client: 'Hôtel des Alpes', amount: 'CHF 2,100.00', status: 'Brouillon', date: '25/01/2025' },
              ].map((invoice) => (
                <div key={invoice.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-gray-900">{invoice.number}</h3>
                      <p className="text-sm text-gray-600">{invoice.client}</p>
                      <p className="text-xs text-gray-500">{invoice.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{invoice.amount}</p>
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        invoice.status === 'Payée' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'Envoyée' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-4">
              <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Créer une facture
              </button>
              <button type="button" className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                Importer des données
              </button>
              <button type="button" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                Exporter PDF
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}