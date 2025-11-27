// Utilitaires pour l'authentification

// Clés pour le stockage local
export const STORAGE_KEYS = {
  TOKEN: 'simplifaq_token',
  USER: 'simplifaq_user',
  REMEMBER_ME: 'simplifaq_remember_me',
} as const;

// Configuration de l'API
export const API_CONFIG = {
  BASE_URL: '/api',
  ENDPOINTS: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
  },
  TIMEOUT: 10000, // 10 secondes
} as const;

/**
 * Stocke le token d'authentification
 */
export function storeAuthToken(token: string, rememberMe: boolean = false): void {
  if (rememberMe) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
  } else {
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
  }
}

/**
 * Récupère le token d'authentification
 */
export function getAuthToken(): string | null {
  // Vérifier d'abord le localStorage (remember me)
  let token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (token) return token;
  
  // Puis vérifier le sessionStorage
  token = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
  return token;
}

/**
 * Supprime le token d'authentification
 */
export function removeAuthToken(): void {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
}

/**
 * Stocke les données utilisateur
 */
export function storeUserData(user: unknown): void {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

/**
 * Récupère les données utilisateur
 */
export function getUserData(): unknown | null {
  const userStr = localStorage.getItem(STORAGE_KEYS.USER);
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr) as unknown;
  } catch (error) {
    console.error('Erreur lors du parsing des données utilisateur:', error);
    localStorage.removeItem(STORAGE_KEYS.USER);
    return null;
  }
}

/**
 * Vérifie si le token est expiré
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Erreur lors de la vérification du token:', error);
    return true;
  }
}

/**
 * Crée les en-têtes d'authentification pour les requêtes API
 */
export function createAuthHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const authToken = token || getAuthToken();
  if (authToken && !isTokenExpired(authToken)) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
}

/**
 * Effectue une requête API authentifiée
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...createAuthHeaders(token),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  // Si le token est expiré, rediriger vers la connexion
  if (response.status === 401) {
    removeAuthToken();
    window.location.href = '/welcome';
    throw new Error('Session expirée');
  }

  return response;
}

/**
 * Valide le format d'un email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valide la force d'un mot de passe
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 4) {
    errors.push('Le mot de passe doit contenir au moins 4 caractères');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }

  if (!/\d/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valide un numéro de TVA suisse
 */
export function isValidSwissVAT(vatNumber: string): boolean {
  // Format: CHE-123.456.789 TVA ou CHE-123.456.789 MWST
  const vatRegex = /^CHE-\d{3}\.\d{3}\.\d{3}(\s+(TVA|MWST|IVA))?$/i;
  return vatRegex.test(vatNumber.trim());
}

/**
 * Valide un code postal suisse
 */
export function isValidSwissPostalCode(postalCode: string): boolean {
  // Les codes postaux suisses sont des nombres de 4 chiffres
  const postalCodeRegex = /^\d{4}$/;
  return postalCodeRegex.test(postalCode.trim());
}

/**
 * Liste des cantons suisses
 */
export const SWISS_CANTONS = [
  { code: 'AG', name: 'Argovie' },
  { code: 'AI', name: 'Appenzell Rhodes-Intérieures' },
  { code: 'AR', name: 'Appenzell Rhodes-Extérieures' },
  { code: 'BE', name: 'Berne' },
  { code: 'BL', name: 'Bâle-Campagne' },
  { code: 'BS', name: 'Bâle-Ville' },
  { code: 'FR', name: 'Fribourg' },
  { code: 'GE', name: 'Genève' },
  { code: 'GL', name: 'Glaris' },
  { code: 'GR', name: 'Grisons' },
  { code: 'JU', name: 'Jura' },
  { code: 'LU', name: 'Lucerne' },
  { code: 'NE', name: 'Neuchâtel' },
  { code: 'NW', name: 'Nidwald' },
  { code: 'OW', name: 'Obwald' },
  { code: 'SG', name: 'Saint-Gall' },
  { code: 'SH', name: 'Schaffhouse' },
  { code: 'SO', name: 'Soleure' },
  { code: 'SZ', name: 'Schwyz' },
  { code: 'TG', name: 'Thurgovie' },
  { code: 'TI', name: 'Tessin' },
  { code: 'UR', name: 'Uri' },
  { code: 'VD', name: 'Vaud' },
  { code: 'VS', name: 'Valais' },
  { code: 'ZG', name: 'Zoug' },
  { code: 'ZH', name: 'Zurich' },
] as const;

/**
 * Valide un canton suisse
 */
export function isValidSwissCanton(canton: string): boolean {
  return SWISS_CANTONS.some(c => c.code === canton.toUpperCase());
}

/**
 * Formate un numéro de téléphone suisse
 */
export function formatSwissPhoneNumber(phone: string): string {
  // Supprimer tous les caractères non numériques sauf le +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Si le numéro commence par 0, le remplacer par +41
  if (cleaned.startsWith('0')) {
    return '+41' + cleaned.substring(1);
  }
  
  // Si le numéro commence par +41, le garder tel quel
  if (cleaned.startsWith('+41')) {
    return cleaned;
  }
  
  // Sinon, ajouter +41 au début
  return '+41' + cleaned;
}

/**
 * Valide un numéro de téléphone suisse
 */
export function isValidSwissPhoneNumber(phone: string): boolean {
  const formatted = formatSwissPhoneNumber(phone);
  // Format: +41 suivi de 8 ou 9 chiffres
  const phoneRegex = /^\+41\d{8,9}$/;
  return phoneRegex.test(formatted);
}

/**
 * Messages d'erreur de validation en français
 */
export const VALIDATION_MESSAGES = {
  REQUIRED: 'Ce champ est obligatoire',
  INVALID_EMAIL: 'Adresse email invalide',
  INVALID_PHONE: 'Numéro de téléphone invalide',
  INVALID_POSTAL_CODE: 'Code postal invalide (4 chiffres requis)',
  INVALID_VAT_NUMBER: 'Numéro de TVA invalide (format: CHE-123.456.789)',
  INVALID_CANTON: 'Canton invalide',
  PASSWORD_TOO_SHORT: 'Le mot de passe doit contenir au moins 4 caractères',
  PASSWORDS_DONT_MATCH: 'Les mots de passe ne correspondent pas',
  INVALID_URL: 'URL invalide',
} as const;

/**
 * Fonction utilitaire pour obtenir un message d'erreur de validation
 */
export function getValidationMessage(key: keyof typeof VALIDATION_MESSAGES): string {
  return VALIDATION_MESSAGES[key];
}