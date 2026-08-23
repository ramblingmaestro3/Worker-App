import MapView, { Marker, Callout } from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';
import { s, ms } from '@/lib/scaling';
import { COLORS } from '@/constants/theme';

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
  zoomEnabled = true,
  scrollEnabled = true,
}: AppMapProps) {
  return (
    <MapView
      style={style || styles.map}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: zoom,
        longitudeDelta: zoom,
      }}
      showsUserLocation={showsUserLocation}
      followsUserLocation={showsUserLocation}
      zoomEnabled={zoomEnabled}
      scrollEnabled={scrollEnabled}
    >
      {markers.map((marker, index) => (
        <Marker
          key={index}
          coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
          pinColor={marker.color}
        >
          {marker.title && (
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{marker.title}</Text>
                {marker.subtitle && <Text style={styles.calloutSubtitle}>{marker.subtitle}</Text>}
                {marker.price && <Text style={styles.calloutPrice}>{marker.price}</Text>}
              </View>
            </Callout>
          )}
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  callout: { width: s(140), padding: s(8) },
  calloutTitle: { fontSize: ms(13), fontWeight: '700' },
  calloutSubtitle: { fontSize: ms(11), marginTop: 2 },
  calloutPrice: { fontSize: ms(12), fontWeight: '700', color: COLORS.accent, marginTop: 4 },
});