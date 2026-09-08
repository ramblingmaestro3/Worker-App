import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect, useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { s } from '@/lib/scaling';
import type { RootStackParamList } from '@/navigation/types';

type ThemeColors = ReturnType<typeof useThemeColors>;

const { width: WINDOW_WIDTH } = Dimensions.get('window');
const MAX_CONTENT_WIDTH = s(544);

type Slide = {
  key: 'find' | 'bid' | 'book';
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    key: 'find',
    title: 'Find vetted workers near you',
    body: 'Search local professionals across skilled trades and everyday services, filtered to your area.',
  },
  {
    key: 'bid',
    title: 'Compare bids, pick your price',
    body: 'Post a job once and receive multiple quotes. No pressure — accept only the offer that works for you.',
  },
  {
    key: 'book',
    title: 'Book and pay with confidence',
    body: 'Every worker is rated by clients like you, and payment stays in escrow until you mark the job done.',
  },
];

// Each slide's claim is backed by a small, real mock of the mechanism it
// describes (a worker match, a bid list, an escrow receipt) instead of a
// decorative icon — evidence over illustration.

function FindProof({ T }: { T: ThemeColors }) {
  return (
    <View style={[proofStyles.card, { backgroundColor: T.card, borderColor: T.border }]}>
      <View style={proofStyles.row}>
        <View style={[proofStyles.avatar, { backgroundColor: COLORS.accent + '20' }]}>
          <Text style={[proofStyles.avatarText, { color: COLORS.accent }]}>KA</Text>
        </View>
        <View style={proofStyles.flex1}>
          <View style={proofStyles.inlineRow}>
            <Text style={[proofStyles.name, { color: T.text }]}>Kwame Asante</Text>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.verified} />
          </View>
          <View style={proofStyles.inlineRow}>
            <Ionicons name="star" size={12} color={COLORS.star} />
            <Text style={[proofStyles.metaText, { color: T.subText }]}>4.9 (128)</Text>
            <Text style={[proofStyles.metaText, { color: T.subText }]}>·</Text>
            <Text style={[proofStyles.metaText, { color: T.subText }]}>1.2 km away</Text>
          </View>
        </View>
      </View>
      <View style={proofStyles.badgeRow}>
        <View style={[proofStyles.badge, { borderColor: T.border }]}>
          <Ionicons name="shield-checkmark-outline" size={12} color={COLORS.accent} />
          <Text style={[proofStyles.badgeText, { color: T.text }]}>ID-verified</Text>
        </View>
        <View style={[proofStyles.badge, { borderColor: T.border }]}>
          <Ionicons name="document-text-outline" size={12} color={COLORS.accent} />
          <Text style={[proofStyles.badgeText, { color: T.text }]}>Background checked</Text>
        </View>
      </View>
    </View>
  );
}

const BIDS: { initials: string; color: string; name: string; price: number; best?: boolean }[] = [
  { initials: 'NK', color: COLORS.accent, name: 'Nana K.', price: 350, best: true },
  { initials: 'AO', color: '#7C3AED', name: 'Ama O.', price: 380 },
  { initials: 'YB', color: '#D97706', name: 'Yaw B.', price: 420 },
];

function BidProof({ T }: { T: ThemeColors }) {
  return (
    <View style={[proofStyles.card, { backgroundColor: T.card, borderColor: T.border }]}>
      {BIDS.map((b) => (
        <View
          key={b.initials}
          style={[proofStyles.bidRow, b.best && { backgroundColor: COLORS.accentLight }]}
        >
          <View style={[proofStyles.avatarSm, { backgroundColor: b.color + '20' }]}>
            <Text style={[proofStyles.avatarTextSm, { color: b.color }]}>{b.initials}</Text>
          </View>
          <Text style={[proofStyles.bidName, { color: T.text }]} numberOfLines={1}>{b.name}</Text>
          <View style={proofStyles.flex1} />
          {b.best && <Text style={styles.bestTag}>Best value</Text>}
          <Text style={[proofStyles.bidPrice, { color: T.text }]}>GH₵ {b.price}</Text>
        </View>
      ))}
    </View>
  );
}

