/**
 * Place or update a bid on a request: propose a price and an optional message.
 * Blocked server-side from bidding on the worker's own job.
 */
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';
import AppMap from '@/components/AppMap';
import { Wordmark } from '@/components/Logo';
import { getServiceRequest, ServiceRequest } from '@/lib/api/serviceRequests';
import { createBid, listMyBids, WorkerBid } from '@/lib/api/workerBids';
import { openInMaps, hasMappableLocation } from '@/lib/openInMaps';
import type { RootStackParamList } from '@/navigation/types';

const ARRIVAL_OPTIONS = ['15 min', '30 min', '1 hr', '2 hr+'];

type Props = NativeStackScreenProps<RootStackParamList, 'SubmitBid'>;

export default function SubmitBidScreen({ route, navigation }: Props) {
  const T = useThemeColors();
  const params = route.params ?? {};
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [existingBid, setExistingBid] = useState<WorkerBid | null>(null);
  const [bidAmountText, setBidAmountText] = useState('');
  const [arrival, setArrival] = useState('30 min');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const bidAmount = parseFloat(bidAmountText) || 0;

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('WorkerTabs', { screen: 'worker-dashboard' });
  };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const pageHeader = (
    <View style={styles.pageHeader}>
      <TouchableOpacity onPress={handleBack} hitSlop={8} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={22} color={T.text} />
      </TouchableOpacity>
      <Wordmark size={wms(18)} />
      <View style={[styles.avatarSmall, { backgroundColor: T.inputBg }]} />
    </View>
  );

  useEffect(() => {
    (async () => {
      if (!params.requestId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(false);
      const [reqResult, bidsResult] = await Promise.all([
        getServiceRequest(params.requestId),
        listMyBids(),
      ]);
      if (reqResult.success && reqResult.data) {
        setRequest(reqResult.data);
      } else if (!reqResult.success) {
        setLoadError(true);
      }
      if (bidsResult.success) {
        const activeBid = (bidsResult.data ?? []).find(
          (b) => b.request_id === params.requestId && (b.status === 'pending' || b.status === 'countered')
        );
        if (activeBid) setExistingBid(activeBid);
      }
      setLoading(false);
    })();
  }, [params.requestId, reloadKey]);

  const handleSubmit = async () => {
    if (!params.requestId || bidAmount <= 0) return;
    setError('');
    setSubmitting(true);

    const fullMessage = [`ETA: ${arrival}.`, note.trim()].filter(Boolean).join(' ');
    const result = await createBid({
      requestId: params.requestId,
      proposedPrice: bidAmount,
      message: fullMessage,
    });

    setSubmitting(false);
    if (!result.success) {
      if (result.error?.toLowerCase().includes('duplicate') || result.error?.toLowerCase().includes('unique')) {
        setError("You've already got an active offer on this job.");
      } else {
        setError(result.error ?? 'Could not submit your bid.');
      }
      return;
    }
    setSubmitted(true);
  };

  const suggestedRange = useMemo(() => {
    if (!request?.initial_offer_price) return null;
    const p = request.initial_offer_price;
    return `GH₵${Math.round(p * 0.85)} - GH₵${Math.round(p * 1.15)}`;
  }, [request]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]} edges={['top']}>
        {pageHeader}
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]} edges={['top']}>
        {pageHeader}
        <View style={styles.centered}>
        <Ionicons
          name={loadError ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={wms(40)}
          color={loadError ? COLORS.danger + '80' : T.subText}
        />
        <Text style={[styles.emptyTitle, { color: T.text }]}>{loadError ? "Couldn't load this job" : 'Job not found'}</Text>
        <Text style={[styles.emptySub, { color: T.subText }]}>
          {loadError ? 'Check your connection and try again.' : 'This request may have been removed or already assigned.'}
        </Text>
        {loadError && (
          <TouchableOpacity style={[styles.backLinkBtn, { backgroundColor: COLORS.danger }]} onPress={() => setReloadKey((k) => k + 1)}>
            <Text style={[styles.backLinkText, { color: '#fff' }]}>Retry</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.backLinkBtn} onPress={handleBack}>
          <Text style={styles.backLinkText}>Back to Dashboard</Text>
        </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (submitted || existingBid) {
    const bid = submitted ? null : existingBid;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]} edges={['top']}>
        <StatusBar barStyle={T.statusBar} />
        {pageHeader}
        <View style={[styles.container, styles.centered, { paddingHorizontal: ws(32) }]}>
          <View style={[styles.successIconWrap, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="paper-plane" size={wms(40)} color={COLORS.primary} />
          </View>
          <Text style={[styles.successTitle, { color: T.text }]}>Offer Sent</Text>
          <Text style={[styles.successSub, { color: T.subText }]}>
            Waiting for client{bid ? ` — you offered GH₵${bid.proposed_price} on this job.` : '.'}
            {'\n'}You&apos;ll be notified the instant they respond.
          </Text>
          <TouchableOpacity style={styles.backLinkBtn} onPress={handleBack}>
            <Text style={styles.backLinkText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const mapsTarget = {
    latitude: request.latitude,
    longitude: request.longitude,
    label: request.location_string ?? request.location_region,
  };
  const canOpenMaps = hasMappableLocation(mapsTarget);
  const openJobLocation = () => openInMaps(mapsTarget);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]} edges={['top']}>
      <StatusBar barStyle={T.statusBar} />
      {pageHeader}

      <View style={styles.pageInner}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: T.text }]}>
              {request.category.charAt(0).toUpperCase() + request.category.slice(1)}
            </Text>
            {canOpenMaps ? (
              <TouchableOpacity
                style={styles.locationRow}
                onPress={openJobLocation}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Open job location in maps"
              >
                <Ionicons name="location-outline" size={wms(14)} color={COLORS.primary} />
                <Text style={[styles.locationText, styles.locationLink]}>
                  {request.location_string ?? request.location_region ?? 'Location not specified'}
                </Text>
                <Ionicons name="open-outline" size={wms(12)} color={COLORS.primary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={wms(14)} color={T.subText} />
                <Text style={[styles.locationText, { color: T.subText }]}>
                  {request.location_string ?? request.location_region ?? 'Location not specified'}
                </Text>
              </View>
            )}
            {(() => {
              const schedLabel = request.scheduled_for ? (() => {
                try {
                  const d = new Date(request.scheduled_for);
                  if (isNaN(d.getTime())) return null;
                  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                } catch { return null; }
              })() : null;
              return (
                <View style={styles.locationRow}>
                  <Ionicons name="calendar-outline" size={wms(14)} color={T.subText} />
                  <Text style={[styles.locationText, { color: T.subText }]}>
                    {schedLabel ?? 'Schedule flexible'}
                  </Text>
                </View>
              );
            })()}
          </View>
        </View>

        {!!request.description && (
          <Text style={[styles.description, { color: T.subText }]}>{request.description}</Text>
        )}

        {request.photos.length > 0 && (
          <View>
            <Text style={[styles.label, { color: T.subText }]}>PHOTOS FROM CLIENT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {request.photos.map((uri) => (
                <TouchableOpacity key={uri} onPress={() => setPreviewPhoto(uri)} activeOpacity={0.85}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {canOpenMaps && (
          <View>
            <Text style={[styles.label, { color: T.subText }]}>JOB LOCATION</Text>
            {request.latitude != null && request.longitude != null && (
              <TouchableOpacity
                style={[styles.mapPreview, { borderColor: T.border }]}
                onPress={openJobLocation}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Open job location in maps"
              >
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  <AppMap
                    latitude={request.latitude}
                    longitude={request.longitude}
                    zoom={0.02}
                    markers={[{ latitude: request.latitude, longitude: request.longitude, color: COLORS.primary }]}
                    zoomEnabled={false}
                    scrollEnabled={false}
                  />
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.directionsBtn, { borderColor: COLORS.primary }]}
              onPress={openJobLocation}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate-outline" size={wms(16)} color={COLORS.primary} />
              <Text style={styles.directionsBtnText}>
                {request.latitude != null && request.longitude != null
                  ? 'Get directions'
                  : 'Open in Maps'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border }]}>
          <Text style={[styles.label, { color: T.subText }]}>YOUR BID AMOUNT</Text>
          <View style={[styles.inputBox, { backgroundColor: T.inputBg, borderColor: T.border }]}>
            <Text style={styles.currencyPrefix}>GH₵</Text>
            <TextInput
              style={[styles.input, { color: T.text }]}
              placeholder="0.00"
              placeholderTextColor={T.subText}
              keyboardType="decimal-pad"
              value={bidAmountText}
              onChangeText={setBidAmountText}
            />
          </View>

          <View style={[styles.suggestedBox, { backgroundColor: COLORS.accentLight }]}>
            <Ionicons name="information-circle-outline" size={wms(18)} color={COLORS.accentDark} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.suggestedTitle, { color: COLORS.accentDark }]}>Client&apos;s asking price</Text>
              <Text style={[styles.suggestedBody, { color: T.text }]}>
                {request.initial_offer_price != null ? `GH₵${request.initial_offer_price}` : 'Open — client is asking for offers'}
                {suggestedRange ? ` · Typical range ${suggestedRange}` : ''}
              </Text>
            </View>
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: T.subText }]}>ESTIMATED ARRIVAL</Text>
          <View style={styles.arrivalRow}>
            {ARRIVAL_OPTIONS.map((opt) => {
              const active = opt === arrival;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.arrivalChip,
                    { backgroundColor: T.card, borderColor: T.border },
                    active && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
                  ]}
                  onPress={() => setArrival(opt)}
                >
                  <Text style={[styles.arrivalChipText, { color: T.text }, active && { color: '#fff' }]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: T.subText }]}>NOTE TO CLIENT (OPTIONAL)</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: T.inputBg, borderColor: T.border, color: T.text }]}
            multiline
            placeholder="I have the tools ready and I'm just around the corner. I can fix this quickly for you…"
            placeholderTextColor={T.subText}
            value={note}
            onChangeText={setNote}
          />
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: T.card, borderTopColor: T.border }]}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={bidAmount <= 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={wms(18)} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Bid</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      </View>

      <Modal visible={previewPhoto !== null} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
        <TouchableOpacity style={styles.photoModalBackdrop} activeOpacity={1} onPress={() => setPreviewPhoto(null)}>
          {previewPhoto && <Image source={{ uri: previewPhoto }} style={styles.photoModalImage} resizeMode="contain" />}
          <TouchableOpacity style={styles.photoModalClose} onPress={() => setPreviewPhoto(null)} hitSlop={12}>
            <Ionicons name="close" size={wms(24)} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ws(16), paddingTop: wvs(12), paddingBottom: wvs(4) },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: wvs(10) },
  pageInner: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center' },
  logo: { fontSize: wms(20), fontWeight: '900', color: COLORS.primary },
  avatarSmall: { width: ws(36), height: ws(36), borderRadius: ws(18) },
  scrollContent: { paddingHorizontal: ws(20), paddingBottom: wvs(40), gap: ws(20) },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontSize: wms(22), fontWeight: '800' },
  description: { fontSize: wms(13), lineHeight: wms(19), marginTop: wvs(-12) },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: ws(4), marginTop: wvs(4) },
  locationText: { fontSize: wms(13) },
  locationLink: { color: COLORS.primary, fontWeight: '700' },
  photoRow: { gap: ws(10), paddingRight: ws(4) },
  photoThumb: { width: ws(88), height: ws(88), borderRadius: ws(14) },
  mapPreview: { height: wvs(140), borderRadius: ws(16), borderWidth: ws(1), overflow: 'hidden' },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ws(8),
    height: wvs(44),
    borderRadius: ws(12),
    borderWidth: ws(1.5),
    marginTop: wvs(10),
  },
  directionsBtnText: { fontSize: wms(14), fontWeight: '700', color: COLORS.primary },
  photoModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  photoModalImage: { width: '100%', height: '80%' },
  photoModalClose: { position: 'absolute', top: wvs(50), right: ws(20), width: ws(40), height: ws(40), borderRadius: ws(20), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: ws(1), borderRadius: ws(20), padding: ws(16), gap: ws(12) },
  label: { fontSize: wms(11), fontWeight: '700', letterSpacing: wms(0.5), marginBottom: wvs(8) },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: ws(10), borderWidth: ws(1), borderRadius: ws(14), height: wvs(56), paddingHorizontal: ws(14) },
  currencyPrefix: { fontSize: wms(18), fontWeight: '800', color: COLORS.primary },
  input: { flex: 1, fontSize: wms(22), fontWeight: '700', padding: 0 },
  suggestedBox: { flexDirection: 'row', gap: ws(10), borderRadius: ws(14), padding: ws(12) },
  suggestedTitle: { fontSize: wms(13), fontWeight: '800', marginBottom: wvs(2) },
  suggestedBody: { fontSize: wms(13) },
  arrivalRow: { flexDirection: 'row', gap: ws(8) },
  arrivalChip: { flex: 1, borderWidth: ws(1), borderRadius: ws(14), paddingVertical: wvs(12), alignItems: 'center' },
  arrivalChipText: { fontSize: wms(13), fontWeight: '700' },
  textArea: { minHeight: wvs(120), borderWidth: ws(1), borderRadius: ws(16), padding: ws(14), fontSize: wms(14), textAlignVertical: 'top' },
  errorText: { color: COLORS.danger, fontSize: wms(13), textAlign: 'center' },
  footer: { borderTopWidth: ws(1), paddingHorizontal: ws(20), paddingTop: wvs(14), paddingBottom: wvs(24) },
  submitButton: {
    height: wvs(56), borderRadius: ws(16), backgroundColor: COLORS.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ws(8),
  },
  submitButtonText: { fontSize: wms(16), fontWeight: '700', color: '#fff' },

  /* Empty / not-found */
  emptyTitle: { fontSize: wms(17), fontWeight: '700' },
  emptySub: { fontSize: wms(13), textAlign: 'center', paddingHorizontal: ws(20) },

  /* Success / already-bid */
  successIconWrap: { width: ws(88), height: ws(88), borderRadius: ws(44), alignItems: 'center', justifyContent: 'center', marginBottom: wvs(20) },
  successTitle: { fontSize: wms(24), fontWeight: '800', marginBottom: wvs(10) },
  successSub: { fontSize: wms(14), lineHeight: wms(21), textAlign: 'center', marginBottom: wvs(28) },
  backLinkBtn: { paddingHorizontal: ws(20), paddingVertical: wvs(12) },
  backLinkText: { fontSize: wms(14), fontWeight: '700', color: COLORS.primary },
});
