import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface Feedback {
  id: string;
  email: string;
  secteur: string;
  secteurAutre?: string;
  realisations: string[];
  simplicite: number;
  probleme: boolean;
  detailProbleme?: string;
  amelioration?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string;
  };
}

interface FeedbackStats {
  total: number;
  averageSimplicite: number;
  withProblems: number;
  problemRate: string;
  secteurs: { secteur: string; count: number }[];
  realisations: { name: string; count: number }[];
}

export const FeedbacksPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [secteurFilter, setSecteurFilter] = useState('');
  const [problemeFilter, setProblemeFilter] = useState<string>('');
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });

  const API_BASE = import.meta.env.VITE_API_URL || '/api';

  const loadStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_BASE}/feedback/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [API_BASE]);

  const loadFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (secteurFilter) params.append('secteur', secteurFilter);
      if (problemeFilter) params.append('probleme', problemeFilter);

      const response = await axios.get(`${API_BASE}/feedback?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setFeedbacks(response.data.data.feedbacks);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, pagination.page, pagination.limit, secteurFilter, problemeFilter]);

  useEffect(() => {
    loadStats();
    loadFeedbacks();
  }, [loadStats, loadFeedbacks]);

  const getStarRating = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
        <h1 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
          <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          Feedbacks Beta
        </h1>
        <p className="text-slate-600">
          Retours d'expérience des utilisateurs beta
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">Total Feedbacks</h3>
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">Note Moyenne</h3>
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-slate-800">
              {stats.averageSimplicite.toFixed(1)}/5
            </div>
            <div className="text-sm text-yellow-500 mt-1">
              {getStarRating(Math.round(stats.averageSimplicite))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">Avec Problèmes</h3>
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-slate-800">{stats.withProblems}</div>
            <div className="text-sm text-red-600 mt-1">
              {stats.problemRate}% des feedbacks
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">Secteur Principal</h3>
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            {stats.secteurs.length > 0 && (
              <>
                <div className="text-xl font-bold text-slate-800 truncate">
                  {stats.secteurs[0].secteur}
                </div>
                <div className="text-sm text-green-600 mt-1">
                  {stats.secteurs[0].count} utilisateurs
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Filtres</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Secteur
            </label>
            <select
              value={secteurFilter}
              onChange={(e) => {
                setSecteurFilter(e.target.value);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les secteurs</option>
              {stats?.secteurs.map(s => (
                <option key={s.secteur} value={s.secteur}>
                  {s.secteur} ({s.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Problèmes
            </label>
            <select
              value={problemeFilter}
              onChange={(e) => {
                setProblemeFilter(e.target.value);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous</option>
              <option value="true">Avec problèmes</option>
              <option value="false">Sans problèmes</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSecteurFilter('');
                setProblemeFilter('');
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="w-full px-4 py-2 border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Feedbacks Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Secteur
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Note
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Problème
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Chargement...
                  </td>
                </tr>
              ) : feedbacks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Aucun feedback trouvé
                  </td>
                </tr>
              ) : (
                feedbacks.map((feedback) => (
                  <tr key={feedback.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {formatDate(feedback.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-800">
                        {feedback.user ? (
                          <>
                            {feedback.user.firstName} {feedback.user.lastName}
                            <div className="text-xs text-slate-500">{feedback.user.companyName}</div>
                          </>
                        ) : (
                          <span className="text-slate-500">Invité</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{feedback.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {feedback.secteur}
                      {feedback.secteurAutre && (
                        <div className="text-xs text-slate-500">{feedback.secteurAutre}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-800">{feedback.simplicite}/5</span>
                        <span className="text-yellow-500">{getStarRating(feedback.simplicite)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {feedback.probleme ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Oui
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Non
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => setSelectedFeedback(feedback)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Voir détails
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Page {pagination.page} sur {pagination.totalPages} ({pagination.totalCount} feedbacks)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Détails du Feedback</h2>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-3">Informations Utilisateur</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Email:</strong> {selectedFeedback.email}</div>
                  {selectedFeedback.user && (
                    <>
                      <div><strong>Nom:</strong> {selectedFeedback.user.firstName} {selectedFeedback.user.lastName}</div>
                      <div><strong>Entreprise:</strong> {selectedFeedback.user.companyName}</div>
                    </>
                  )}
                  <div><strong>Date:</strong> {formatDate(selectedFeedback.createdAt)}</div>
                </div>
              </div>

              {/* Secteur */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Secteur d'Activité</h3>
                <p className="text-slate-600">
                  {selectedFeedback.secteur}
                  {selectedFeedback.secteurAutre && ` - ${selectedFeedback.secteurAutre}`}
                </p>
              </div>

              {/* Realisations */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Ce qu'il a pu réaliser</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedFeedback.realisations.map((r, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Note de Simplicité</h3>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-slate-800">{selectedFeedback.simplicite}/5</span>
                  <span className="text-2xl text-yellow-500">{getStarRating(selectedFeedback.simplicite)}</span>
                </div>
              </div>

              {/* Probleme */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Problèmes Rencontrés</h3>
                {selectedFeedback.probleme ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 font-medium mb-2">⚠️ L'utilisateur a rencontré des problèmes</p>
                    {selectedFeedback.detailProbleme && (
                      <p className="text-red-700 text-sm">{selectedFeedback.detailProbleme}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-green-600">✓ Aucun problème signalé</p>
                )}
              </div>

              {/* Amelioration */}
              {selectedFeedback.amelioration && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">Suggestions d'Amélioration</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">{selectedFeedback.amelioration}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setSelectedFeedback(null)}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
