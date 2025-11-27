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
      <label className="block text-sm font-medium text-slate-700">
        Client *
      </label>
      
      {selectedClient ? (
        // Selected client display
        <div className="relative" ref={dropdownRef}>
          <div className="p-4 border border-slate-300 rounded-lg bg-slate-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-slate-900">
                  {getClientDisplayName(selectedClient)}
                </h4>
                <p className="text-sm text-slate-600 mt-1">
                  {getClientSubtitle(selectedClient)}
                </p>
                {selectedClient.address && (
                  <p className="text-sm text-slate-500 mt-2">
                    {selectedClient.address.street}<br />
                    {selectedClient.address.postalCode} {selectedClient.address.city}<br />
                    {selectedClient.address.country}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(v => !v)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Changer
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Supprimer
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
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder="Rechercher un client ou saisir un nom..."
                className="w-full"
              />
            </div>
            {onCreateNew && (
              <Button onClick={onCreateNew} variant="secondary">
                <span className="mr-2">➕</span>
                Nouveau
              </Button>
            )}
          </div>

          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-slate-500">
                  Chargement des clients...
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="p-4 text-center">
                  <div className="text-slate-500 mb-2">
                    {searchQuery ? 'Aucun client trouvé' : 'Aucun client disponible'}
                  </div>
                  {onCreateNew && (
                    <Button onClick={onCreateNew} variant="primary" size="sm">
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}