import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppMap from '@/components/AppMap';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/ui/EmptyState';
import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';
import { getServiceRequest, ServiceRequest } from '@/lib/api/serviceRequests';
import { listMyBids, WorkerBid } from '@/lib/api/workerBids';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'JobPosting'>;
type ThemeColors = ReturnType<typeof useThemeColors>;

// Same slugs PostAJob.tsx posts with; unknown categories fall back to a briefcase.
const CATEGORY_ICON: Record<string, string> = {
  plumbing: 'water-outline',
  electrical: 'flash-outline',
  carpentry: 'hammer-outline',
  painting: 'color-palette-outline',
  cleaning: 'sparkles-outline',
  masonry: 'cube-outline',
  welding: 'flame-outline',
  ac: 'snow-outline',
  tiling: 'grid-outline',
  roofing: 'home-outline',
  security: 'videocam-outline',
  mechanic: 'car-outline',
  gardening: 'leaf-outline',
  appliances: 'build-outline',
  moving: 'car-sport-outline',
  beauty: 'cut-outline',
};

function titleCase(raw: string): string {
  return raw
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Compact form for the info tile, e.g. "8 Jan" (year added only when it isn't this one). */
function scheduleShort(iso: string | null): string {
  if (!iso) return 'Flexible';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Flexible';
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString(undefined, opts);
}

function InfoTile({
  icon,
  label,
  value,
  accent,
  T,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
  T: ThemeColors;
}) {
  return (
    <View
      style={[
        styles.tile,
        { borderColor: T.border, backgroundColor: accent ? COLORS.primaryLight : T.card },
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: accent ? COLORS.primary + '22' : T.inputBg }]}>
        <Ionicons name={icon as any} size={wms(15)} color={COLORS.primary} />
      </View>
      <Text style={[styles.tileLabel, { color: accent ? COLORS.primary : T.subText }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: T.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function JobPostingScreen({ route, navigation }: Props) {
  const { requestId } = route.params;
  const T = useThemeColors();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [myBid, setMyBid] = useState<WorkerBid | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('WorkerTabs', { screen: 'worker-dashboard' });
  };

  const load = useCallback(
    async (cancelledRef?: { current: boolean }) => {
      setLoading(true);
      setLoadError(false);
      const [reqResult, bidsResult] = await Promise.all([
        getServiceRequest(requestId),
        listMyBids(),
      ]);
      if (cancelledRef?.current) return;
      if (reqResult.success && reqResult.data) {
        setRequest(reqResult.data);
      } else {
        setRequest(null);
        setLoadError(!reqResult.success);
      }
      if (bidsResult.success) {
        const active = (bidsResult.data ?? []).find(
          (b) => b.request_id === requestId && (b.status === 'pending' || b.status === 'countered')
        );
        setMyBid(active ?? null);
      }
      setLoading(false);
    },
    [requestId]
  );

  useFocusEffect(
    useCallback(() => {
      const cancelledRef = { current: false };
      load(cancelledRef);
      return () => {
        cancelledRef.current = true;
      };
    }, [load])
  );

  const shell = (children: React.ReactNode) => (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} />
      <ScreenHeader title="Job Details" onBack={handleBack} />
      {children}
    </SafeAreaView>
  );

  if (loading) {
    return shell(
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!request) {
    return shell(
      <View style={styles.pageInner}>
        <EmptyState
          icon={loadError ? 'cloud-offline-outline' : 'alert-circle-outline'}
          title={loadError ? "Couldn't load this job" : 'Job not found'}
          body={
            loadError
              ? 'Check your connection and try again.'
              : 'This request may have been withdrawn or already assigned.'
          }
          actionLabel={loadError ? 'Retry' : undefined}
          onAction={loadError ? () => load() : undefined}
          tone="error"
        />
        <TouchableOpacity onPress={handleBack} style={styles.backLink}>
          <Text style={styles.backLinkText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const category = titleCase(request.category);
  const icon = CATEGORY_ICON[request.category] ?? 'briefcase-outline';
  const locationText =
    request.location_string ?? request.location_region ?? 'Location not specified';
  const budgetText =
    request.initial_offer_price != null ? `GH₵ ${request.initial_offer_price}` : 'Open budget';
  const isOpen = request.status === 'seeking_bids';
  const descLong = (request.description?.length ?? 0) > 200;

  const goToBid = () => navigation.navigate('SubmitBid', { requestId });

  return shell(
    <View style={styles.pageInner}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: T.inputBg }]}>
            <Ionicons name={icon as any} size={wms(30)} color={COLORS.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: T.text }]}>{category}</Text>
          <View style={styles.heroLocationRow}>
            <Ionicons name="location-outline" size={wms(14)} color={T.subText} />
            <Text style={[styles.heroLocation, { color: T.subText }]} numberOfLines={2}>
              {locationText}
            </Text>
          </View>
        </View>

        {/* ── Info grid ── */}
        <View style={styles.grid}>
          <InfoTile icon="cash-outline" label="BUDGET" value={budgetText} accent T={T} />
          <InfoTile icon={icon} label="CATEGORY" value={category} T={T} />
          <InfoTile
            icon="calendar-outline"
            label="SCHEDULE"
            value={scheduleShort(request.scheduled_for)}
            T={T}
          />
          <InfoTile icon="time-outline" label="POSTED" value={timeAgo(request.created_at)} T={T} />
        </View>

        {/* ── Description ── */}
        {!!request.description && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: T.text }]}>Description</Text>
            <Text
              style={[styles.body, { color: T.subText }]}
              numberOfLines={descExpanded || !descLong ? undefined : 4}
            >
              {request.description}
            </Text>
            {descLong && (
              <TouchableOpacity onPress={() => setDescExpanded((v) => !v)} hitSlop={6} activeOpacity={0.7}>
                <Text style={styles.readMore}>{descExpanded ? 'Read less' : 'Read more'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Photos ── */}
        {request.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: T.text }]}>Photos from client</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoRow}
            >
              {request.photos.map((uri) => (
                <TouchableOpacity key={uri} onPress={() => setPreviewPhoto(uri)} activeOpacity={0.85}>
                  <Image source={{ uri }} style={[styles.photoThumb, { borderColor: T.border }]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Location ── */}
        {request.latitude != null && request.longitude != null && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: T.text }]}>Location</Text>
            <View style={[styles.mapPreview, { borderColor: T.border }]}>
              <AppMap
                latitude={request.latitude}
                longitude={request.longitude}
                zoom={0.02}
                markers={[
                  { latitude: request.latitude, longitude: request.longitude, color: COLORS.primary },
                ]}
                zoomEnabled={false}
                scrollEnabled={false}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Footer CTA ── */}
      <View style={[styles.footer, { backgroundColor: T.card, borderTopColor: T.border }]}>
        {!isOpen ? (
          <View style={styles.footerNotice}>
            <Ionicons name="lock-closed-outline" size={wms(16)} color={T.subText} />
            <Text style={[styles.footerNoticeText, { color: T.subText }]}>
              This job isn&apos;t accepting bids anymore.
            </Text>
          </View>
        ) : myBid ? (
          <>
            <Text style={[styles.footerBidNote, { color: T.subText }]}>
              Your offer:{' '}
              <Text style={{ fontWeight: '800', color: T.text }}>GH₵ {myBid.proposed_price}</Text>
              {myBid.status === 'countered' ? ' · client countered' : ' · waiting for client'}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={goToBid} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>View Your Offer</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={goToBid} activeOpacity={0.85}>
            <Ionicons name="pricetag-outline" size={wms(18)} color="#fff" />
            <Text style={styles.primaryBtnText}>Place a Bid</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={previewPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPhoto(null)}
      >
        <TouchableOpacity
          style={styles.photoModalBackdrop}
          activeOpacity={1}
          onPress={() => setPreviewPhoto(null)}
        >
          {previewPhoto && (
            <Image source={{ uri: previewPhoto }} style={styles.photoModalImage} resizeMode="contain" />
          )}
          <TouchableOpacity
            style={styles.photoModalClose}
            onPress={() => setPreviewPhoto(null)}
            hitSlop={12}
          >
            <Ionicons name="close" size={wms(24)} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pageInner: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: ws(20), paddingTop: wvs(20), paddingBottom: wvs(28), gap: wvs(22) },

  backLink: { alignSelf: 'center', paddingVertical: wvs(12) },
  backLinkText: { fontSize: wms(14), fontWeight: '700', color: COLORS.primary },

  /* Hero */
  hero: { alignItems: 'center', gap: wvs(8) },
  heroIcon: {
    width: ws(76),
    height: ws(76),
    borderRadius: ws(38),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: wms(22), fontWeight: '800', textAlign: 'center' },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ws(4),
    paddingHorizontal: ws(20),
  },
  heroLocation: { fontSize: wms(13), textAlign: 'center' },

  /* Info grid */
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: ws(10), rowGap: wvs(10) },
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: ws(14),
    gap: wvs(6),
  },
  tileIcon: {
    width: ws(30),
    height: ws(30),
    borderRadius: ws(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { fontSize: wms(10.5), fontWeight: '700', letterSpacing: 0.4 },
  tileValue: { fontSize: wms(14.5), fontWeight: '800' },

  /* Sections */
  section: { gap: wvs(8) },
  sectionTitle: { fontSize: wms(15), fontWeight: '800' },
  body: { fontSize: wms(13.5), lineHeight: wms(20) },
  readMore: { fontSize: wms(13), fontWeight: '700', color: COLORS.primary },

  /* Photos */
  photoRow: { gap: ws(10), paddingRight: ws(4) },
  photoThumb: { width: ws(88), height: ws(88), borderRadius: ws(14), borderWidth: 1 },
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoModalImage: { width: '100%', height: '80%' },
  photoModalClose: {
    position: 'absolute',
    top: wvs(50),
    right: ws(20),
    width: ws(40),
    height: ws(40),
    borderRadius: ws(20),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Map */
  mapPreview: { height: wvs(150), borderRadius: ws(16), borderWidth: 1, overflow: 'hidden' },

  /* Footer */
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: ws(20),
    paddingTop: wvs(14),
    paddingBottom: wvs(24),
    gap: wvs(10),
  },
  footerNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ws(8) },
  footerNoticeText: { fontSize: wms(13), fontWeight: '600' },
  footerBidNote: { fontSize: wms(12.5), textAlign: 'center' },
  primaryBtn: {
    height: wvs(54),
    borderRadius: ws(16),
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ws(8),
  },
  primaryBtnText: { fontSize: wms(16), fontWeight: '700', color: '#fff' },
});
