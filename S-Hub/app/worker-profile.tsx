import { COLORS } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Share,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';

function initialsFromName(name?: string) {
  return (name || 'Worker')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'WK';
}

function mapWorker(worker: any) {
  const name = worker.display_name || worker.user?.full_name || 'Worker';
  const location = [worker.city, worker.region].filter(Boolean).join(', ') || 'Location not shared';
  return {
    id: worker.id,
    userId: worker.user_id,
    name,
    initials: initialsFromName(name),
    photo: worker.user?.profile_picture as string | undefined,
    service: worker.occupation || 'Skilled Worker',
    rating: worker.rating ?? 0,
    reviewsCount: worker.total_reviews ?? 0,
    location,
    jobs: worker.completed_jobs ?? 0,
    completionRate: worker.completion_rate,
    experience: worker.years_of_experience,
    responseTime: worker.response_time,
    price: worker.hourly_rate ?? 0,
    about: worker.bio || 'This worker has not added a bio yet.',
    verified: Boolean(worker.is_verified),
    available: Boolean(worker.is_available),
    skills: Array.isArray(worker.skills) ? worker.skills : [],
  };
}

type WorkerProfile = ReturnType<typeof mapWorker>;

/* ─── Star row ─── */
function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={13}
          color="#F59E0B"
        />
      ))}
    </View>
  );
}

/* ─── Review card ─── */
function ReviewCard({ review }: { review: any }) {
  return (
    <View style={rc.card}>
      <View style={rc.top}>
        <View style={rc.avatar}>
          <Ionicons name="person" size={16} color={COLORS.primary} />
        </View>
        <View style={rc.info}>
          <Text style={rc.author}>{review.is_verified ? 'Verified Customer' : 'Customer'}</Text>
          <Stars rating={review.rating} />
        </View>
        <Text style={rc.date}>{review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}</Text>
      </View>
      {!!review.comment && <Text style={rc.text}>{review.comment}</Text>}
    </View>
  );
}
const rc = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EDEDED', marginBottom: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E6F4EE', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 3 },
  author: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  date: { fontSize: 11, color: COLORS.muted },
  text: { fontSize: 13, color: '#444', lineHeight: 19 },
});

