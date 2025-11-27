import React, { useState, useMemo, useEffect } from 'react';
import { ClientCard } from './ClientCard';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface Client {
  id: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    canton?: string;
  };
  vatNumber?: string;
  language: 'de' | 'fr' | 'it' | 'en';
  paymentTerms: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientListProps {
  clients: Client[];
  loading?: boolean;
  error?: string | null;
  onView?: (clientId: string) => void;
  onEdit?: (clientId: string) => void;
  onDelete?: (clientId: string) => void;
  onCreateInvoice?: (clientId: string) => void;
  onCreateNew?: () => void;
}

type ClientFilter = 'all' | 'active' | 'inactive' | 'companies' | 'individuals';
type SortBy = 'name' | 'email' | 'city' | 'created' | 'paymentTerms';

export function ClientList({
  clients,
  loading = false,
  error = null,
  onView,
  onEdit,
  onDelete,
  onCreateInvoice,
  onCreateNew
}: ClientListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<ClientFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem('clients_view_mode') as 'grid' | 'list') || 'grid'
  );
  useEffect(() => { try { localStorage.setItem('clients_view_mode', viewMode); } catch {} }, [viewMode]);

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
          (client.address?.city || '').toLowerCase().includes(query) ||
          (client.vatNumber || '').toLowerCase().includes(query) ||
          (client.phone || '').includes(query)
        );
      });
    }

    // Sort clients
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name': {
          const nameA = (a.companyName || [a.firstName, a.lastName].filter(Boolean).join(' '));
          const nameB = (b.companyName || [b.firstName, b.lastName].filter(Boolean).join(' '));
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case 'email':
          comparison = (a.email || '').localeCompare(b.email || '');
          break;
        case 'city':
          comparison = (a.address?.city || '').localeCompare(b.address?.city || '');
          break;
        case 'created':
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
        case 'paymentTerms':
          comparison = a.paymentTerms - b.paymentTerms;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [clients, searchQuery, selectedFilter, sortBy, sortOrder]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    return {
      all: clients.length,
      active: clients.filter(c => c.isActive).length,
      inactive: clients.filter(c => !c.isActive).length,
      companies: clients.filter(c => !!c.companyName).length,
      individuals: clients.filter(c => !c.companyName).length
    };
  }, [clients]);

  const handleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortBy) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'asc' ? '↗️' : '↘️';
  };

  const filterOptions = [
    { value: 'all' as const, label: 'Tous les clients', count: filterCounts.all },
    { value: 'active' as const, label: 'Actifs', count: filterCounts.active },
    { value: 'inactive' as const, label: 'Inactifs', count: filterCounts.inactive },
    { value: 'companies' as const, label: 'Entreprises', count: filterCounts.companies },
    { value: 'individuals' as const, label: 'Particuliers', count: filterCounts.individuals }
  ];

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          Erreur de chargement
        </h3>
        <p className="text-slate-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Réessayer
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barre de recherche */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-slate-400 text-sm">🔍</span>
        </div>
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom, email, ville, téléphone ou n° TVA..."
          className="pl-10"
        />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedFilter(option.value)}
            className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedFilter === option.value
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {option.label}
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
              selectedFilter === option.value
                ? 'bg-blue-200 text-blue-800'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {/* Options de tri */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-slate-600">Trier par :</span>
          <div className="flex space-x-2">
            {[
              { key: 'name' as const, label: 'Nom' },
              { key: 'email' as const, label: 'Email' },
              { key: 'city' as const, label: 'Ville' },
              { key: 'created' as const, label: 'Date création' },
              { key: 'paymentTerms' as const, label: 'Conditions' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSort(key)}
                className={`inline-flex items-center px-3 py-1 text-sm rounded-md transition-colors ${
                  sortBy === key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
                <span className="ml-1">{getSortIcon(key)}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="inline-flex shrink-0 whitespace-nowrap rounded-md border border-slate-300 divide-x divide-slate-300">
            <button type="button" onClick={() => viewMode!=='grid' && setViewMode('grid')} className={`px-3 py-2 text-sm w-20 ${viewMode==='grid' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Grille</button>
            <button type="button" onClick={() => viewMode!=='list' && setViewMode('list')} className={`px-3 py-2 text-sm w-20 ${viewMode==='list' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Liste</button>
          </div>
          <div className="text-sm text-slate-600">
            {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
            {searchQuery && ` trouvé${filteredClients.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* Liste des clients */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredClients.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">👥</span>
          </div>
          
          {searchQuery || selectedFilter !== 'all' ? (
            <>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Aucun client trouvé
              </h3>
              <p className="text-slate-600 mb-6">
                Aucun client ne correspond à vos critères de recherche.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFilter('all');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Effacer les filtres
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Aucun client
              </h3>
              <p className="text-slate-600 mb-6">
                Vous n'avez pas encore ajouté de clients.
              </p>
              {onCreateNew && (
                <button
                  onClick={onCreateNew}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ajouter votre premier client
                </button>
              )}
            </>
          )}
        </Card>
      ) : (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                onCreateInvoice={onCreateInvoice}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Nom</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Ville</th>
                  <th className="px-3 py-2 text-left">Statut</th>
                  <th className="px-3 py-2 text-left">Conditions</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const name = client.companyName || [client.firstName, client.lastName].filter(Boolean).join(' ');
                  const status = client.isActive ? 'Actif' : 'Inactif';
                  return (
                    <tr key={client.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-3 py-2">{name}</td>
                      <td className="px-3 py-2">{client.email}</td>
                      <td className="px-3 py-2">{client.address?.city || '—'}</td>
                      <td className="px-3 py-2">{status}</td>
                      <td className="px-3 py-2">{client.paymentTerms} jours</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-2">
                          {onView && <button onClick={() => onView(client.id)} className="px-2 py-1 text-xs border rounded-md">Voir</button>}
                          {onEdit && <button onClick={() => onEdit(client.id)} className="px-2 py-1 text-xs border rounded-md">Modifier</button>}
                          {onCreateInvoice && <button onClick={() => onCreateInvoice(client.id)} className="px-2 py-1 text-xs border rounded-md">Facture</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}