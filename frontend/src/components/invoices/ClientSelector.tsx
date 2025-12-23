import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface Client {
  id: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  vatNumber?: string;
}

// Note: Do not use mock clients in production paths. The selector should rely on real client data
// provided via the `clients` prop to avoid submitting invalid client IDs.

interface ClientSelectorProps {
  selectedClient: Client | null;
  onClientSelect: (client: Client | null) => void;
  onCreateNew?: () => void;
  clients?: Client[];
  loading?: boolean;
}

export function ClientSelector({
  selectedClient,
  onClientSelect,
  onCreateNew,
  clients = [],
  loading = false
}: ClientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Memoize the list to keep a stable reference unless clients prop changes
  const allClients = useMemo(() => clients, [clients]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredClients(allClients);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allClients.filter(client => {
        const name = client.companyName || `${client.firstName} ${client.lastName}`;
        return (
          name.toLowerCase().includes(query) ||
          client.email.toLowerCase().includes(query) ||
          (client.address?.city && client.address.city.toLowerCase().includes(query)) ||
          (client.vatNumber && client.vatNumber.toLowerCase().includes(query))
        );
      });
      setFilteredClients(filtered);
    }
  }, [searchQuery, allClients]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getClientDisplayName = (client: Client) => {
    return client.companyName || `${client.firstName} ${client.lastName}`;
  };

  const getClientSubtitle = (client: Client) => {
    const parts = [client.email];
    if (client.vatNumber) {
      parts.push(client.vatNumber);
    }
    return parts.join(' • ');
  };

  const handleClientSelect = (client: Client) => {
    onClientSelect(client);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClearSelection = () => {
    onClientSelect(null);
  };

  return (
    <div className="space-y-2">
      {selectedClient ? (
        // Selected client display
        <div className="relative" ref={dropdownRef}>
          <div className="p-4 border-2 border-emerald-200 rounded-xl bg-gradient-to-br from-emerald-50/50 to-teal-50/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg">{selectedClient.companyName ? '🏢' : '👤'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-800 truncate">
                  {getClientDisplayName(selectedClient)}
                </h4>
                <p className="text-sm text-slate-500 mt-0.5 truncate">
                  {getClientSubtitle(selectedClient)}
                </p>
                {selectedClient.address && (
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {selectedClient.address.street}, {selectedClient.address.postalCode} {selectedClient.address.city}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(v => !v)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Changer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          {isOpen && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <div className="sticky top-0 bg-white p-2 border-b border-slate-200">
                <Input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                />
              </div>
              {loading ? (
                <div className="p-4 text-center text-slate-500">Chargement des clients...</div>
              ) : filteredClients.length === 0 ? (
                <div className="p-4 text-center">
                  <div className="text-slate-500 mb-2">Aucun client trouvé</div>
                  {onCreateNew && (
                    <Button onClick={() => { setIsOpen(false); onCreateNew(); }} variant="primary" size="sm">
                      <span className="mr-2">➕</span>
                      Créer un nouveau client
                    </Button>
                  )}
                </div>
              ) : (
                <div className="py-1">
                  {filteredClients.map((client) => (
                    <button
                      type="button"
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">
                            {getClientDisplayName(client)}
                          </div>
                          <div className="text-sm text-slate-600 mt-1">
                            {getClientSubtitle(client)}
                          </div>
                          {(client.address?.city || client.address?.country) && (
                            <div className="text-xs text-slate-500 mt-1">
                              {client.address?.city || '—'}{client.address?.country ? `, ${client.address.country}` : ''}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 ml-2">
                          {client.companyName ? '🏢' : '👤'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {onCreateNew && filteredClients.length > 0 && (
                <div className="p-2 border-t border-slate-200">
                  <Button onClick={() => { setIsOpen(false); onCreateNew(); }} variant="secondary" size="sm" className="w-full">➕ Nouveau client</Button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // Client selection interface
        <div className="relative" ref={dropdownRef}>
          <div className="flex gap-2">
            <div className="flex-1 relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder="Rechercher un client ou saisir un nom..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-slate-200 hover:border-slate-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 bg-slate-50/50 focus:bg-white text-slate-800 placeholder-slate-400 transition-all focus:outline-none"
              />
            </div>
            {onCreateNew && (
              <button 
                type="button"
                onClick={onCreateNew} 
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouveau
              </button>
            )}
          </div>

          {isOpen && (
            <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 max-h-72 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-sm text-slate-500">Chargement...</span>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">
                    {searchQuery ? 'Aucun client trouvé' : 'Aucun client disponible'}
                  </p>
                  {onCreateNew && (
                    <button 
                      type="button"
                      onClick={onCreateNew} 
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-lg shadow-lg shadow-emerald-500/25"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Créer un nouveau client
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-2">
                  {filteredClients.map((client) => (
                    <button
                      type="button"
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">{client.companyName ? '🏢' : '👤'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 truncate">
                          {getClientDisplayName(client)}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {getClientSubtitle(client)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}