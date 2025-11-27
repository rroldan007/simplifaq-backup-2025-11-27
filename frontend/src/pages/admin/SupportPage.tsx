/**
 * 🇨🇭 SimpliFaq - Admin Support Page
 * 
 * Support ticket system and knowledge base for admin
 */

import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

interface SupportTicket {
  id: string;
  userEmail: string;
  userCompany: string;
  subject: string;
  description?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

export const SupportPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: '1',
      userEmail: 'user1@example.com',
      userCompany: 'Entreprise A',
      subject: 'Problème avec les factures',
      description: 'Je rencontre un problème lors de la génération des factures PDF.',
      status: 'open',
      priority: 'medium',
      createdAt: '2025-09-17T10:00:00Z',
      updatedAt: '2025-09-17T10:00:00Z',
    },
    {
      id: '2',
      userEmail: 'user2@example.com',
      userCompany: 'Entreprise B',
      subject: 'Erreur lors de l\'envoi d\'email',
      description: 'Les emails ne s\'envoient pas depuis hier.',
      status: 'in_progress',
      priority: 'high',
      createdAt: '2025-09-16T15:30:00Z',
      updatedAt: '2025-09-17T09:00:00Z',
    },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    userEmail: '',
    userCompany: '',
  });

  const getStatusBadge = (status: string) => {
    const colors = {
      open: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      open: 'Ouvert',
      in_progress: 'En cours',
      resolved: 'Résolu',
      closed: 'Fermé',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };

    const labels = {
      low: 'Faible',
      medium: 'Moyen',
      high: 'Élevé',
      urgent: 'Urgent',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {labels[priority as keyof typeof labels] || priority}
      </span>
    );
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.userCompany.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleCreateTicket = () => {
    if (!formData.subject || !formData.userEmail || !formData.userCompany) {
      alert('Veuillez remplir tous les champs requis.');
      return;
    }

    const newTicket: SupportTicket = {
      id: (tickets.length + 1).toString(),
      userEmail: formData.userEmail,
      userCompany: formData.userCompany,
      subject: formData.subject,
      description: formData.description,
      status: 'open',
      priority: formData.priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTickets(prev => [...prev, newTicket]);
    setShowCreateModal(false);
    setFormData({
      subject: '',
      description: '',
      priority: 'medium',
      userEmail: '',
      userCompany: '',
    });
  };

  const handleViewTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setShowViewModal(true);
  };

  const handleStatusChange = (ticketId: string, newStatus: SupportTicket['status']) => {
    setTickets(prev => prev.map(ticket => 
      ticket.id === ticketId 
        ? { ...ticket, status: newStatus, updatedAt: new Date().toISOString() }
        : ticket
    ));
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Support</h1>
        <Button onClick={() => setShowCreateModal(true)}>Nouveau Ticket</Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary">
            Tickets de Support
          </h2>
          <Button variant="outline" size="sm">
            Actualiser
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="open">Ouvert</option>
            <option value="in_progress">En cours</option>
            <option value="resolved">Résolu</option>
            <option value="closed">Fermé</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes les priorités</option>
            <option value="low">Faible</option>
            <option value="medium">Moyen</option>
            <option value="high">Élevé</option>
            <option value="urgent">Urgent</option>
          </select>
          <div className="text-sm text-secondary flex items-center">
            {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Tickets Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border-primary)]">
            <thead className="surface-elevated">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Priorité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Créé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-primary)]">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-[var(--color-bg-secondary)]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-primary">
                        #{ticket.id}
                      </div>
                      <div className="text-sm text-secondary">{ticket.subject}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-primary">
                        {ticket.userEmail}
                      </div>
                      <div className="text-sm text-secondary">{ticket.userCompany}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPriorityBadge(ticket.priority)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(ticket.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {new Date(ticket.createdAt).toLocaleDateString('fr-CH')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button 
                      className="text-blue-600 hover:text-blue-900"
                      onClick={() => handleViewTicket(ticket)}
                    >
                      Voir
                    </button>
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value as SupportTicket['status'])}
                      className="px-2 py-1 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="open">Ouvert</option>
                      <option value="in_progress">En cours</option>
                      <option value="resolved">Résolu</option>
                      <option value="closed">Fermé</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTickets.length === 0 && (
          <div className="text-center text-secondary py-8">
            <p>Aucun ticket trouvé</p>
          </div>
        )}
      </Card>

      {/* Knowledge Base Section */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-primary mb-4">
          Base de Connaissances
        </h2>
        <p className="text-secondary">
          Articles d'aide et guides pour les utilisateurs. Fonctionnalité à développer.
        </p>
        <div className="mt-4">
          <Button variant="outline">Gérer la Base de Connaissances</Button>
        </div>
      </Card>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Nouveau Ticket de Support"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Email de l'utilisateur *
              </label>
              <Input
                type="email"
                value={formData.userEmail}
                onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Entreprise *
              </label>
              <Input
                type="text"
                value={formData.userCompany}
                onChange={(e) => setFormData({ ...formData, userCompany: e.target.value })}
                placeholder="Nom de l'entreprise"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Sujet *
              </label>
              <Input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Sujet du ticket"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description détaillée du problème"
                className="w-full px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Priorité
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as SupportTicket['priority'] })}
                className="w-full px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Faible</option>
                <option value="medium">Moyen</option>
                <option value="high">Élevé</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="outline"
              >
                Annuler
              </Button>
              <Button onClick={handleCreateTicket}>
                Créer Ticket
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Ticket Modal */}
      {showViewModal && selectedTicket && (
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title={`Ticket #${selectedTicket.id} - ${selectedTicket.subject}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-secondary">Utilisateur:</span>
                <div className="text-sm text-primary">{selectedTicket.userEmail}</div>
                <div className="text-sm text-secondary">{selectedTicket.userCompany}</div>
              </div>
              <div>
                <span className="text-sm font-medium text-secondary">Priorité:</span>
                <div className="mt-1">{getPriorityBadge(selectedTicket.priority)}</div>
              </div>
              <div>
                <span className="text-sm font-medium text-secondary">Statut:</span>
                <div className="mt-1">{getStatusBadge(selectedTicket.status)}</div>
              </div>
              <div>
                <span className="text-sm font-medium text-secondary">Créé:</span>
                <div className="text-sm text-primary">
                  {new Date(selectedTicket.createdAt).toLocaleString('fr-CH')}
                </div>
              </div>
            </div>

            {selectedTicket.description && (
              <div>
                <span className="text-sm font-medium text-secondary">Description:</span>
                <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                  {selectedTicket.description}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => setShowViewModal(false)}
                variant="outline"
              >
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};