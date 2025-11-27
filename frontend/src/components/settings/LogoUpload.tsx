import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Image } from 'lucide-react';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { authInterceptor } from '../../services/authInterceptor';
import { useAuth } from '../../hooks/useAuth';

function buildApiBase(): string {
  const raw = import.meta.env?.VITE_API_URL as string | undefined;
  if (raw && raw.length > 0) {
    const trimmed = raw.replace(/\/$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return `/api`;
}

const API_BASE_URL = buildApiBase();
const SERVER_BASE_URL = API_BASE_URL.replace('/api', '');

interface LogoUploadProps {
  currentLogoUrl?: string | null;
  className?: string;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({
  currentLogoUrl,
  className = ''
}) => {
  const { user, updateUser } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const src = currentLogoUrl || (user as any)?.logoUrl || (user as any)?.logo_path || (user as any)?.logoPath || '';
    if (src) {
      const url = src.startsWith('http') ? src : `${SERVER_BASE_URL}/${src.replace(/^\//, '')}`;
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }, [currentLogoUrl, user]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('Seuls les fichiers PNG, JPG, JPEG et SVG sont autorisés');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Le fichier ne doit pas dépasser 5MB');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const requestConfig = {
        url: `${API_BASE_URL}/logo/upload`,
        method: 'POST',
        body: formData
      };

      const interceptedConfig = await authInterceptor.interceptRequest(requestConfig);
      const response = await fetch(interceptedConfig.url!, {
        method: interceptedConfig.method,
        headers: interceptedConfig.headers,
        body: interceptedConfig.body
      });

      const processedResponse = await authInterceptor.interceptResponse(response, interceptedConfig);
      
      if (!processedResponse.ok) {
        const errorData = await processedResponse.json();
        throw new Error(errorData.error || 'Erreur lors du téléchargement');
      }

      const data = await processedResponse.json();
      setSuccess('Logo téléchargé avec succès');
      // Update preview immediately from response
      if (data && typeof data.logoUrl === 'string' && data.logoUrl.length > 0) {
        const src: string = data.logoUrl;
        const url = src.startsWith('http') ? src : `${SERVER_BASE_URL}/${src.replace(/^\//, '')}`;
        setPreviewUrl(url);
      }
      if (user && data.user) {
        const u = data.user as any;
        const normalized = {
          ...u,
          address: {
            street: u.address?.street ?? u.street ?? '',
            postalCode: u.address?.postalCode ?? u.postalCode ?? '',
            city: u.address?.city ?? u.city ?? '',
            canton: u.address?.canton ?? u.canton ?? '',
            country: u.address?.country ?? u.country ?? '',
          },
        };
        updateUser(normalized);
      }
      console.info('[LOGO] Upload successful', { logoUrl: data.logoUrl });

    } catch (err) {
      console.error('[LOGO] Upload failed', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setError(null);
    setSuccess(null);
    setIsUploading(true);

    try {
      const requestConfig = {
        url: `${API_BASE_URL}/logo/current`,
        method: 'DELETE'
      };

      const interceptedConfig = await authInterceptor.interceptRequest(requestConfig);
      const response = await fetch(interceptedConfig.url!, {
        method: interceptedConfig.method,
        headers: interceptedConfig.headers
      });

      const processedResponse = await authInterceptor.interceptResponse(response, interceptedConfig);
      
      if (!processedResponse.ok) {
        const errorData = await processedResponse.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      const data = await processedResponse.json();
      setSuccess('Logo supprimé avec succès');
      // Clear preview immediately
      setPreviewUrl(null);
      if (user && data.user) {
        const u = data.user as any;
        const normalized = {
          ...u,
          address: {
            street: u.address?.street ?? u.street ?? '',
            postalCode: u.address?.postalCode ?? u.postalCode ?? '',
            city: u.address?.city ?? u.city ?? '',
            canton: u.address?.canton ?? u.canton ?? '',
            country: u.address?.country ?? u.country ?? '',
          },
        };
        updateUser(normalized);
      }

      console.info('[LOGO] Logo removed successfully');

    } catch (err) {
      console.error('[LOGO] Remove failed', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Logo de l'entreprise</h3>
        {previewUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveLogo}
            disabled={isUploading}
            className="text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4 mr-1" />
            Supprimer
          </Button>
        )}
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        {previewUrl ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-32 h-32 border border-gray-200 rounded-lg overflow-hidden bg-white flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Logo de l'entreprise"
                className="max-w-full max-h-full object-contain"
                onError={() => {
                  console.warn('[LOGO] Failed to load preview image');
                  setPreviewUrl(null);
                }}
              />
            </div>
            <p className="text-sm text-gray-600">Logo actuel</p>
            <div className="text-xs text-gray-500 break-all text-center">
              <span className="mr-1">URL:</span>
              <a href={previewUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{previewUrl}</a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-32 h-32 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center">
              <Image className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600">Aucun logo téléchargé</p>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleUploadClick}
          disabled={isUploading}
          className="flex items-center space-x-2"
        >
          <Upload className="w-4 h-4" />
          <span>{isUploading ? 'Téléchargement...' : previewUrl ? 'Changer le logo' : 'Télécharger un logo'}</span>
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {success && (
        <Alert variant="success">{success}</Alert>
      )}

      <div className="text-sm text-gray-500 space-y-1">
        <p>• Formats acceptés: PNG, JPG, JPEG, SVG</p>
        <p>• Taille maximale: 5MB</p>
        <p>• Le logo apparaîtra sur vos factures et documents</p>
      </div>
    </div>
  );
};

export default LogoUpload;
