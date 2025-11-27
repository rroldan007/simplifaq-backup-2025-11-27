import React, { useState } from 'react';
import { Mail, Building2, CheckSquare, Star, AlertCircle, Send, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://test.simplifaq.ch/api';

export function FeedbackPage() {
  const [formData, setFormData] = useState({
    email: '',
    secteur: '',
    secteurAutre: '',
    realisations: [] as string[],
    simplicite: 0,
    probleme: null as boolean | null,
    detailProbleme: '',
    amelioration: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const secteurs = [
    'Indépendant / micro-entreprise',
    'Commerce / Vente',
    'Services',
    'Fiduciaire / Comptabilité',
    'Autre'
  ];

  const realisationOptions = [
    'Créer une facture QR',
    'Ajouter des dépenses',
    'Déclarer la TVA',
    'Autres'
  ];

  const handleCheckbox = (value: string) => {
    setFormData(prev => ({
      ...prev,
      realisations: prev.realisations.includes(value)
        ? prev.realisations.filter(r => r !== value)
        : [...prev.realisations, value]
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.email || !formData.secteur || formData.realisations.length === 0 || 
        formData.simplicite === 0 || formData.probleme === null) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    // Validation pour "Autre"
    if (formData.secteur === 'Autre' && !formData.secteurAutre.trim()) {
      alert('Veuillez préciser votre secteur d\'activité');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setSubmitted(true);
      } else {
        alert(result.error?.message || 'Erreur lors de l\'envoi. Veuillez réessayer.');
        console.error('Erreur:', result.error);
      }
    } catch (error) {
      alert('Erreur de connexion. Vérifiez votre connexion internet.');
      console.error('Erreur:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-12 max-w-md text-center border border-purple-100">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <Sparkles className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent mb-3">
            Merci beaucoup !
          </h2>
          <p className="text-gray-600 leading-relaxed">
            Votre feedback est précieux pour nous. Vos données sont stockées en toute sécurité en Suisse 🇨🇭
          </p>
          <a 
            href="https://test.simplifaq.ch" 
            className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all"
          >
            Retour à SimpliFaq
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 py-12 px-4">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>

      <div className="max-w-3xl mx-auto">
        {/* Header avec logo */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="inline-block bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-6 shadow-lg border border-purple-100 mb-6">
            <div className="text-5xl font-bold text-white" style={{fontFamily: 'system-ui, sans-serif', letterSpacing: '-1px'}}>
              SimpliFaq
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-3">
            Feedback Bêta
          </h1>
          <p className="text-gray-600 text-lg">
            Votre avis compte ! Prenez 2 minutes pour nous aider à améliorer SimpliFaq ✨
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-10 border border-purple-100">
          <div className="space-y-8">
            {/* Question 1: Email */}
            <div className="group">
              <label className="flex items-center text-sm font-bold text-gray-800 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mr-3">
                  <Mail className="w-4 h-4 text-purple-600" />
                </div>
                Email <span className="text-purple-500 ml-1">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-5 py-4 border-2 border-purple-100 rounded-2xl focus:ring-4 focus:ring-purple-200 focus:border-purple-400 transition-all bg-white/50"
                placeholder="votre@email.ch"
              />
            </div>

            {/* Question 2: Secteur */}
            <div className="group">
              <label className="flex items-center text-sm font-bold text-gray-800 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mr-3">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                Secteur d'activité <span className="text-purple-500 ml-1">*</span>
              </label>
              <select
                required
                value={formData.secteur}
                onChange={(e) => setFormData({...formData, secteur: e.target.value, secteurAutre: ''})}
                className="w-full px-5 py-4 border-2 border-purple-100 rounded-2xl focus:ring-4 focus:ring-purple-200 focus:border-purple-400 transition-all bg-white/50"
              >
                <option value="">Sélectionnez votre secteur...</option>
                {secteurs.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              
              {formData.secteur === 'Autre' && (
                <div className="mt-3 animate-fadeIn">
                  <input
                    type="text"
                    value={formData.secteurAutre}
                    onChange={(e) => setFormData({...formData, secteurAutre: e.target.value})}
                    className="w-full px-5 py-4 border-2 border-blue-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all bg-blue-50/50"
                    placeholder="Précisez votre secteur d'activité..."
                  />
                </div>
              )}
            </div>

            {/* Question 3: Réalisations */}
            <div className="group">
              <label className="flex items-center text-sm font-bold text-gray-800 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mr-3">
                  <CheckSquare className="w-4 h-4 text-purple-600" />
                </div>
                Qu'avez-vous réussi à faire dans SimpliFaq ? <span className="text-purple-500 ml-1">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {realisationOptions.map(option => (
                  <div
                    key={option}
                    onClick={() => handleCheckbox(option)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.realisations.includes(option)
                        ? 'bg-gradient-to-br from-purple-100 to-blue-100 border-purple-300 shadow-lg'
                        : 'bg-white/50 border-purple-100 hover:border-purple-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mr-3 transition-all ${
                        formData.realisations.includes(option)
                          ? 'bg-purple-500 border-purple-500'
                          : 'border-purple-300'
                      }`}>
                        {formData.realisations.includes(option) && (
                          <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                      <span className="text-gray-700 font-medium">{option}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Question 4: Échelle de simplicité */}
            <div className="group">
              <label className="flex items-center text-sm font-bold text-gray-800 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mr-3">
                  <Star className="w-4 h-4 text-blue-600" />
                </div>
                À quel point SimpliFaq est simple à utiliser ? <span className="text-purple-500 ml-1">*</span>
              </label>
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 border-2 border-purple-100">
                <div className="flex items-center justify-center space-x-3">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormData({...formData, simplicite: num})}
                      onMouseEnter={() => setHoverStar(num)}
                      onMouseLeave={() => setHoverStar(0)}
                      className="transition-all hover:scale-125 active:scale-95"
                    >
                      <Star
                        className={`w-12 h-12 transition-all ${
                          num <= (hoverStar || formData.simplicite)
                            ? 'fill-purple-400 text-purple-400 drop-shadow-lg'
                            : 'text-purple-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-4 px-2 font-medium">
                  <span>😕 Pas simple</span>
                  <span>😊 Très simple</span>
                </div>
              </div>
            </div>

            {/* Question 5: Problème */}
            <div className="group">
              <label className="flex items-center text-sm font-bold text-gray-800 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mr-3">
                  <AlertCircle className="w-4 h-4 text-purple-600" />
                </div>
                Avez-vous rencontré un problème ou un blocage ? <span className="text-purple-500 ml-1">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => setFormData({...formData, probleme: true, amelioration: ''})}
                  className={`p-5 border-2 rounded-xl cursor-pointer transition-all text-center font-semibold text-gray-700 ${
                    formData.probleme === true
                      ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200 shadow-lg'
                      : 'bg-white/50 border-purple-100 hover:border-purple-200 hover:shadow-md'
                  }`}
                >
                  Oui
                </div>
                <div
                  onClick={() => setFormData({...formData, probleme: false, detailProbleme: ''})}
                  className={`p-5 border-2 rounded-xl cursor-pointer transition-all text-center font-semibold text-gray-700 ${
                    formData.probleme === false
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg'
                      : 'bg-white/50 border-purple-100 hover:border-purple-200 hover:shadow-md'
                  }`}
                >
                  Non
                </div>
              </div>
            </div>

            {/* Question 6: Détail du problème (si Oui) */}
            {formData.probleme === true && (
              <div className="animate-fadeIn bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-2xl border-2 border-red-100">
                <label className="text-sm font-bold text-gray-800 mb-3 block">
                  Précisez ce qui n'a pas fonctionné ou ce qui n'était pas clair
                </label>
                <textarea
                  value={formData.detailProbleme}
                  onChange={(e) => setFormData({...formData, detailProbleme: e.target.value})}
                  rows={4}
                  className="w-full px-5 py-4 border-2 border-red-200 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-300 transition-all bg-white/70"
                  placeholder="Décrivez le problème rencontré..."
                />
              </div>
            )}

            {/* Question 7: Amélioration (si Non) */}
            {formData.probleme === false && (
              <div className="animate-fadeIn bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-100">
                <label className="text-sm font-bold text-gray-800 mb-3 block">
                  Si vous pouviez améliorer UNE seule chose, ce serait quoi ?
                </label>
                <textarea
                  value={formData.amelioration}
                  onChange={(e) => setFormData({...formData, amelioration: e.target.value})}
                  rows={4}
                  className="w-full px-5 py-4 border-2 border-green-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-300 transition-all bg-white/70"
                  placeholder="Votre suggestion d'amélioration..."
                />
              </div>
            )}

            {/* Bouton Submit */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 hover:from-purple-600 hover:via-blue-600 hover:to-purple-600 text-white font-bold py-5 px-8 rounded-2xl flex items-center justify-center space-x-3 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              <span className="text-lg">{isSubmitting ? 'Envoi en cours...' : 'Envoyer mes réponses'}</span>
            </button>

            {/* Note RGPD/LPD */}
            <div className="text-center pt-4">
              <p className="text-xs text-gray-500 inline-flex items-center justify-center bg-white/50 px-4 py-2 rounded-full border border-purple-100">
                🇨🇭 Données stockées en Suisse • Conformité LPD • Suppression sur demande
              </p>
            </div>
          </div>
        </div>

        {/* Footer Legal */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>© 2025 SimpliFaq – Projet développé par Patricia Roldán Boyrie (responsable du traitement)</p>
          <p className="mt-1">Genève, Suisse – <a href="mailto:contact@simplifaq.ch" className="text-purple-600 hover:underline">contact@simplifaq.ch</a></p>
        </div>
      </div>
    </div>
  );
}
