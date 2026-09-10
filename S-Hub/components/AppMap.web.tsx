/** Web implementation of AppMap using the Google Maps JavaScript API (the native file uses react-native-maps). */
import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { useAppTheme } from '@/contexts/ThemeContext';
import { loadGoogleMaps } from '@/lib/googleMapsLoader.web';
import { DARK_MAP_STYLE } from '@/lib/googleMapDarkStyle';

export type AppMapMarker = {
  latitude: number;
  longitude: number;
  color?: string;
  title?: string;
  subtitle?: string;
  price?: string;
};

type AppMapProps = {
  latitude: number;
  longitude: number;
  zoom?: number;
  showsUserLocation?: boolean;
  markers?: AppMapMarker[];
  style?: any;
  zoomEnabled?: boolean;
  scrollEnabled?: boolean;
};

/** react-native-maps expresses zoom as a lat/lng delta; Google wants an integer level. */
function deltaToZoom(delta: number): number {
  const z = Math.round(Math.log2(360 / Math.max(delta, 0.0005)));
  return Math.min(20, Math.max(3, z));
}

export default function AppMap({
  latitude,
  longitude,
  zoom = 0.01,
  showsUserLocation = false,
  markers = [],
  style,
  zoomEnabled = true,
  scrollEnabled = true,
}: AppMapProps) {
  const { isDark } = useAppTheme();
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const gRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markerObjs = useRef<any[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const zoomLevel = deltaToZoom(zoom);
  const interactive = zoomEnabled || scrollEnabled;
  const markersKey = useMemo(
    () => markers.map((m) => `${m.latitude},${m.longitude},${m.color ?? ''}`).join('|'),
    [markers],
  );

  const drawMarkers = (g: any) => {
    markerObjs.current.forEach((m) => m.setMap(null));
    markerObjs.current = [];
    if (showsUserLocation) {
      markerObjs.current.push(
        new g.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map: mapRef.current,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: '#4DA3FF',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          zIndex: 1,
        }),
      );
    }
    markers.forEach((mk) => {
      markerObjs.current.push(
        new g.maps.Marker({
          position: { lat: mk.latitude, lng: mk.longitude },
          map: mapRef.current,
          title: mk.title,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: mk.color || '#F0AE2E',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        }),
      );
    });
  };

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !mapElRef.current || mapRef.current) return;
        gRef.current = g;
        mapRef.current = new g.maps.Map(mapElRef.current, {
          center: { lat: latitude, lng: longitude },
          zoom: zoomLevel,
          disableDefaultUI: true,
          zoomControl: zoomEnabled,
          gestureHandling: interactive ? 'greedy' : 'none',
          clickableIcons: false,
          keyboardShortcuts: false,
          styles: isDark ? DARK_MAP_STYLE : undefined,
          backgroundColor: isDark ? '#1b130d' : '#e9e5dd',
        });
        drawMarkers(g);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow prop changes.
  useEffect(() => {
    const g = gRef.current;
    if (!g || !mapRef.current) return;
    mapRef.current.setCenter({ lat: latitude, lng: longitude });
    mapRef.current.setZoom(zoomLevel);
    drawMarkers(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, zoomLevel, markersKey]);

  // Follow theme changes.
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setOptions({
        styles: isDark ? DARK_MAP_STYLE : null,
        backgroundColor: isDark ? '#1b130d' : '#e9e5dd',
      });
    }
  }, [isDark]);

  const bg = isDark ? '#1b130d' : '#e9e5dd';
  const muted = isDark ? '#A99C8E' : '#6B6B6B';

  return createElement(
    'div',
    {
      style: {
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: bg,
        ...(style as any),
      },
    },
    // createElement(..., { ref }) is valid React; the react-hooks/refs rule
    // (eslint-config-expo 57+) only recognises the JSX `ref={}` position.
    // eslint-disable-next-line react-hooks/refs
    createElement('div', {
      key: 'map',
      ref: mapElRef,
      style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    }),
    status !== 'ready' &&
      createElement(
        'div',
        {
          key: 'overlay',
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 16,
            font: '500 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            color: muted,
            background: bg,
          },
        },
        status === 'loading'
          ? 'Loading map…'
          : 'Map unavailable. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY and enable the Maps JavaScript API.',
      ),
  );
}