function BookProof({ T }: { T: ThemeColors }) {
  return (
    <View style={[proofStyles.card, { backgroundColor: T.card, borderColor: T.border }]}>
      <View style={proofStyles.row}>
        <View style={[proofStyles.lockCircle, { backgroundColor: COLORS.primaryLight }]}>
          <Ionicons name="lock-closed" size={16} color={COLORS.primary} />
        </View>
        <View style={proofStyles.flex1}>
          <Text style={[proofStyles.metaText, { color: T.subText }]}>Payment held securely</Text>
          <Text style={[proofStyles.escrowAmount, { color: T.text }]}>GH₵ 380.00</Text>
        </View>
      </View>
      <View style={[proofStyles.divider, { backgroundColor: T.border }]} />
      <View style={proofStyles.inlineRow}>
        <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.accent} />
        <Text style={[proofStyles.badgeText, { color: T.subText }]}>Released only when you mark the job done</Text>
      </View>
    </View>
  );
}

const PROOF_BY_KEY: Record<Slide['key'], (props: { T: ThemeColors }) => React.ReactElement> = {
  find: FindProof,
  bid: BidProof,
  book: BookProof,
};

export default function OnboardingScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Onboarding'>) {
  const T = useThemeColors();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  // Actual rendered width of the (possibly capped) content container.
  // Slides size themselves off this instead of the raw window width so
  // paging still works correctly once the container is capped on wide screens.
  const [contentWidth, setContentWidth] = useState(Math.min(WINDOW_WIDTH, MAX_CONTENT_WIDTH));

  const handleSkip = () => navigation.replace('SignIn');
  const handleGetStarted = () => navigation.replace('SignUp');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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

  const handleNext = () => {
    if (index === SLIDES.length - 1) handleGetStarted();
    else goToSlide(index + 1);
  };

  const onMomentumScrollEnd = (e: any) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / contentWidth));
  };

  const renderItem = ({ item }: ListRenderItemInfo<Slide>) => {
    const Proof = PROOF_BY_KEY[item.key];
    return (
      <View style={[styles.slide, { width: contentWidth }]}>
        <Text style={[styles.title, { color: T.text }]}>{item.title}</Text>
        <Text style={[styles.body, { color: T.subText }]}>{item.body}</Text>
        <View style={styles.proofWrap}>
          <Proof T={T} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle={T.statusBar} />

      <View style={styles.topBar}>
        <Text style={styles.logo}>AdwumaGo</Text>
        <TouchableOpacity onPress={handleSkip} hitSlop={8} accessibilityRole="button" accessibilityLabel="Skip onboarding">
          <Text style={[styles.skipText, { color: T.subText }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Everything below the header lives in a single capped-width, centered container —
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

      <View style={styles.dotsRow}>
        {SLIDES.map((slide, i) => (
          <TouchableOpacity
            key={slide.key}
            onPress={() => goToSlide(i)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Go to slide ${i + 1} of ${SLIDES.length}`}
          >
            <View style={[styles.dot, i === index ? styles.dotActive : { backgroundColor: T.border }]} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        {index > 0 ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => goToSlide(index - 1)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Previous slide"
          >
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
          accessibilityRole="button"
          accessibilityLabel={index === SLIDES.length - 1 ? 'Get started' : 'Next slide'}
        >
          <Text style={styles.nextText}>{index === SLIDES.length - 1 ? 'Get Started' : 'Next'}</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logo: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  skipText: { fontSize: 14, fontWeight: '600' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },

  content: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  list: { flexGrow: 0 },
  slide: { paddingHorizontal: 20, paddingTop: 16 },

  title: { fontSize: 24, fontWeight: '800', lineHeight: 30, marginBottom: 10, maxWidth: 340 },
  body: { fontSize: 15, lineHeight: 22, maxWidth: 360 },
  // Copy explains the step; the proof card sits well below it as supporting evidence.
  proofWrap: { marginTop: 48 },

  bestTag: { fontSize: 11, fontWeight: '700', color: COLORS.accent, marginRight: 10 },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: COLORS.primary },

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

const proofStyles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 16 },
  flex1: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },

  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '700' },
  metaText: { fontSize: 12, fontWeight: '600' },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  badgeText: { fontSize: 11.5, fontWeight: '600' },

  bidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: RADIUS.md,
  },
  avatarSm: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarTextSm: { fontSize: 12, fontWeight: '800' },
  bidName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  bidPrice: { fontSize: 14, fontWeight: '800' },

  lockCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  escrowAmount: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  divider: { height: 1, marginVertical: 14 },
});
