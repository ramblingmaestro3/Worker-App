import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import AppMap from './AppMap';
import { COLORS } from '@/constants/theme';

export type InteractiveMapPickerHandle = {
  animateToRegion: (coords: { latitude: number; longitude: number }) => void;
};

type Props = {
  initialLatitude: number;
  initialLongitude: number;
  onRegionChangeComplete: (coords: { latitude: number; longitude: number }) => void;
};

// Read-only on web — the OSM iframe embed has no postMessage bridge to report
// pan position back to the host page, so dragging isn't supported here. The
// parent re-renders this with fresh lat/lng props instead (e.g. after "Use
// current location"), which is enough since there's no gesture to preserve.
const InteractiveMapPicker = forwardRef<InteractiveMapPickerHandle, Props>(function InteractiveMapPicker(
  { initialLatitude, initialLongitude },
  ref
) {
  useImperativeHandle(ref, () => ({
    animateToRegion: () => {
      // No-op on web — AppMap.web re-renders directly off the lat/lng props instead.
    },
  }));

  return (
    <View style={styles.wrap}>
      <AppMap
        latitude={initialLatitude}
        longitude={initialLongitude}
        zoom={0.02}
        showsUserLocation
        markers={[{ latitude: initialLatitude, longitude: initialLongitude, color: COLORS.primary }]}
      />
    </View>
  );
});

export default InteractiveMapPicker;

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
