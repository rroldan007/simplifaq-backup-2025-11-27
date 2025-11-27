import { useNavigate } from 'react-router-dom';

export function SimpleClientsPage() {
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
                👥 Clients
              </h1>
            </div>
            <button type="button" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              + Nouveau client
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Gestion des clients
            </h2>
            
            {/* Mock clients */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 1, name: 'Chocolaterie Suisse SA', email: 'contact@chocolaterie-suisse.ch', city: 'Genève', invoices: 5 },
                { id: 2, name: 'Restaurant Le Lac', email: 'info@restaurant-lelac.ch', city: 'Lausanne', invoices: 3 },
                { id: 3, name: 'Hôtel des Alpes', email: 'reservation@hotel-alpes.ch', city: 'Zermatt', invoices: 8 },
                { id: 4, name: 'Consulting Genève Sàrl', email: 'contact@consulting-geneve.ch', city: 'Genève', invoices: 12 },
                { id: 5, name: 'Tech Solutions Lausanne', email: 'info@tech-lausanne.ch', city: 'Lausanne', invoices: 7 },
                { id: 6, name: 'Boulangerie du Village', email: 'boulangerie@village.ch', city: 'Montreux', invoices: 2 },
              ].map((client) => (
                <div key={client.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900">{client.name}</h3>
                    <p className="text-sm text-gray-600">{client.email}</p>
                    <p className="text-sm text-gray-500">📍 {client.city}</p>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs text-gray-500">
                        {client.invoices} factures
                      </span>
                      <div className="flex space-x-2">
                        <button type="button" className="text-blue-600 hover:text-blue-800 text-sm transition-colors">
                          Modifier
                        </button>
                        <button type="button" className="text-green-600 hover:text-green-800 text-sm transition-colors">
                          Facturer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-4">
              <button type="button" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                Ajouter un client
              </button>
              <button type="button" className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                Importer des clients
              </button>
              <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Exporter la liste
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}