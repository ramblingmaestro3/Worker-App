import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import CustomerNav from '@/components/CustomerNav';
import { getServiceRequest, ServiceRequest } from '@/lib/api/serviceRequests';
import { listBidsForRequest, acceptBid, counterBid, declineBid, BidWithWorker } from '@/lib/api/workerBids';
import { subscribeToRequestBids, unsubscribe } from '@/lib/api/realtime';

function effectivePrice(bid: BidWithWorker): number {
  return bid.status === 'countered' && bid.counter_price != null ? bid.counter_price : bid.proposed_price;
}

export default function BidComparisonScreen() {
  const T = useThemeColors();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [bids, setBids] = useState<BidWithWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingBidId, setRespondingBidId] = useState<string | null>(null);
  const [counterBidId, setCounterBidId] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState('');

  const refetchBids = useCallback(async () => {
    if (!requestId) return;
    const result = await listBidsForRequest(requestId);
    if (result.success) setBids(result.data ?? []);
  }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let channel: ReturnType<typeof subscribeToRequestBids> | null = null;

      (async () => {
        if (!requestId) {
          setLoading(false);
          return;
        }
        setLoading(true);
        const [reqResult, bidsResult] = await Promise.all([getServiceRequest(requestId), listBidsForRequest(requestId)]);
        if (cancelled) return;
        if (reqResult.success) setRequest(reqResult.data ?? null);
        if (bidsResult.success) setBids(bidsResult.data ?? []);
        setLoading(false);

        channel = subscribeToRequestBids(requestId, (bid) => {
          setBids((prev) => {
            const exists = prev.some((b) => b.id === bid.id);
            if (exists) return prev.map((b) => (b.id === bid.id ? { ...b, ...bid } : b));
            return prev;
          });
          // A brand-new bid arrives over realtime without the joined worker
          // profile — refetch once to pick it up rather than showing a blank name.
          if (!bids.some((b) => b.id === bid.id)) refetchBids();
        });
      })();

      return () => {
        cancelled = true;
        if (channel) unsubscribe(channel);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestId])
  );

  const activeBids = bids.filter((b) => b.status === 'pending' || b.status === 'countered');
  const bestBidId = activeBids.length > 0
    ? activeBids.reduce((best, b) => (effectivePrice(b) < effectivePrice(best) ? b : best), activeBids[0]).id
    : null;

  const handleAccept = (bid: BidWithWorker) => {
    Alert.alert(
      `Accept ${bid.worker?.full_name ?? 'this worker'}?`,
      `This books them for GH₵ ${effectivePrice(bid)}. Your other bids on this job will be declined.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setRespondingBidId(bid.id);
            const result = await acceptBid(bid.id);
            setRespondingBidId(null);
            if (!result.success) {
              Alert.alert('Could Not Accept', result.error ?? 'Something went wrong.');
              return;
            }
            router.replace('/bookings' as any);
          },
        },
      ]
    );
  };

  const handleDecline = (bid: BidWithWorker) => {
    Alert.alert('Decline this bid?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setRespondingBidId(bid.id);
          const result = await declineBid(bid.id);
          setRespondingBidId(null);
          if (!result.success) {
            Alert.alert('Error', result.error ?? 'Could not decline this bid.');
            return;
          }
          setBids((prev) => prev.map((b) => (b.id === bid.id ? { ...b, status: 'declined' } : b)));
        },
      },
    ]);
  };

  const submitCounter = async (bid: BidWithWorker) => {
    const price = parseFloat(counterPrice);
    if (!price || price <= 0) return;
    setRespondingBidId(bid.id);
    const result = await counterBid(bid.id, { counterPrice: price });
    setRespondingBidId(null);
    if (!result.success) {
      Alert.alert('Error', result.error ?? 'Could not send counter-offer.');
      return;
    }
    setBids((prev) => prev.map((b) => (b.id === bid.id ? { ...b, status: 'countered', counter_price: price } : b)));
    setCounterBidId(null);
    setCounterPrice('');
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!requestId || !request) {
    return (
      <View style={[styles.container, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Ionicons name="document-text-outline" size={40} color={T.subText} />
        <Text style={{ color: T.text, fontSize: 15, fontWeight: '700', marginTop: 12, marginBottom: 16 }}>Request not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.logo}>AdwumaGo</Text>
        <View style={[styles.avatarSmall, { backgroundColor: T.inputBg }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollOuter}>
        <ScreenContent style={styles.scrollContent}>
        <View style={styles.contextBlock}>
          <View style={[styles.activePill, { backgroundColor: COLORS.primaryLight }]}>
            <Text style={styles.activePillText}>{request.status === 'seeking_bids' ? 'ACTIVE REQUEST' : request.status.toUpperCase()}</Text>
          </View>
          <Text style={[styles.requestTitle, { color: T.text }]}>
            {request.category.charAt(0).toUpperCase() + request.category.slice(1)}
          </Text>
          {!!request.description && (
            <Text style={[styles.requestDesc, { color: T.subText }]}>{request.description}</Text>
          )}
          {!!request.location_string && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={T.subText} />
              <Text style={[styles.locationText, { color: T.subText }]}>{request.location_string}</Text>
            </View>
          )}
        </View>

        {bids.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="hourglass-outline" size={36} color={T.subText} />
            <Text style={[styles.emptyTitle, { color: T.text }]}>No bids yet</Text>
            <Text style={[styles.emptySub, { color: T.subText }]}>Nearby workers will start bidding on this job shortly.</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {bids.map((bid) => {
              const isBest = bid.id === bestBidId;
              const isResponding = respondingBidId === bid.id;
              const isActive = bid.status === 'pending' || bid.status === 'countered';
              const isCountering = counterBidId === bid.id;

              return (
                <View
                  key={bid.id}
                  style={[
                    styles.bidCard,
                    { backgroundColor: T.card, borderColor: T.border },
                    isBest && isActive && { borderWidth: 2, borderColor: COLORS.accent },
                    !isActive && { opacity: 0.6 },
                  ]}
                >
                  {isBest && isActive && (
                    <View style={styles.bestValueRibbon}>
                      <Text style={styles.bestValueRibbonText}>BEST VALUE</Text>
                    </View>
                  )}

                  <View style={styles.bidTopRow}>
                    <View style={[styles.avatarLg, { backgroundColor: T.inputBg }]}>
                      <Ionicons name="person" size={28} color={T.subText} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.workerName, { color: T.text }]}>{bid.worker?.full_name ?? 'Worker'}</Text>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.verified} />
                      </View>
                      {bid.worker && (
                        <View style={styles.ratingRow}>
                          <Ionicons name="star" size={16} color={COLORS.star} />
                          <Text style={styles.ratingText}>
                            {bid.worker.rating_avg.toFixed(1)} ({bid.worker.rating_count} reviews)
                          </Text>
                        </View>
                      )}
                      <View style={styles.statusRow}>
                        <Text style={[styles.statusText, { color: T.subText }]}>
                          {bid.status === 'countered' ? "You've countered — waiting on worker" : bid.status === 'declined' ? 'Declined' : bid.status === 'withdrawn' ? 'Withdrawn by worker' : bid.status === 'accepted' ? 'Accepted' : 'Pending your response'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.priceCol}>
                      <Text style={styles.priceText}>GH₵ {effectivePrice(bid)}</Text>
                      {!!bid.message && <Text style={[styles.priceNote, { color: T.subText }]} numberOfLines={2}>{bid.message}</Text>}
                    </View>
                  </View>

                  {isActive && (
                    <>
                      <View style={styles.actionsRow}>
                        <TouchableOpacity
                          style={styles.acceptButton}
                          onPress={() => handleAccept(bid)}
                          disabled={isResponding}
                          activeOpacity={0.85}
                        >
                          {isResponding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.acceptButtonText}>Accept</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.messageButton, { borderColor: T.text }]}
                          activeOpacity={0.85}
                          onPress={() => router.push(`/worker-profile?id=${bid.worker_id}` as any)}
                        >
                          <Text style={[styles.messageButtonText, { color: T.text }]}>View Profile</Text>
                        </TouchableOpacity>
                      </View>

                      {isCountering ? (
                        <View style={styles.counterInputRow}>
                          <View style={[styles.counterAmountBox, { backgroundColor: T.inputBg }]}>
                            <Text style={{ color: COLORS.primary, fontWeight: '800' }}>GH₵</Text>
                            <TextInput
                              style={[styles.counterAmountInput, { color: T.text }]}
                              placeholder="0.00"
                              placeholderTextColor={T.subText}
                              keyboardType="decimal-pad"
                              value={counterPrice}
                              onChangeText={setCounterPrice}
                              autoFocus
                            />
                          </View>
                          <TouchableOpacity style={styles.counterSendBtn} onPress={() => submitCounter(bid)} disabled={isResponding}>
                            <Ionicons name="send" size={16} color="#fff" />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.counterCancelBtn} onPress={() => { setCounterBidId(null); setCounterPrice(''); }}>
                            <Ionicons name="close" size={18} color={T.subText} />
                          </TouchableOpacity>
                        </View>
                      ) : bid.status === 'pending' ? (
                        <View style={styles.bottomLinksRow}>
                          <TouchableOpacity style={styles.counterOfferRow} onPress={() => setCounterBidId(bid.id)}>
                            <Text style={[styles.counterOfferText, { color: T.subText }]}>Counter-offer</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.counterOfferRow} onPress={() => handleDecline(bid)}>
                            <Text style={[styles.counterOfferText, { color: COLORS.danger }]}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        )}
        </ScreenContent>
      </ScrollView>

      <CustomerNav active="jobs" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  logo: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  avatarSmall: { width: 40, height: 40, borderRadius: 20 },
  scrollOuter: { alignItems: 'center' },
  scrollContent: { width: '100%', paddingHorizontal: 20, paddingBottom: 120, gap: 16 },
  contextBlock: { gap: 4, marginBottom: 4 },
  activePill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, marginBottom: 4 },
  activePillText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  requestTitle: { fontSize: 22, fontWeight: '800' },
  requestDesc: { fontSize: 14, marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 20 },
  bidCard: { borderWidth: 1, borderRadius: 20, padding: 16, overflow: 'hidden' },
  bestValueRibbon: { position: 'absolute', top: 0, right: 0, backgroundColor: COLORS.accent, paddingHorizontal: 16, paddingVertical: 4, borderBottomLeftRadius: 16 },
  bestValueRibbonText: { fontSize: 11, fontWeight: '700', color: COLORS.accentDark },
  bidTopRow: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 12 },
  avatarLg: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  workerName: { fontSize: 18, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 13, color: COLORS.text },
  statusRow: { marginTop: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  priceCol: { alignItems: 'flex-end', maxWidth: 120 },
  priceText: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  priceNote: { fontSize: 11, textAlign: 'right', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  acceptButton: { flex: 1, height: 52, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  acceptButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  messageButton: { flex: 1, height: 52, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  messageButtonText: { fontSize: 15, fontWeight: '700' },
  bottomLinksRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 8 },
  counterOfferRow: { alignItems: 'center' },
  counterOfferText: { fontSize: 13, textDecorationLine: 'underline', fontWeight: '600' },
  counterInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  counterAmountBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  counterAmountInput: { flex: 1, fontSize: 14, padding: 0 },
  counterSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  counterCancelBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
