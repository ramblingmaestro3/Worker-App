import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import { useAppTheme, useThemeColors } from '@/contexts/ThemeContext';
import { loadGoogleMaps } from '@/lib/googleMapsLoader.web';
import { DARK_MAP_STYLE } from '@/lib/googleMapDarkStyle';

export type InteractiveMapPickerHandle = {
  animateToRegion: (coords: { latitude: number; longitude: number }) => void;
};

type Props = {
  initialLatitude: number;
  initialLongitude: number;
  onRegionChangeComplete: (coords: { latitude: number; longitude: number }) => void;
  /** Fired when the user starts dragging the map (before the new centre settles). */
  onMoveStart?: () => void;
};

// Full interactive Google map. The pin is a fixed overlay at screen centre — the
// map slides underneath it, exactly like the native picker and every ride app.
const InteractiveMapPicker = forwardRef<InteractiveMapPickerHandle, Props>(function InteractiveMapPicker(
  { initialLatitude, initialLongitude, onRegionChangeComplete, onMoveStart },
  ref,
) {
  const { isDark } = useAppTheme();
  const T = useThemeColors();
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const firstIdle = useRef(true);
  const programmatic = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const cbRef = useRef(onRegionChangeComplete);
  const moveStartRef = useRef(onMoveStart);
  cbRef.current = onRegionChangeComplete;
  moveStartRef.current = onMoveStart;

  useImperativeHandle(ref, () => ({
    animateToRegion: (coords) => {
      const map = mapRef.current;
      if (!map) return;
      programmatic.current = true;
      map.panTo({ lat: coords.latitude, lng: coords.longitude });
      // Safety net: if panTo doesn't move (target ≈ current centre) no 'idle'
      // fires, so clear the flag ourselves or the next real drag gets ignored.
      setTimeout(() => {
        programmatic.current = false;
      }, 1200);
    },
  }));

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !divRef.current || mapRef.current) return;
        const map = new g.maps.Map(divRef.current, {
          center: { lat: initialLatitude, lng: initialLongitude },
          zoom: 16,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          clickableIcons: false,
          keyboardShortcuts: false,
          styles: isDark ? DARK_MAP_STYLE : undefined,
          backgroundColor: isDark ? '#1b130d' : '#e9e5dd',
        });
        mapRef.current = map;
        setStatus('ready');

        map.addListener('dragstart', () => moveStartRef.current?.());
        map.addListener('idle', () => {
          if (firstIdle.current) {
            firstIdle.current = false;
            return;
          }
          if (programmatic.current) {
            programmatic.current = false;
            return;
          }
          const c = map.getCenter();
          if (c) cbRef.current({ latitude: c.lat(), longitude: c.lng() });
        });
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setOptions({
        styles: isDark ? DARK_MAP_STYLE : null,
        backgroundColor: isDark ? '#1b130d' : '#e9e5dd',
      });
    }
  }, [isDark]);

  return (
    <View style={[styles.wrap, { backgroundColor: isDark ? '#1b130d' : '#e9e5dd' }]}>
      {createElement('div', {
        ref: divRef,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDark ? '#1b130d' : '#e9e5dd',
        },
      })}

      {status !== 'ready' && (
        <View style={styles.overlay} pointerEvents="none">
          {status === 'loading' ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={[styles.overlayText, { color: T.subText }]}>
              Map unavailable. Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to .env and enable the
              Maps JavaScript API, then restart with{'  '}expo start -c.
            </Text>
          )}
        </View>
      )}

      {status === 'ready' && (
        <View style={styles.pinWrap} pointerEvents="none">
          <Ionicons name="location" size={40} color={COLORS.primary} />
          <View style={styles.pinShadow} />
        </View>
      )}
    </View>
  );
});

export default InteractiveMapPicker;

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 24 },
  overlayText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  pinWrap: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -40, alignItems: 'center' },
  pinShadow: { width: 8, height: 4, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.25)', marginTop: -2 },
});
