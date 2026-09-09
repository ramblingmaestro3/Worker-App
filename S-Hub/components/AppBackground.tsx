import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import { COLORS } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';

/**
 * App-wide backdrop — a faint, seamlessly tiled scatter of blue-collar tool
 * line-drawings behind every screen, in the spirit of WhatsApp's chat
 * wallpaper. Rendered once in App.tsx under the navigator; screens paint a
 * transparent `T.bg` so this shows through their empty areas, while headers,
 * cards, inputs and the nav pill keep their own opaque fills and stay clean.
 *
 * Each tool is authored in a 24×24 box; a 250×250 SVG <Pattern> tiles them
 * across the whole window in one GPU-tiled draw.
 */
const TILE = 250;

type Tool = { d: string[]; x: number; y: number; r: number; s: number };

const TOOLS: Tool[] = [
  {
    d: ['M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'],
    x: 46, y: 44, r: 18, s: 1.8,
  },
  {
    d: ['M9 3h6v5.5a3 3 0 0 1-6 0z', 'M10.5 8.5h3v9.5h-3z', 'M10.5 18l1.5 3 1.5-3'],
    x: 130, y: 40, r: -28, s: 1.6,
  },
  {
    d: ['M7 4.2H17L22 12l-5 7.8H7L2 12z', 'M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z'],
    x: 210, y: 50, r: 0, s: 1.5,
  },
  {
    d: ['M12.5 3l8.5 8.5-3.5 3.5-8.5-8.5z', 'M12 9l-7.5 7.5a2.1 2.1 0 0 0 3 3l7.5-7.5z'],
    x: 40, y: 130, r: 14, s: 1.7,
  },
  {
    d: [
      'M3.5 5.5c-1.6 0-1.6 5.5 0 5.5H7V5.5z',
      'M7 5.5h14l-2 5.5H7z',
      'M8 11l1 1.4 1-1.4 1 1.4 1-1.4 1 1.4 1-1.4 1 1.4 1-1.4',
    ],
    x: 126, y: 126, r: -6, s: 1.6,
  },
  {
    d: ['M12 2v6.5', 'M9 8.5h6v3H9z', 'M9 11.5h6l-.7 6.2a2 2 0 0 1-4.6 0z', 'M12 11.5v5.5'],
    x: 212, y: 126, r: 38, s: 1.6,
  },
  {
    d: ['M2 8h20v11H2z', 'M2 12.5h20', 'M8.5 8V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2', 'M9.5 12.5v2h5v-2'],
    x: 48, y: 210, r: 0, s: 1.5,
  },
  {
    d: [
      'M1 9.5h22v5H1z',
      'M8 10.8h8v2.4H8z',
      'M10.6 11a1 1.4 0 1 0 0 2 1 1.4 0 0 0 0-2z',
    ],
    x: 126, y: 216, r: 5, s: 1.7,
  },
  {
    d: ['M3 4h13v5.5H3z', 'M16 6.75h3v3h-6.5', 'M12.5 9.75v6', 'M11 15.75h3v4.5h-3z'],
    x: 214, y: 206, r: -14, s: 1.7,
  },
];

export default function AppBackground() {
  const { isDark } = useAppTheme();
  const base = isDark ? '#120C09' : '#F5F5F0';
  const stroke = isDark ? '#6FCFA6' : COLORS.primary;
  const opacity = isDark ? 0.22 : 0.18;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: base }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="tools" patternUnits="userSpaceOnUse" width={TILE} height={TILE}>
            <G opacity={opacity} stroke={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round">
              {TOOLS.map((t, i) => (
                <G
                  key={i}
                  transform={`translate(${t.x} ${t.y}) rotate(${t.r}) scale(${t.s}) translate(-12 -12)`}
                  strokeWidth={1.9 / t.s}
                >
                  {t.d.map((d, j) => (
                    <Path key={j} d={d} />
                  ))}
                </G>
              ))}
            </G>
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#tools)" />
      </Svg>
    </View>
  );
}
