/**
 * Utility functions for handling asset URLs (logos, images, etc.)
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Converts a relative asset path to an absolute URL
 * @param relativePath - Relative path like "uploads/logos/logo-123.png"
 * @returns Absolute URL like "http://localhost:3001/uploads/logos/logo-123.png"
 */
export const getAssetUrl = (relativePath: string | null | undefined): string | null => {
  if (!relativePath) return null;
  
  // If already an absolute URL, return as-is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // Remove leading slash if present
  const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  
  // Construct absolute URL
  return `${API_BASE_URL}/${cleanPath}`;
};

/**
 * Gets the logo URL for display in previews and UI
 */
export const getLogoUrl = (logoUrl: string | null | undefined): string | null => {
  return getAssetUrl(logoUrl);
};
