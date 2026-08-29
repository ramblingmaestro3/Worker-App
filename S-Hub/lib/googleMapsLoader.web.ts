// Loads the Google Maps JavaScript SDK exactly once and hands back `window.google`.
// Shared by components/AppMap.web.tsx, components/InteractiveMapPicker.web.tsx and
// lib/geocoding.web.ts. Web-only — there is no native counterpart.

import { GOOGLE_MAPS_API_KEY as KEY } from './geocoding.shared';

let pending: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('google-maps/no-dom'));
      return;
    }
    const w = window as any;
    if (w.google?.maps) {
      resolve(w.google);
      return;
    }
    if (!KEY) {
      reject(new Error('google-maps/no-key'));
      return;
    }

    const callbackName = '__adwumaGoMapsReady__';
    w[callbackName] = () => {
      resolve(w.google);
      try {
        delete w[callbackName];
      } catch {
        w[callbackName] = undefined;
      }
    };

    const script = document.createElement('script');
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}` +
      `&v=weekly&libraries=places,marker&loading=async&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      pending = null;
      reject(new Error('google-maps/script-error'));
    };
    document.head.appendChild(script);
  });

  return pending;
}
