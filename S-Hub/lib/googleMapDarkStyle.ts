// Google Maps "night mode" style, tuned slightly warmer to match the AdwumaGo
// dark theme (#120C09). Applied as `styles` on the web maps so a legacy Map ID
// isn't required. Used by components/AppMap.web.tsx and InteractiveMapPicker.web.tsx.

export const DARK_MAP_STYLE: any[] = [
  { elementType: 'geometry', stylers: [{ color: '#1b130d' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1b130d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a99c8e' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a2019' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#c9bcae' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d6c6a8' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#9c9184' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1f2a1c' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#5c7a52' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2e2a24' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#221e19' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9aa0a6' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3d3529' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1b130d' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f0ae2e' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#9c9184' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#2a2019' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#2a2019' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#12303a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a6b78' }] },
];
