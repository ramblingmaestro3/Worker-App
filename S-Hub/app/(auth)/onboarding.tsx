import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  LayoutChangeEvent,
  ListRenderItemInfo,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { s } from '@/lib/scaling';

const { width: WINDOW_WIDTH } = Dimensions.get('window');
const MAX_CONTENT_WIDTH = s(544);
const NUMERAL_COLOR = 'rgba(240,174,46,0.4)'; // COLORS.primary at low opacity — decorative, redundant with title

type Slide = {
  key: string;
  title: string;
  body: string;
  proof: [string, string];
};

const SLIDES: Slide[] = [
  {
    key: 'find',
    title: 'Find vetted workers near you',
    body: 'Search local professionals across skilled trades and everyday services, filtered to your area.',
    proof: ['ID-verified', 'Background checked'],
  },
  {
    key: 'bid',
    title: 'Compare bids, pick your price',
    body: 'Post a job once and receive multiple quotes. No pressure — accept only the offer that works for you.',
    proof: ['Transparent pricing', 'No obligation'],
  },
  {
    key: 'book',
    title: 'Book and pay with confidence',
    body: 'Every worker is rated by clients like you, and payment stays protected inside the app until the job is done.',
    proof: ['Rated by your community', 'Secure in-app payment'],
  },
];

export default function OnboardingScreen() {
  const T = useThemeColors();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  // Actual rendered width of the (possibly capped) content container.
  // Slides size themselves off this instead of the raw window width so
  // paging still works correctly once the container is capped on wide screens.
  const [contentWidth, setContentWidth] = useState(Math.min(WINDOW_WIDTH, MAX_CONTENT_WIDTH));

  const onContentLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width && width !== contentWidth) setContentWidth(width);
  };

  const goToSlide = (i: number) => {
    // scrollToOffset (not scrollToIndex) — react-native-web's FlatList doesn't
    // reliably honor scrollToIndex without getItemLayout.
    listRef.current?.scrollToOffset({ offset: i * contentWidth, animated: true });
    setIndex(i);
  };

  const handleSkip = () => router.replace('/sign-in' as any);
  const handleGetStarted = () => router.replace('/sign-up' as any);
  const handleNext = () => {
    if (index === SLIDES.length - 1) handleGetStarted();
    else goToSlide(index + 1);
  };

  const onMomentumScrollEnd = (e: any) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / contentWidth));
  };

  const renderItem = ({ item, index: i }: ListRenderItemInfo<Slide>) => (
    <View style={[styles.slide, { width: contentWidth }]}>
      <Text style={styles.numeral}>{String(i + 1).padStart(2, '0')}</Text>
      <View style={[styles.rule, { backgroundColor: COLORS.primary }]} />
      <Text style={[styles.title, { color: T.text }]}>{item.title}</Text>
      <Text style={[styles.body, { color: T.subText }]}>{item.body}</Text>

      <View style={styles.proofRow}>
        {item.proof.map((p) => (
          <View key={p} style={styles.proofChip}>
            <Ionicons name="checkmark-circle" size={15} color={COLORS.accent} />
            <Text style={[styles.proofText, { color: T.subText }]}>{p}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} />

      <View style={styles.header}>
        <Text style={styles.logo}>AdwumaGo</Text>
        <TouchableOpacity onPress={handleSkip} hitSlop={8}>
          <Text style={[styles.skipText, { color: T.subText }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressRow}>
        {SLIDES.map((slide, i) => (
          <TouchableOpacity key={slide.key} style={styles.progressSegmentWrap} onPress={() => goToSlide(i)} hitSlop={6}>
            <View
              style={[
                styles.progressSegment,
                { backgroundColor: i <= index ? COLORS.primary : T.border },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Everything below the progress bar lives in a single capped-width, centered container —
          same treatment as sign-up.tsx / sign-in.tsx */}
      <View style={styles.content} onLayout={onContentLayout}>
        <FlatList
          ref={listRef}
          data={SLIDES}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          style={styles.list}
        />
      </View>

      <View style={styles.footer}>
        {index > 0 ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => goToSlide(index - 1)} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={T.subText} />
            <Text style={[styles.backText, { color: T.subText }]}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        <TouchableOpacity
          style={[styles.nextBtn, { flex: index > 0 ? undefined : 1 }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>{index === SLIDES.length - 1 ? 'Get Started' : 'Next'}</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    height: 56,
  },
  logo: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  skipText: { fontSize: 14, fontWeight: '600' },

  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
    maxWidth: MAX_CONTENT_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  progressSegmentWrap: { flex: 1, paddingVertical: 6 },
  progressSegment: { height: 3, borderRadius: 2 },

  content: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  list: { flexGrow: 0 },
  slide: { paddingHorizontal: 20, paddingTop: 12 },

  numeral: { fontSize: 56, fontWeight: '800', color: NUMERAL_COLOR, lineHeight: 58 },
  rule: { width: 32, height: 3, borderRadius: 2, marginTop: 12, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', lineHeight: 32, marginBottom: 12, maxWidth: 340 },
  body: { fontSize: 15, lineHeight: 22, maxWidth: 360 },

  proofRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 28 },
  proofChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proofText: { fontSize: 13, fontWeight: '600' },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 12,
    maxWidth: MAX_CONTENT_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingRight: 8 },
  backText: { fontSize: 15, fontWeight: '600' },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
  },
  nextText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
