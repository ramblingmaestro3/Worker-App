import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView from 'react-native-maps';
import { COLORS } from '@/constants/theme';

export type InteractiveMapPickerHandle = {
  animateToRegion: (coords: { latitude: number; longitude: number }) => void;
};

type Props = {
  initialLatitude: number;
  initialLongitude: number;
  onRegionChangeComplete: (coords: { latitude: number; longitude: number }) => void;
};

const InteractiveMapPicker = forwardRef<InteractiveMapPickerHandle, Props>(function InteractiveMapPicker(
  { initialLatitude, initialLongitude, onRegionChangeComplete },
  ref
) {
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (coords) => {
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 400);
    },
  }));

  return (
    <View style={styles.wrap}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ latitude: initialLatitude, longitude: initialLongitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation
      />
      <View style={styles.pinWrap} pointerEvents="none">
        <Ionicons name="location" size={40} color={COLORS.primary} />
        <View style={styles.pinShadow} />
      </View>
    </View>
  );
});

export default InteractiveMapPicker;

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  map: { flex: 1 },
  pinWrap: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -40, alignItems: 'center' },
  pinShadow: { width: 8, height: 4, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.25)', marginTop: -2 },
});
