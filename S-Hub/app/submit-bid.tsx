import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';
import RequireVerifiedWorker from '@/components/RequireVerifiedWorker';
import { getServiceRequest, ServiceRequest } from '@/lib/api/serviceRequests';
import { createBid, listMyBids, WorkerBid } from '@/lib/api/workerBids';

const ARRIVAL_OPTIONS = ['15 min', '30 min', '1 hr', '2 hr+'];

export default function SubmitBidScreen() {
  const T = useThemeColors();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [existingBid, setExistingBid] = useState<WorkerBid | null>(null);
  const [bidAmountText, setBidAmountText] = useState('');
  const [arrival, setArrival] = useState('30 min');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const bidAmount = parseFloat(bidAmountText) || 0;

  useEffect(() => {
    (async () => {
      if (!params.requestId) {
        setLoading(false);
        return;
      }
      const [reqResult, bidsResult] = await Promise.all([
        getServiceRequest(params.requestId),
        listMyBids(),
      ]);
      if (reqResult.success && reqResult.data) setRequest(reqResult.data);
      if (bidsResult.success) {
        const activeBid = (bidsResult.data ?? []).find(
          (b) => b.request_id === params.requestId && (b.status === 'pending' || b.status === 'countered')
        );
        if (activeBid) setExistingBid(activeBid);
      }
      setLoading(false);
    })();
  }, [params.requestId]);

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

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/worker-dashboard' as any);
  };

  const suggestedRange = useMemo(() => {
    if (!request?.initial_offer_price) return null;
    const p = request.initial_offer_price;
    return `GH₵${Math.round(p * 0.85)} - GH₵${Math.round(p * 1.15)}`;
  }, [request]);

  if (loading) {
    return (
      <RequireVerifiedWorker>
        <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: T.bg }]} edges={['top']}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </SafeAreaView>
      </RequireVerifiedWorker>
    );
  }

  if (!request) {
    return (
      <RequireVerifiedWorker>
        <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: T.bg }]} edges={['top']}>
          <Ionicons name="alert-circle-outline" size={wms(40)} color={T.subText} />
          <Text style={[styles.emptyTitle, { color: T.text }]}>Job not found</Text>
          <Text style={[styles.emptySub, { color: T.subText }]}>This request may have been removed or already assigned.</Text>
          <TouchableOpacity style={styles.backLinkBtn} onPress={handleBack}>
            <Text style={styles.backLinkText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </RequireVerifiedWorker>
    );
  }

  if (submitted || existingBid) {
    const bid = submitted ? null : existingBid;
    return (
      <RequireVerifiedWorker>
        <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]} edges={['top']}>
          <StatusBar barStyle={T.statusBar} />
          <View style={[styles.container, styles.centered, { paddingHorizontal: ws(32) }]}>
            <View style={[styles.successIconWrap, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="paper-plane" size={wms(40)} color={COLORS.primary} />
            </View>
            <Text style={[styles.successTitle, { color: T.text }]}>Offer Sent</Text>
            <Text style={[styles.successSub, { color: T.subText }]}>
              Waiting for client{bid ? ` — you offered GH₵${bid.proposed_price} on this job.` : '.'}
              {'\n'}You'll be notified the instant they respond.
            </Text>
            <TouchableOpacity style={styles.backLinkBtn} onPress={handleBack}>
              <Text style={styles.backLinkText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </RequireVerifiedWorker>
    );
  }

  return (
    <RequireVerifiedWorker>
    <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]} edges={['top']}>
      <StatusBar barStyle={T.statusBar} />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={wms(24)} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.logo}>AdwumaGo</Text>
        <View style={[styles.avatarSmall, { backgroundColor: T.inputBg }]} />
      </View>

      <View style={styles.pageInner}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: T.text }]}>
              {request.category.charAt(0).toUpperCase() + request.category.slice(1)}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={wms(14)} color={T.subText} />
              <Text style={[styles.locationText, { color: T.subText }]}>
                {request.location_string ?? request.location_region ?? 'Location not specified'}
              </Text>
            </View>
          </View>
        </View>

        {!!request.description && (
          <Text style={[styles.description, { color: T.subText }]}>{request.description}</Text>
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
              <Text style={[styles.suggestedTitle, { color: COLORS.accentDark }]}>Client's asking price</Text>
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
    </SafeAreaView>
    </RequireVerifiedWorker>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: wvs(10) },
  pageInner: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ws(20), paddingVertical: wvs(12) },
  logo: { fontSize: wms(20), fontWeight: '900', color: COLORS.primary },
  avatarSmall: { width: ws(36), height: ws(36), borderRadius: ws(18) },
  scrollContent: { paddingHorizontal: ws(20), paddingBottom: wvs(40), gap: ws(20) },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontSize: wms(22), fontWeight: '800' },
  description: { fontSize: wms(13), lineHeight: wms(19), marginTop: wvs(-12) },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: ws(4), marginTop: wvs(4) },
  locationText: { fontSize: wms(13) },
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
