import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Upload } from 'lucide-react';
import { api } from '../../../services/api';

interface LogoStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function LogoStep({ onComplete, onSkip }: LogoStepProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const dataLoadedRef = useRef(false);

  useEffect(() => {
    if (!dataLoadedRef.current) {
      loadExistingLogo();
      dataLoadedRef.current = true;
    }
  }, []);

  const loadExistingLogo = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/me');
      const userData = response.data.data as { user?: { logoUrl?: string } };
      const user = userData.user || {};
      if (user.logoUrl) {
        // Build full URL for logo - logoUrl from backend is relative path like "uploads/logos/..."
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const baseUrl = apiUrl.replace(/\/api$/, '');
        const logoUrl = user.logoUrl.startsWith('http') 
          ? user.logoUrl 
          : `${baseUrl}/${user.logoUrl.replace(/^\//, '')}`;
        setPreview(logoUrl);
      }
    } catch (err) {
      console.error('Error loading logo:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('L\'image ne doit pas dépasser 5MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use api.upload for FormData - api.post tries to JSON.stringify which breaks multipart/form-data
      const response = await api.upload('/upload/logo', formData);

      // Backend returns { success: true, data: { url, logoUrl, filename, ... } }
      const logoUrl = (response.data as any)?.url || (response.data as any)?.logoUrl;
      
      if (!logoUrl) {
        throw new Error('Logo URL not received from server');
      }
      
      // Build full URL - logoUrl from backend is relative like "uploads/logos/..."
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      // Remove /api suffix if present to get the base server URL
      const baseUrl = apiUrl.replace(/\/api$/, '');
      const fullUrl = logoUrl.startsWith('http') 
        ? logoUrl 
        : `${baseUrl}/${logoUrl.replace(/^\//, '')}`;
      
      setPreview(fullUrl);
      setUploading(false);
    } catch (err: unknown) {
      console.error('Logo upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du téléchargement';
      setError(errorMessage);
      setUploading(false);
    }
  };

  const handleContinue = () => {
    if (preview) {
      onComplete();
    } else {
      onSkip();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        {preview 
          ? "Votre logo actuel. Vous pouvez le changer ou continuer avec celui-ci."
          : "Ajoutez le logo de votre entreprise. Il apparaîtra sur vos factures et devis. Vous pouvez passer cette étape et l'ajouter plus tard."
        }
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center justify-center gap-4">
        {preview ? (
          <>
            <div className="relative">
              <img
                src={preview}
                alt="Logo preview"
                className="max-w-xs max-h-48 object-contain border-2 border-gray-200 rounded-lg p-4"
              />
            </div>
            <label className="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
              Changer le logo
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </>
        ) : (
          <label className="w-full max-w-md cursor-pointer">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-indigo-500 transition-colors">
              {uploading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  <p className="mt-4 text-gray-600">Téléchargement...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    Cliquez pour télécharger ou glissez-déposez
                  </p>
                  <p className="text-sm text-gray-500">
                    PNG, JPG, SVG jusqu'à 5MB
                  </p>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onSkip}
          className="px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors font-medium"
        >
          Passer cette étape
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={uploading}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Continuer
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
