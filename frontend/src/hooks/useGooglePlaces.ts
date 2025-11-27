import { useEffect, useState } from 'react';

type WindowWithGoogle = Window & {
  google?: {
    maps?: {
      places?: unknown;
    };
  };
};

/**
 * Dynamically loads the Google Maps JavaScript API with Places library.
 * Requires Vite env var: VITE_GOOGLE_MAPS_API_KEY
 */
export function useGooglePlaces({ language = 'fr', region = 'CH' }: { language?: string; region?: string } = {}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // If already loaded
    if ((window as WindowWithGoogle).google?.maps?.places) {
      setLoaded(true);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) {
      setError(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'));
      return;
    }

    // Check if a script is already in the DOM
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps]');
    if (existing) {
      existing.addEventListener('load', () => setLoaded(true));
      existing.addEventListener('error', () => setError(new Error('Failed to load Google Maps script')));
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-maps', 'true');
    const params = new URLSearchParams({
      key: apiKey,
      libraries: 'places',
      language,
      region,
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

    script.onload = () => setLoaded(true);
    script.onerror = () => setError(new Error('Failed to load Google Maps script'));

    document.head.appendChild(script);

    return () => {
      // do not remove script to avoid reloading across navigation
    };
  }, [language, region]);

  return { loaded, error };
}
