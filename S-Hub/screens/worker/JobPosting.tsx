/**
 * A worker's read-only view of one open service_request (from the dashboard
 * feed). Answers the bid decision fast — trade, budget, when, where — then
 * CTA -> SubmitBid. Shows the worker's own bid status if they've already bid.
 */
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
import Button from '@/components/ui/Button';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/ui/EmptyState';
import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';
import { getServiceRequest, ServiceRequest } from '@/lib/api/serviceRequests';
import { listMyBids, WorkerBid } from '@/lib/api/workerBids';
import { openInMaps, hasMappableLocation } from '@/lib/openInMaps';
import { categoryIcon, categoryLabel } from '@/constants/categories';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'JobPosting'>;

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** "Wed, 8 Jan · 2:00 PM" — matches WorkerDashboard's job cards. */
function scheduleLine(iso: string | null): string {
  if (!iso) return 'Flexible timing';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Flexible timing';
  return (
    d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
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
      const [reqResult, bidsResult] = await Promise.all([getServiceRequest(requestId), listMyBids()]);
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

  const category = categoryLabel(request.category);
  const icon = categoryIcon(request.category);
  const locationText = request.location_string ?? request.location_region ?? 'Location not specified';
  const hasPrice = request.initial_offer_price != null;
  const isOpen = request.status === 'seeking_bids';
  const descLong = (request.description?.length ?? 0) > 200;

  const mapsTarget = {
    latitude: request.latitude,
    longitude: request.longitude,
    label: request.location_string ?? request.location_region,
  };
  const canOpenMaps = hasMappableLocation(mapsTarget);
  const hasCoords = request.latitude != null && request.longitude != null;
  const openJobLocation = () => openInMaps(mapsTarget);

  const goToBid = () => navigation.navigate('SubmitBid', { requestId });

  return shell(
    <View style={styles.pageInner}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Job header ── */}
        <View style={styles.header}>
          <View style={[styles.catIcon, { backgroundColor: T.inputBg }]}>
            <Ionicons name={icon as any} size={wms(22)} color={COLORS.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: T.text }]}>{category}</Text>
            <TouchableOpacity
              style={styles.locRow}
              onPress={openJobLocation}
              disabled={!canOpenMaps}
              activeOpacity={0.7}
              accessibilityRole={canOpenMaps ? 'button' : undefined}
              accessibilityLabel={canOpenMaps ? 'Open job location in maps' : undefined}
            >
              <Ionicons
                name="location-outline"
                size={wms(13)}
                color={canOpenMaps ? COLORS.primary : T.subText}
              />
              <Text
                style={[styles.locText, { color: canOpenMaps ? COLORS.primary : T.subText }]}
                numberOfLines={2}
              >
                {locationText}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.metaLine, { color: T.subText }]}>
              Posted {timeAgo(request.created_at)} · {scheduleLine(request.scheduled_for)}
            </Text>
          </View>
        </View>

        {/* ── Budget ── the number a worker is really here for ── */}
        <View style={styles.budget}>
          <Text style={styles.budgetLabel}>{hasPrice ? "Client's budget" : 'Budget'}</Text>
          <Text style={styles.budgetValue}>
            {hasPrice ? `GH₵ ${request.initial_offer_price}` : 'Open — client wants offers'}
          </Text>
          <Text style={styles.budgetHint}>
            {hasPrice ? 'Your bid can be above or below this.' : 'Name your price when you bid.'}
          </Text>
        </View>

        {/* ── Description ── */}
        {!!request.description && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: T.text }]}>Job description</Text>
            <Text
              style={[styles.body, { color: T.text }]}
              numberOfLines={descExpanded || !descLong ? undefined : 5}
            >
              {request.description}
            </Text>
            {descLong && (
              <TouchableOpacity onPress={() => setDescExpanded((v) => !v)} hitSlop={8} activeOpacity={0.7}>
                <Text style={styles.readMore}>{descExpanded ? 'Show less' : 'Read more'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Photos ── */}
        {request.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: T.text }]}>Photos from the client</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {request.photos.map((uri) => (
                <TouchableOpacity key={uri} onPress={() => setPreviewPhoto(uri)} activeOpacity={0.85}>
                  <Image source={{ uri }} style={[styles.photoThumb, { borderColor: T.border }]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Where ── */}
        {canOpenMaps && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: T.text }]}>Where</Text>
            {hasCoords && (
              <TouchableOpacity
                style={[styles.mapPreview, { borderColor: T.border }]}
                onPress={openJobLocation}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Open job location in maps"
              >
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  <AppMap
                    latitude={request.latitude!}
                    longitude={request.longitude!}
                    zoom={0.02}
                    markers={[{ latitude: request.latitude!, longitude: request.longitude!, color: COLORS.primary }]}
                    zoomEnabled={false}
                    scrollEnabled={false}
                  />
                </View>
              </TouchableOpacity>
            )}
            <Button
              variant="secondary"
              label={hasCoords ? 'Get directions' : 'Open in Maps'}
              icon={<Ionicons name="navigate-outline" size={wms(16)} color={COLORS.primary} />}
              onPress={openJobLocation}
            />
          </View>
        )}
      </ScrollView>

      {/* ── Footer CTA ── */}
      <View style={[styles.footer, { backgroundColor: T.card, borderTopColor: T.border }]}>
        {!isOpen ? (
          <View style={styles.footerNotice}>
            <Ionicons name="lock-closed-outline" size={wms(15)} color={T.subText} />
            <Text style={[styles.footerNoticeText, { color: T.subText }]}>
              This job isn&apos;t accepting bids anymore.
            </Text>
          </View>
        ) : myBid ? (
          <>
            <Text style={[styles.footerBidNote, { color: T.subText }]}>
              Your offer{' '}
              <Text style={{ fontWeight: '800', color: T.text }}>GH₵ {myBid.proposed_price}</Text>
              {myBid.status === 'countered' ? ' · client countered' : ' · waiting for client'}
            </Text>
            <Button variant="secondary" label="View your offer" onPress={goToBid} />
          </>
        ) : (
          <Button
            label="Place a bid"
            icon={<Ionicons name="pricetag-outline" size={wms(18)} color="#fff" />}
            onPress={goToBid}
          />
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
  scroll: { paddingHorizontal: ws(20), paddingTop: wvs(18), paddingBottom: wvs(28), gap: wvs(20) },

  backLink: { alignSelf: 'center', paddingVertical: wvs(12) },
  backLinkText: { fontSize: wms(14), fontWeight: '700', color: COLORS.primary },

  /* Job header */
  header: { flexDirection: 'row', gap: ws(12), alignItems: 'flex-start' },
  catIcon: {
    width: ws(44),
    height: ws(44),
    borderRadius: ws(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: wvs(3) },
  title: { fontSize: wms(21), fontWeight: '800', letterSpacing: -0.3 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: ws(4) },
  locText: { flex: 1, fontSize: wms(13), fontWeight: '600' },
  metaLine: { fontSize: wms(12), marginTop: wvs(1) },

  /* Budget */
  budget: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    paddingVertical: wvs(16),
    paddingHorizontal: ws(18),
    gap: wvs(3),
  },
  budgetLabel: { fontSize: wms(12), fontWeight: '700', color: COLORS.primaryDark },
  budgetValue: { fontSize: wms(25), fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5 },
  budgetHint: { fontSize: wms(11.5), color: COLORS.primaryDark, opacity: 0.75 },

  /* Sections */
  section: { gap: wvs(9) },
  sectionTitle: { fontSize: wms(15), fontWeight: '800', letterSpacing: -0.2 },
  body: { fontSize: wms(13.5), lineHeight: wms(20) },
  readMore: { fontSize: wms(13), fontWeight: '700', color: COLORS.primary },

  /* Photos */
  photoRow: { gap: ws(10), paddingRight: ws(4) },
  photoThumb: { width: ws(96), height: ws(96), borderRadius: ws(14), borderWidth: 1 },
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
  mapPreview: { height: wvs(150), borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },

  /* Footer */
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: ws(20),
    paddingTop: wvs(12),
    paddingBottom: wvs(22),
    gap: wvs(9),
  },
  footerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ws(8),
    paddingVertical: wvs(12),
  },
  footerNoticeText: { fontSize: wms(13), fontWeight: '600' },
  footerBidNote: { fontSize: wms(12.5), textAlign: 'center' },
});