/* ─── Main screen ─── */
export default function WorkerProfileScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    const workerId = Number(id);
    if (!workerId) { setLoading(false); return; }
    setLoading(true);
    api.getWorker(workerId)
      .then(result => {
        if (!mounted) return;
        const mapped = mapWorker(result.worker);
        setWorker(mapped);
        if (mapped.userId) {
          api.getWorkerReviews(mapped.userId).then(r => mounted && setReviewsList(r.items || [])).catch(() => {});
        }
      })
      .catch(() => mounted && setWorker(null))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [id]);

  const handleShare = () => {
    if (!worker) return;
    Share.share({
      title: `${worker.name} – ${worker.service} on Vaker`,
      message: `Check out ${worker.name}, a ${worker.service} on Vaker! ⭐ ${worker.rating} · ${worker.jobs} jobs done.\nhttps://vaker.com.gh`,
    });
  };

  const openChat = () => {
    if (!worker?.userId) return;
    router.push({ pathname: '/chat', params: { userId: worker.userId, name: worker.name } } as any);
  };

  if (loading) {
    return <SafeAreaView style={[s.safe, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={COLORS.primary} /></SafeAreaView>;
  }

  if (!worker) {
    return (
      <SafeAreaView style={[s.safe, { alignItems: 'center', justifyContent: 'center', padding: 40 }]}>
        <Ionicons name="person-remove-outline" size={48} color={COLORS.muted} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginTop: 14 }}>Worker not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const detailRows = [
    { icon: 'cash-outline', label: 'Starting price', value: `GH₵ ${worker.price}` },
    worker.experience != null ? { icon: 'briefcase-outline', label: 'Experience', value: `${worker.experience} yrs` } : null,
    worker.responseTime != null ? { icon: 'time-outline', label: 'Response time', value: `${worker.responseTime} min` } : null,
    { icon: 'location-outline', label: 'Location', value: worker.location },
  ].filter(Boolean) as { icon: string; label: string; value: string }[];

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>

        {/* ── HERO ── */}
        <View style={[s.hero, { backgroundColor: COLORS.primary }]}>
          {/* Top action bar */}
          <View style={s.heroTopBar}>
            <TouchableOpacity style={s.heroBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={s.heroActions}>
              <TouchableOpacity style={s.heroBtn} onPress={handleShare} activeOpacity={0.8}>
                <Ionicons name="share-social-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={s.heroBtn} onPress={() => setSaved(v => !v)} activeOpacity={0.8}>
                <Ionicons name={saved ? 'heart' : 'heart-outline'} size={20} color={saved ? '#FF6B6B' : '#fff'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar */}
          <View style={s.avatarWrap}>
            {worker.photo ? (
              <Image source={{ uri: worker.photo }} style={s.avatarImg} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarInitials}>{worker.initials}</Text>
              </View>
            )}
            {worker.available && <View style={s.onlineDot} />}
          </View>

          {/* Name + badge */}
          <View style={s.heroNameRow}>
            <Text style={s.heroName}>{worker.name}</Text>
            {worker.verified && (
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            )}
          </View>
          <Text style={s.heroService}>{worker.service}</Text>

          {/* Rating + location */}
          <View style={s.heroMeta}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={s.heroMetaText}>{worker.rating} ({worker.reviewsCount} reviews)</Text>
            <View style={s.heroDot} />
            <Ionicons name="location-sharp" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={s.heroMetaText}>{worker.location}</Text>
          </View>
        </View>

        {/* ── STATS STRIP ── */}
        <View style={s.statsStrip}>
          {[
            { value: String(worker.jobs), label: 'Jobs Done' },
            { value: String(worker.rating), label: 'Rating' },
            { value: worker.completionRate != null ? `${worker.completionRate}%` : '—', label: 'Completion' },
            { value: worker.experience != null ? `${worker.experience} yrs` : '—', label: 'Experience' },
          ].map((stat, i, arr) => (
            <View key={stat.label} style={[s.stat, i < arr.length - 1 && s.statBorder]}>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.body}>

          {/* ── ABOUT ── */}
          <Text style={s.sectionTitle}>About</Text>
          <Text style={s.aboutText}>{worker.about}</Text>

          {/* ── PRIMARY ACTIONS (inline) ── */}
          <View style={s.inlineActions}>
            <TouchableOpacity
              style={s.msgBtn}
              activeOpacity={0.85}
              onPress={openChat}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={17} color={COLORS.primary} />
              <Text style={s.msgBtnText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.hireBtn}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/post-job', params: { workerId: worker.userId, workerName: worker.name } } as any)}
            >
              <Text style={s.hireBtnText}>Hire Now</Text>
            </TouchableOpacity>
          </View>

          {/* ── SKILLS ── */}
          {worker.skills.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Skills & Services</Text>
              <View style={s.skillsGrid}>
                {worker.skills.map((sk: string) => (
                  <View key={sk} style={s.skillChip}>
                    <Text style={s.skillText}>{sk}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── DETAILS ── */}
          <Text style={s.sectionTitle}>Details</Text>
          <View style={s.detailCard}>
            {detailRows.map((row, i) => (
              <View key={row.label}>
                {i > 0 && <View style={s.detailDivider} />}
                <View style={s.detailRow}>
                  <Ionicons name={row.icon as any} size={18} color={COLORS.primary} />
                  <Text style={s.detailLabel}>{row.label}</Text>
                  <Text style={s.detailValue}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── REVIEWS ── */}
          <View style={s.reviewsHeader}>
            <Text style={s.sectionTitle}>Reviews</Text>
            <View style={s.reviewsSummary}>
              <Ionicons name="star" size={15} color="#F59E0B" />
              <Text style={s.reviewsSummaryText}>{worker.rating} · {worker.reviewsCount} reviews</Text>
            </View>
          </View>

          {reviewsList.length > 0 ? (
            reviewsList.map((rev) => <ReviewCard key={rev.id} review={rev} />)
          ) : (
            <Text style={{ fontSize: 13, color: COLORS.muted, marginBottom: 10 }}>No reviews yet.</Text>
          )}

          {/* ── REPORT ── */}
          <TouchableOpacity
            style={s.reportBtn}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Report', 'Report this worker for inappropriate behaviour?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Report', style: 'destructive' },
            ])}
          >
            <Ionicons name="flag-outline" size={14} color={COLORS.muted} />
            <Text style={s.reportText}>Report this worker</Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* ── STICKY BOTTOM CTA ── */}
      <View style={s.bottomBar}>
        <View style={s.bottomPrice}>
          <Text style={s.bottomPriceLabel}>Starting from</Text>
          <Text style={s.bottomPriceValue}>GH₵ {worker.price}</Text>
        </View>
        <View style={s.bottomActions}>
          <TouchableOpacity
            style={s.bottomMsgBtn}
            activeOpacity={0.85}
            onPress={openChat}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.primary} />
            <Text style={s.bottomMsgText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.bottomHireBtn}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/post-job', params: { workerId: worker.userId, workerName: worker.name } } as any)}
          >
            <Text style={s.bottomHireText}>Hire Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F0' },

  /* Hero */
  hero: { paddingBottom: 28, paddingTop: 52 },
  heroTopBar: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  heroActions: { flexDirection: 'row', gap: 8 },
  heroBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarWrap: { alignSelf: 'center', position: 'relative', marginBottom: 14 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatarImg: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatarInitials: { fontSize: 38, fontWeight: '900', color: '#fff' },
  onlineDot: { position: 'absolute', bottom: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#22C55E', borderWidth: 3, borderColor: '#fff' },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 4 },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroService: { textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 10, fontWeight: '500' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  heroMetaText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  heroDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)' },

  /* Stats strip */
  statsStrip: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F0F0F0' },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statBorder: { borderRightWidth: 1, borderColor: '#F0F0F0' },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginBottom: 2 },
  statLabel: { fontSize: 10, color: COLORS.muted, fontWeight: '500' },

  /* Body */
  body: { paddingHorizontal: 16, paddingTop: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 10, marginTop: 4 },
  aboutText: { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 18 },

  /* Inline actions */
  inlineActions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  msgBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 12, paddingVertical: 12 },
  msgBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  hireBtn: { flex: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  hireBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  /* Skills */
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  skillChip: { backgroundColor: COLORS.primary + '14', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  skillText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },

  /* Detail card */
  detailCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#EDEDED', marginBottom: 22, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  detailLabel: { flex: 1, fontSize: 13, color: '#555', fontWeight: '500' },
  detailValue: { fontSize: 13, color: '#1A1A1A', fontWeight: '700' },
  detailDivider: { height: 1, backgroundColor: '#F2F2F2', marginHorizontal: 16 },

  /* Reviews */
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  reviewsSummary: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reviewsSummaryText: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },

  /* Report */
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 4 },
  reportText: { fontSize: 12, color: COLORS.muted, fontWeight: '500' },

  /* Sticky bottom bar */
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#EBEBEB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 10 },
  bottomPrice: { gap: 2 },
  bottomPriceLabel: { fontSize: 10, color: COLORS.muted, fontWeight: '500' },
  bottomPriceValue: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  bottomActions: { flexDirection: 'row', gap: 10 },
  bottomMsgBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  bottomMsgText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  bottomHireBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 10, shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  bottomHireText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
