/**
 * AdwumaGo brand mark — the "A" built from a worker's three core tools:
 *   • left leg  = a wrench (shaft + open jaw at the apex)
 *   • right leg = a hammer (handle + claw head at the apex)
 *   • crossbar  = a paintbrush (handle + ferrule + bristle block)
 *
 * `BrandMark` is the glyph alone; `Wordmark` is the glyph + "AdwumaGo" and is
 * the drop-in replacement for the old `<Text>AdwumaGo</Text>` logos.
 *
 * Monochrome — everything paints in `color` (default Ghana green), with a few
 * shapes at reduced opacity for depth, so it works on any background and in
 * dark mode. viewBox is 0 0 128 128.
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { COLORS } from '@/constants/theme';

export function BrandMark({
  size = 40,
  color = COLORS.primary,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128" fill="none">
      {/* ── right leg: HAMMER handle (apex → bottom-right foot) ── */}
      <Line
        x1={74}
        y1={34}
        x2={110}
        y2={116}
        stroke={color}
        strokeWidth={15}
        strokeLinecap="round"
      />
      {/* HAMMER head — a chunky claw head sitting across the apex */}
      <G rotation={-24} originX={64} originY={22}>
        <Rect x={44} y={11} width={44} height={22} rx={6} fill={color} />
        {/* claw fork on the apex side */}
        <Path
          d="M46 33c-8 1-15 6-19 15l7 4c3-7 7-10 14-11z"
          fill={color}
        />
        <Path
          d="M40 34c-6 3-11 9-13 18l7 2c2-7 5-11 10-13z"
          fill={color}
          opacity={0.55}
        />
      </G>

      {/* ── left leg: WRENCH shaft (bottom-left foot → apex) ── */}
      <Line
        x1={18}
        y1={116}
        x2={54}
        y2={34}
        stroke={color}
        strokeWidth={15}
        strokeLinecap="round"
      />
      {/* WRENCH open jaw at the apex — two prongs with a gap */}
      <G rotation={18} originX={58} originY={24}>
        <Path
          d="M40 40c-9-6-11-20-2-30l12 8c-4 5-4 12 1 17z"
          fill={color}
        />
        <Path
          d="M58 6c11 3 17 17 9 30l-13-8c4-5 3-12-3-16z"
          fill={color}
          opacity={0.72}
        />
      </G>

      {/* ── crossbar: PAINTBRUSH ── */}
      {/* handle (right portion) */}
      <Rect x={64} y={70} width={30} height={12} rx={6} fill={color} />
      {/* ferrule / metal band */}
      <Rect x={52} y={66} width={13} height={20} rx={2} fill={color} opacity={0.72} />
      {/* bristle block (left, softly tapered) */}
      <Path
        d="M53 64 37 66c-6 1-6 20 0 21l16 2z"
        fill={color}
      />
      {/* bristle separations */}
      <Line x1={44} y1={65} x2={44} y2={87} stroke={color} strokeWidth={1.5} opacity={0.35} />
      <Line x1={50} y1={65} x2={50} y2={88} stroke={color} strokeWidth={1.5} opacity={0.35} />

      {/* the A apex — a small cap where the two tools meet */}
      <Circle cx={64} cy={22} r={9} fill={color} />
    </Svg>
  );
}

export function Wordmark({
  size = 22,
  color = COLORS.primary,
  markScale = 1.7,
}: {
  /** Font size of "AdwumaGo"; the mark is `size * markScale` tall. */
  size?: number;
  color?: string;
  markScale?: number;
}) {
  return (
    <View style={styles.row}>
      <BrandMark size={size * markScale} color={color} />
      <Text style={[styles.word, { fontSize: size, color }]}>AdwumaGo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontWeight: '900', letterSpacing: -0.3 },
});
