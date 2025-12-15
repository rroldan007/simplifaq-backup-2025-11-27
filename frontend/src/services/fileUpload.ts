import { api } from './api';

export interface FileUploadResponse {
  success: boolean;
  url: string;
  message?: string;
}

export const fileUploadService = {
  uploadLogo: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Laisser le navigateur définir le Content-Type (boundary) pour multipart/form-data
    // Ne pas définir 'Content-Type' manuellement pour éviter les conflits
    const response = await api.upload('/upload/logo', formData, {
      headers: {},
    });
    
    if (!response.success || !(response.data as { url: string })?.url) {
      // Message d'erreur clair en français
      throw new Error(response.message || "Échec du téléversement du logo");
    }
    // Normaliser l'URL: le backend renvoie une URL relative (/uploads/...) 
    // Pour l'afficher côté frontend (port 3000), il faut l'URL absolue du backend (port 3001)
    const rawUrl: string = (response.data as { url: string }).url;
    if (/^https?:\/\//i.test(rawUrl)) {
      return rawUrl;
    }
    const rawBase = import.meta.env?.VITE_API_URL as string | undefined;
    let filesBase: string;
    if (rawBase && typeof rawBase === 'string' && rawBase.length > 0) {
      const trimmed = rawBase.replace(/\/$/, '');
      filesBase = trimmed.endsWith('/api') ? trimmed.replace(/\/api$/, '') : trimmed;
    } else {
      filesBase = `https://${window.location.hostname}`;
    }
    const absoluteUrl = `${filesBase}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
    return absoluteUrl;
  },
};
