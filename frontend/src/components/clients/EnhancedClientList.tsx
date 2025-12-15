import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Building2, User, Search, X, LayoutGrid, List, Eye, Pencil, FileText, Trash2, Mail, Phone, MapPin, CalendarClock, Users, Plus, Upload, Download, UserPlus } from 'lucide-react';

interface Client {
  id: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  canton?: string;
  vatNumber?: string;
  language: 'de' | 'fr' | 'it' | 'en';
  paymentTerms: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type Filter = 'all' | 'active' | 'inactive' | 'companies' | 'individuals';

interface EnhancedClientListProps {
  clients: Client[];
  loading?: boolean;
  error?: string | null;
  onView?: (clientId: string) => void;
  onEdit?: (clientId: string) => void;
  onDelete?: (clientId: string) => void;
  onCreateInvoice?: (clientId: string) => void;
  onCreateNew?: () => void;
  onImportCsv?: (file: File) => void;
  onExport?: () => void;
}

export const EnhancedClientList: React.FC<EnhancedClientListProps> = ({
  clients,
  loading = false,
  error = null,
  onView,
  onEdit,
  onDelete,
  onCreateInvoice,
  onCreateNew,
  onImportCsv,
  onExport
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<Filter>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem('clients_view_mode') as 'grid' | 'list') || 'grid'
  );
  const [fabOpen, setFabOpen] = useState(false);
  useEffect(() => {
    try { localStorage.setItem('clients_view_mode', viewMode); } catch { /* ignore storage errors */ }
  }, [viewMode]);

