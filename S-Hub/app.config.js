// Dynamic Expo config. Expo CLI reads app.json first and passes the normalized
// result in as `config`; we overlay it here to inject the Google Maps key from
// the environment (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) so it never lives in a
// committed file. See https://docs.expo.dev/workflow/configuration/
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    config: {
      ...config.ios?.config,
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        ...config.android?.config?.googleMaps,
        apiKey: GOOGLE_MAPS_API_KEY,
      },
    },
  },
  extra: {
    ...config.extra,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  },
});
