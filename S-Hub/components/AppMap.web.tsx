import { createElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { s, ms } from '@/lib/scaling';

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

export default function AppMap({
  latitude,
  longitude,
  zoom = 0.01,
  showsUserLocation = false,
  markers = [],
  style,
}: AppMapProps) {
  // Build OpenStreetMap embed URL
  const delta = zoom * 180;
  const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
  const allMarkers = [...markers];
  if (showsUserLocation) {
    allMarkers.unshift({ latitude, longitude });
  }
  const markerParam = allMarkers.length > 0
    ? `&marker=${allMarkers.map(m => `${m.latitude},${m.longitude}`).join(',')}`
    : '';
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${markerParam}`;

  return createElement('iframe', {
    src,
    style: {
      width: '100%',
      height: '100%',
      border: 'none',
      ...(style as any),
    },
    loading: 'lazy',
  });
}