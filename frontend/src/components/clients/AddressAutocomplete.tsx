import React, { useEffect, useRef } from 'react';
import { Input } from '../ui/Input';
import { useGooglePlaces } from '../../hooks/useGooglePlaces';

// Declare google to satisfy TypeScript without installing external types
// Minimal Google types to avoid explicit any
declare const google: {
  maps: {
    places: {
      Autocomplete: new (input: HTMLInputElement, options: unknown) => {
        addListener: (eventName: 'place_changed', handler: () => void) => void;
        getPlace: () => { address_components?: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>; };
      };
    };
  };
};

export type AddressSelection = {
  street?: string;
  city?: string;
  postalCode?: string;
  canton?: string; // administrative_area_level_1 short name
  country?: string;
};

interface AddressAutocompleteProps {
  label?: string;
  placeholder?: string;
  value?: string;
  error?: string;
  onChange?: (value: string) => void;
  onAddressSelected?: (addr: AddressSelection) => void;
}

export function AddressAutocomplete({
  label = 'Rue et numéro *',
  placeholder = 'Rue de la Paix 123',
  value = '',
  error,
  onChange,
  onAddressSelected,
}: AddressAutocompleteProps) {
  const { loaded, error: loadError } = useGooglePlaces({ language: 'fr', region: 'CH' });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<unknown | null>(null);

  useEffect(() => {
    if (!loaded || !inputRef.current || autocompleteRef.current) return;

    const ac = new google.maps.places.Autocomplete(inputRef.current!, {
      fields: ['address_components', 'formatted_address'],
      types: ['address'],
      componentRestrictions: { country: ['ch'] },
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place || !place.address_components) return;

      const parts = place.address_components;
      const get = (type: string, useShort = false) => {
        const comp = parts.find((c) => Array.isArray(c.types) && c.types.includes(type));
        if (!comp) return undefined;
        return useShort ? comp.short_name : comp.long_name;
        };
      const street = [get('route'), get('street_number')].filter(Boolean).join(' ').trim();
      const city = get('locality') || get('postal_town') || get('sublocality') || undefined;
      const postalCode = get('postal_code');
      const canton = get('administrative_area_level_1', true);
      const country = get('country', true);

      if (onAddressSelected) {
        onAddressSelected({ street, city, postalCode, canton, country });
      }
    });

    autocompleteRef.current = ac;
  }, [loaded, onAddressSelected]);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={loaded ? placeholder : 'Chargement Google Places…'}
        error={loadError ? 'Erreur en chargeant Google Maps' : error}
        disabled={!loaded}
      />
      {loadError && (
        <p className="text-xs text-red-600 mt-1">Impossible de charger Google Maps. Vérifiez la clé API.</p>
      )}
    </div>
  );
}