  // Brief FAB highlight on mount
  const [highlightFab, setHighlightFab] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setHighlightFab(false), 4000);
    return () => clearTimeout(t);
  }, []);

  // Filter and search clients
  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Filter by type/status
    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(client => client.isActive);
        break;
      case 'inactive':
        filtered = filtered.filter(client => !client.isActive);
        break;
      case 'companies':
        filtered = filtered.filter(client => !!client.companyName);
        break;
      case 'individuals':
        filtered = filtered.filter(client => !client.companyName);
        break;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client => {
        const name = (client.companyName || [client.firstName, client.lastName].filter(Boolean).join(' ')).toLowerCase();
        return (
          name.includes(query) ||
          (client.email || '').toLowerCase().includes(query) ||
          (client.city || '').toLowerCase().includes(query) ||
          (client.vatNumber || '').toLowerCase().includes(query) ||
          (client.phone || '').includes(query)
        );
      });
    }

    return filtered.sort((a, b) => {
      const nameA = (a.companyName || [a.firstName, a.lastName].filter(Boolean).join(' '));
      const nameB = (b.companyName || [b.firstName, b.lastName].filter(Boolean).join(' '));
      return nameA.localeCompare(nameB);
    });
  }, [clients, searchQuery, selectedFilter]);

  const getClientName = (client: Client) => {
    return client.companyName || [client.firstName, client.lastName].filter(Boolean).join(' ') || 'Client sans nom';
  };

  const getClientType = (client: Client) => {
    return client.companyName ? 'Entreprise' : 'Particulier';
  };

  const getLanguageLabel = (language: string) => {
    const labels: Record<string, string> = {
      'fr': 'FR',
      'de': 'DE',
      'it': 'IT',
      'en': 'EN'
    };
    return labels[language] || language.toUpperCase();
  };

  const filterOptions: Array<{ value: Filter; label: string; icon: React.ReactNode; count: number }> = [
    { value: 'all', label: 'Tous les clients', icon: <Users className="w-4 h-4" />, count: clients.length },
    { value: 'active', label: 'Actifs', icon: <Eye className="w-4 h-4" />, count: clients.filter(c => c.isActive).length },
    { value: 'inactive', label: 'Inactifs', icon: <Eye className="w-4 h-4" />, count: clients.filter(c => !c.isActive).length },
    { value: 'companies', label: 'Entreprises', icon: <Building2 className="w-4 h-4" />, count: clients.filter(c => !!c.companyName).length },
    { value: 'individuals', label: 'Particuliers', icon: <User className="w-4 h-4" />, count: clients.filter(c => !c.companyName).length }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-[var(--color-text-secondary)]">Chargement des clients...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Oups ! Une erreur s'est produite</h3>
        <p className="text-slate-600 mb-6">{error}</p>
        <Button onClick={() => window.location.reload()} variant="primary">
          🔄 Réessayer
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="p-6 card-theme">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-[var(--color-text-tertiary)]" />
            </div>
            <Input
              type="text"
              placeholder="Rechercher par nom, email, ville, TVA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 text-lg input-theme"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedFilter(option.value)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedFilter === option.value
                    ? 'bg-[var(--color-accent-100)] text-[var(--color-accent-700)] border-2 border-[var(--color-accent-200)]'
                    : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] border-2 border-transparent'
                }`}
              >
                <span className="inline-flex">{option.icon}</span>
                <span>{option.label}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  selectedFilter === option.value
                    ? 'bg-[var(--color-accent-200)] text-[var(--color-accent-800)]'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                }`}>
                  {option.count}
                </span>
              </button>
            ))}
          </div>

          {/* View Mode and Results Count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-[var(--color-text-secondary)]">Affichage :</span>
              <div className="flex bg-[var(--color-bg-secondary)] rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'grid'
                      ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <span className="inline-flex items-center space-x-1"><LayoutGrid className="w-4 h-4" /><span>Grille</span></span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'list'
                      ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <span className="inline-flex items-center space-x-1"><List className="w-4 h-4" /><span>Liste</span></span>
                </button>
              </div>
            </div>
            
            <div className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] px-3 py-1 rounded-full">
              <span className="font-medium">{filteredClients.length}</span> client{filteredClients.length !== 1 ? 's' : ''}
              {searchQuery && ' trouvé' + (filteredClients.length !== 1 ? 's' : '')}
            </div>
          </div>
        </div>
      </Card>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <Card className="p-12 text-center card-theme">
          <div className="text-8xl mb-6">
            {searchQuery || selectedFilter !== 'all' ? <Search className="w-16 h-16 mx-auto" /> : <Users className="w-16 h-16 mx-auto" />}
          </div>
          
          {searchQuery || selectedFilter !== 'all' ? (
            <>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3">
                Aucun client trouvé
              </h3>
              <p className="text-slate-600 mb-8 text-lg">
                Aucun client ne correspond à vos critères de recherche.
              </p>
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFilter('all');
                }}
                variant="secondary"
                className="text-lg px-6 py-3"
              >
                <span className="inline-flex items-center space-x-2"><Trash2 className="w-4 h-4" /><span>Effacer les filtres</span></span>
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3">
                Aucun client pour le moment
              </h3>
              <p className="text-slate-600 mb-8 text-lg">
                Commencez par ajouter votre premier client pour gérer vos relations commerciales.
              </p>
              {onCreateNew && (
                <Button
                  onClick={onCreateNew}
                  variant="primary"
                  className="text-lg px-8 py-4"
                >
                  <span className="inline-flex items-center space-x-2"><User className="w-4 h-4" /><span>Ajouter mon premier client</span></span>
                </Button>
              )}
            </>
          )}
        </Card>
      ) : (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <Card
                key={client.id}
                className={`p-6 card-theme hover:shadow-lg transition-all duration-200 ${!client.isActive ? 'opacity-75' : 'hover:shadow-xl'}`}
              >
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-[var(--color-bg-secondary)] rounded-full flex items-center justify-center text-[var(--color-text-secondary)]">
                    {client.companyName ? <Building2 className="w-6 h-6" /> : <User className="w-6 h-6" />}
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{getClientName(client)}</h3>
                      {!client.isActive && (<span className="px-2 py-1 bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-xs rounded-full">Inactif</span>)}
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-sm text-[var(--color-text-secondary)] mb-2">
                      <span>{getClientType(client)}</span><span>•</span><span>{getLanguageLabel(client.language)}</span>
                    </div>
                    <div className="space-y-1 text-sm text-[var(--color-text-secondary)]">
                      <div className="flex items-center justify-center space-x-1"><Mail className="w-4 h-4" /><span>{client.email}</span></div>
                      {client.phone && (<div className="flex items-center justify-center space-x-1"><Phone className="w-4 h-4" /><span>{client.phone}</span></div>)}
                      <div className="flex items-center justify-center space-x-1"><MapPin className="w-4 h-4" /><span>{client.city}, {client.country}</span></div>
                      <div className="flex items-center justify-center space-x-1"><CalendarClock className="w-4 h-4" /><span>{client.paymentTerms} jours</span></div>
                    </div>
                  </div>
                  <div className="flex justify-center space-x-2 pt-4 border-t border-[var(--color-border-primary)]">
                    {onView && (<Button onClick={() => onView(client.id)} variant="secondary" size="sm" className="text-xs"><span className="inline-flex items-center space-x-1"><Eye className="w-4 h-4" /><span>Voir</span></span></Button>)}
                    {onEdit && (<Button onClick={() => onEdit(client.id)} variant="secondary" size="sm" className="text-xs"><span className="inline-flex items-center space-x-1"><Pencil className="w-4 h-4" /><span>Modifier</span></span></Button>)}
                    {onCreateInvoice && (<Button onClick={() => onCreateInvoice(client.id)} variant="primary" size="sm" className="text-xs"><span className="inline-flex items-center space-x-1"><FileText className="w-4 h-4" /><span>Facturer</span></span></Button>)}
                    {onDelete && (<Button onClick={() => onDelete(client.id)} variant="danger" size="sm" className="text-xs"><Trash2 className="w-4 h-4" /></Button>)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-[var(--color-border-primary)] rounded-lg overflow-hidden">
              <thead className="bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-3 py-2 text-left">Nom</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Langue</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Téléphone</th>
                  <th className="px-3 py-2 text-left">Ville</th>
                  <th className="px-3 py-2 text-left">Conditions</th>
                  <th className="px-3 py-2 text-left">Statut</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} className="border-t border-[var(--color-border-primary)] hover:bg-[var(--color-bg-secondary)]">
                    <td className="px-3 py-2">{getClientName(client)}</td>
                    <td className="px-3 py-2">{getClientType(client)}</td>
                    <td className="px-3 py-2">{getLanguageLabel(client.language)}</td>
                    <td className="px-3 py-2">{client.email}</td>
                    <td className="px-3 py-2">{client.phone || '—'}</td>
                    <td className="px-3 py-2">{client.city}</td>
                    <td className="px-3 py-2">{client.paymentTerms} jours</td>
                    <td className="px-3 py-2">{client.isActive ? 'Actif' : 'Inactif'}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-2">
                        {onView && (<button onClick={() => onView(client.id)} className="px-2 py-1 text-xs chip-neutral rounded-md">Voir</button>)}
                        {onEdit && (<button onClick={() => onEdit(client.id)} className="px-2 py-1 text-xs chip-neutral rounded-md">Modifier</button>)}
                        {onCreateInvoice && (<button onClick={() => onCreateInvoice(client.id)} className="px-2 py-1 text-xs chip-neutral rounded-md">Facturer</button>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Speed-dial Floating Action Button */}
      {(onCreateNew || onImportCsv || onExport) && (
        <>
          {/* Overlay to close when open */}
          {fabOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/10" 
              onClick={() => setFabOpen(false)}
            />
          )}

          {/* Hidden file input for CSV */}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            id="clients-import-csv-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onImportCsv) onImportCsv(file);
              // reset input so selecting same file again still triggers change
              e.currentTarget.value = '';
              setFabOpen(false);
            }}
          />

          {/* Action items */}
          <div className="fixed bottom-6 right-3 sm:right-4 md:right-5 z-40 flex flex-col items-end gap-3">
            {/* Export */}
            {onExport && (
              <button
                onClick={() => { onExport(); setFabOpen(false); }}
                className={`h-10 px-3 rounded-full shadow-md flex items-center gap-2 transition-all origin-bottom-right
                           ${fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                           btn-theme-primary`}
                aria-label="Exporter les clients"
                title="Exporter clients"
              >
                <Download className="w-4 h-4 hidden sm:inline-block" />
                <span className="text-sm">Exporter</span>
              </button>
            )}

            {/* Import CSV */}
            {onImportCsv && (
              <button
                onClick={() => document.getElementById('clients-import-csv-input')?.click()}
                className={`h-10 px-3 rounded-full shadow-md flex items-center gap-2 transition-all origin-bottom-right
                           ${fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                           btn-theme-primary`}
                aria-label="Importer CSV"
                title="Importer CSV"
              >
                <Upload className="w-4 h-4 hidden sm:inline-block" />
                <span className="text-sm">Importer CSV</span>
              </button>
            )}

            {/* Nouveau client */}
            {onCreateNew && (
              <button
                onClick={() => { onCreateNew(); setFabOpen(false); }}
                className={`h-10 px-3 rounded-full shadow-md flex items-center gap-2 transition-all origin-bottom-right
                           ${fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                           btn-theme-primary`}
                aria-label="Nouveau client"
                title="Nouveau client"
              >
                <UserPlus className="w-4 h-4 hidden sm:inline-block" />
                <span className="text-sm">Nouveau</span>
              </button>
            )}

            {/* Main FAB */}
            <button
              onClick={() => setFabOpen(v => !v)}
              className={`h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-all relative
                         btn-theme-primary hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2
                         ${highlightFab && !fabOpen ? 'animate-bounce ring-4 ring-blue-300/60 shadow-blue-400/40' : ''}`}
              aria-label="Actions"
              title="Actions"
            >
              {highlightFab && !fabOpen && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-30 animate-ping" />
              )}
              <Plus className={`w-5 h-5 transition-transform ${fabOpen ? 'rotate-45' : ''}`} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
