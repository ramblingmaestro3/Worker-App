import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';
import ScreenContent from '@/components/ScreenContent';
import EmptyState from '@/components/ui/EmptyState';
import { getWorkerProfile, preferredTimeShortLabel } from '@/lib/api/workerProfiles';
import { listReviewsForUser } from '@/lib/api/reviews';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Alert } from '@/lib/Alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkerProfile'>;

const DARK = '#1A1A1A';

function initialsOf(name: string): string {
    return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

const REVIEW_AVATAR_PALETTE = ['#7C3AED', '#D97706', '#1D6FBA', '#DC2626', '#0891B2', '#2FAE60'];
function colorForId(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
    return REVIEW_AVATAR_PALETTE[Math.abs(hash) % REVIEW_AVATAR_PALETTE.length];
}

function formatReviewDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type ViewModel = {
    workerId: string;
    name: string;
    initials: string;
    skillLabel: string;
    rating: number;
    reviewCount: number;
    price: number | null;
    bio: string | null;
    skills: string[];
    experience: string | null;
    preferredTimes: string[];
    reviews: { author: string; initials: string; color: string; rating: number; comment: string; date: string }[];
};

export default function WorkerProfileScreen({ route, navigation }: Props) {
    const T = useThemeColors();
    const { id, fromBooking } = route.params;

    useLayoutEffect(() => {
        navigation.setOptions({ headerTitle: 'Worker Profile' });
    }, [navigation]);

    const [vm, setVm] = useState<ViewModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [saved, setSaved] = useState(false);

    const load = useCallback(async (cancelledRef?: { current: boolean }) => {
        setLoading(true);
        setLoadError(false);
        const [result, reviewsResult] = await Promise.all([
            getWorkerProfile(id),
            listReviewsForUser(id),
        ]);
        if (cancelledRef?.current) return;
        if (!result.success || !result.data) {
            setLoadError(true);
            setLoading(false);
            return;
        }
        const w = result.data;
        const reviews = (reviewsResult.data ?? []).map((r) => ({
            author: r.reviewer?.full_name || 'AdwumaGo user',
            initials: initialsOf(r.reviewer?.full_name || '?'),
            color: colorForId(r.reviewer_id),
            rating: r.rating,
            comment: r.comment ?? '',
            date: formatReviewDate(r.created_at),
        }));
        setVm({
            workerId: w.id,
            name: w.full_name || 'Worker',
            initials: initialsOf(w.full_name || '?'),
            skillLabel: w.skills[0] ?? 'General services',
            rating: w.rating_avg,
            reviewCount: w.rating_count,
            price: w.hourly_rate,
            bio: w.bio,
            skills: w.skills,
            experience: w.years_experience != null ? `${w.years_experience} yrs` : null,
            preferredTimes: (w.preferred_times ?? []).map(preferredTimeShortLabel),
            reviews,
        });
        setLoading(false);
    }, [id]);

    useFocusEffect(
        useCallback(() => {
            const cancelledRef = { current: false };
            load(cancelledRef);
            return () => { cancelledRef.current = true; };
        }, [load])
    );

    if (loading) {
        return (
            <SafeAreaView style={[s.safe, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }]} edges={['bottom']}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    if (!vm || loadError) {
        return (
            <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['bottom']}>
                <EmptyState
                    icon={loadError ? 'cloud-offline-outline' : 'person-remove-outline'}
                    title={loadError ? "Couldn't load this profile" : 'Worker not found'}
                    body={loadError ? 'Check your connection and try again.' : 'This worker profile is no longer available.'}
                    actionLabel={loadError ? 'Retry' : undefined}
                    onAction={loadError ? () => load() : undefined}
                    tone={loadError ? 'error' : 'default'}
                />
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignSelf: 'center', paddingVertical: wvs(12) }}>
                    <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // A worker viewed from an existing chat/booking just returns there — no
    // real thread exists yet for someone browsed fresh from search/home
    // (messaging is booking-gated), so that case goes to the messages tab
    // instead of pretending a conversation is already open.
    const handleMessage = () => {
        if (fromBooking) {
            navigation.goBack();
            return;
        }
        navigation.navigate('CustomerTabs', { screen: 'messages' });
    };

    const handleCall = () => Alert.alert('Call', 'Calling from the app is coming soon.');
    const handleEmail = () => Alert.alert('Email', 'Emailing from the app is coming soon.');

    const handlePrimaryAction = () => {
        navigation.navigate('PostAJob', {});
    };

    const pills = [
        vm.experience ? { icon: 'time-outline', label: vm.experience } : null,
        { icon: 'star', label: `${vm.rating.toFixed(1)} ★` },
        vm.preferredTimes.length > 0 ? { icon: 'time-outline', label: vm.preferredTimes.join(', ') } : null,
    ].filter((p): p is { icon: string; label: string } => p !== null);

    const details = [
        { value: vm.skillLabel, label: 'Primary Skill' },
        { value: vm.price != null ? `GH₵ ${vm.price}` : '—', label: 'Starting Price' },
        { value: vm.experience ?? '—', label: 'Experience' },
        { value: String(vm.reviewCount), label: 'Reviews' },
        { value: `${vm.rating.toFixed(1)} ★`, label: 'Rating' },
    ];

    return (
        <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['bottom']}>
            <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollOuter}>
                <ScreenContent style={s.scroll}>

                {/* ══ HERO CARD ══ */}
                <View style={[s.heroCard, { backgroundColor: COLORS.primary }]}>
                    <View style={s.heroTopRow}>
                        {vm.price != null ? (
                            <View style={s.priceBadge}>
                                <Text style={s.priceBadgeText}>GH₵ {vm.price}/hr</Text>
                            </View>
                        ) : <View />}
                        <TouchableOpacity style={s.bookmarkBtn} onPress={() => setSaved((v) => !v)} activeOpacity={0.8}>
                            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={wms(17)} color={DARK} />
                        </TouchableOpacity>
                    </View>

                    <View style={[s.avatar, { backgroundColor: '#fff' }]}>
                        <Text style={[s.avatarInitials, { color: DARK }]}>{vm.initials}</Text>
                    </View>
                    <View style={s.nameRow}>
                        <Text style={s.heroName}>{vm.name}</Text>
                        <Ionicons name="checkmark-circle" size={wms(16)} color={DARK} />
                    </View>
                    <Text style={s.heroService}>{vm.skillLabel}</Text>

                    <View style={s.contactRow}>
                        <TouchableOpacity style={s.contactBtn} onPress={handleMessage} activeOpacity={0.8}>
                            <Ionicons name="chatbubble-outline" size={wms(18)} color={DARK} />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.contactBtn} onPress={handleCall} activeOpacity={0.8}>
                            <Ionicons name="call-outline" size={wms(18)} color={DARK} />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.contactBtn} onPress={handleEmail} activeOpacity={0.8}>
                            <Ionicons name="mail-outline" size={wms(18)} color={DARK} />
                        </TouchableOpacity>
                    </View>

                    {pills.length > 0 && (
                        <View style={s.pillsRow}>
                            {pills.map((p) => (
                                <View key={p.label} style={s.pill}>
                                    <Ionicons name={p.icon as any} size={wms(11)} color="#fff" />
                                    <Text style={s.pillText}>{p.label}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity style={s.primaryBtn} onPress={handlePrimaryAction} activeOpacity={0.85}>
                        <Text style={s.primaryBtnText}>Post a Job</Text>
                    </TouchableOpacity>
                </View>

                {/* ══ WORKER DETAILS GRID ══ */}
                <View style={[s.detailsCard, { backgroundColor: T.card, borderColor: T.border }]}>
                    <Text style={[s.detailsTitle, { color: T.text }]}>Worker Details</Text>
                    <View style={s.detailsGrid}>
                        {details.map((d) => (
                            <View key={d.label} style={s.detailCell}>
                                <Text style={[s.detailValue, { color: T.text }]} numberOfLines={1}>{d.value}</Text>
                                <Text style={[s.detailLabel, { color: T.subText }]}>{d.label}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ══ ABOUT ══ */}
                {vm.bio && (
                    <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
                        <Text style={[s.cardTitle, { color: T.text }]}>About</Text>
                        <Text style={[s.bioText, { color: T.subText }]}>{vm.bio}</Text>
                    </View>
                )}

                {/* ══ SKILLS ══ */}
                {vm.skills.length > 0 && (
                    <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
                        <Text style={[s.cardTitle, { color: T.text }]}>Skills & Services</Text>
                        <View style={s.skillsGrid}>
                            {vm.skills.map((sk) => (
                                <View key={sk} style={[s.skillChip, { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary + '30' }]}>
                                    <Text style={[s.skillText, { color: COLORS.primary }]}>{sk}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ══ REVIEWS ══ */}
                {vm.reviews.length > 0 && (
                    <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
                        <View style={s.reviewsHeaderRow}>
                            <Text style={[s.cardTitle, { color: T.text, marginBottom: 0 }]}>Reviews ({vm.reviewCount})</Text>
                            <View style={s.recentRow}>
                                <Ionicons name="filter-outline" size={wms(13)} color={COLORS.primary} />
                                <Text style={[s.recentText, { color: COLORS.primary }]}>Recent</Text>
                            </View>
                        </View>
                        {vm.reviews.map((rev, i) => (
                            <View key={rev.author} style={[s.reviewRow, i > 0 && { borderTopWidth: ws(1), borderColor: T.divider }]}>
                                <View style={s.reviewTop}>
                                    <View style={[s.reviewAvatar, { backgroundColor: rev.color + '20' }]}>
                                        <Text style={[s.reviewInitials, { color: rev.color }]}>{rev.initials}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.reviewAuthor, { color: T.text }]}>{rev.author}</Text>
                                        <View style={{ flexDirection: 'row' }}>
                                            {Array.from({ length: 5 }).map((_, idx) => (
                                                <Ionicons key={idx} name={idx < rev.rating ? 'star' : 'star-outline'} size={wms(11)} color="#F59E0B" />
                                            ))}
                                        </View>
                                    </View>
                                    <Text style={[s.reviewDate, { color: T.subText }]}>{rev.date}</Text>
                                </View>
                                <Text style={[s.reviewComment, { color: T.subText }]}>{rev.comment}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ height: wvs(20) }} />
                </ScreenContent>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ─── Styles ─── */
const s = StyleSheet.create({
    safe: { flex: 1 },
    scrollOuter: { alignItems: 'center' },
    scroll: { width: '100%', paddingBottom: wvs(20) },

    /* Hero card */
    heroCard: { borderRadius: ws(28), marginHorizontal: ws(16), padding: ws(18), alignItems: 'center' },
    heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: wvs(6) },
    priceBadge: { backgroundColor: DARK, borderRadius: ws(999), paddingHorizontal: ws(12), paddingVertical: wvs(6) },
    priceBadgeText: { color: '#fff', fontSize: wms(12), fontWeight: '800' },
    bookmarkBtn: { width: ws(34), height: ws(34), borderRadius: ws(17), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

    avatar: { width: ws(84), height: ws(84), borderRadius: ws(42), alignItems: 'center', justifyContent: 'center', borderWidth: ws(3), borderColor: 'rgba(255,255,255,0.6)', marginBottom: wvs(10) },
    avatarInitials: { fontSize: wms(28), fontWeight: '900' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: ws(6), marginBottom: wvs(2) },
    heroName: { fontSize: wms(18), fontWeight: '800', color: DARK },
    heroService: { fontSize: wms(13), color: 'rgba(26,26,26,0.65)', fontWeight: '500', marginBottom: wvs(14) },

    contactRow: { flexDirection: 'row', gap: ws(14), marginBottom: wvs(14) },
    contactBtn: { width: ws(44), height: ws(44), borderRadius: ws(22), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

    pillsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: ws(8), marginBottom: wvs(16) },
    pill: { flexDirection: 'row', alignItems: 'center', gap: ws(5), backgroundColor: DARK, borderRadius: ws(999), paddingHorizontal: ws(11), paddingVertical: wvs(6) },
    pillText: { color: '#fff', fontSize: wms(11), fontWeight: '700' },

    primaryBtn: { width: '100%', height: wvs(52), borderRadius: ws(999), backgroundColor: DARK, alignItems: 'center', justifyContent: 'center' },
    primaryBtnText: { color: '#fff', fontSize: wms(15), fontWeight: '800' },

    /* Worker details grid */
    detailsCard: { borderRadius: ws(22), borderWidth: ws(1), marginHorizontal: ws(16), marginTop: wvs(14), marginBottom: wvs(14), padding: ws(18) },
    detailsTitle: { fontSize: wms(15), fontWeight: '800', marginBottom: wvs(14) },
    detailsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    detailCell: { width: '50%', marginBottom: wvs(16) },
    detailValue: { fontSize: wms(15), fontWeight: '800', marginBottom: wvs(2) },
    detailLabel: { fontSize: wms(11.5) },

    /* Generic card */
    card: { borderRadius: ws(16), borderWidth: ws(1), marginHorizontal: ws(16), marginBottom: wvs(14), padding: ws(16) },
    cardTitle: { fontSize: wms(14), fontWeight: '800', marginBottom: wvs(10) },
    bioText: { fontSize: wms(13), lineHeight: wms(19) },

    /* Skills */
    skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: ws(8) },
    skillChip: { borderRadius: ws(10), borderWidth: ws(1), paddingHorizontal: ws(12), paddingVertical: wvs(7) },
    skillText: { fontSize: wms(12), fontWeight: '700' },

    /* Reviews */
    reviewsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: wvs(10) },
    recentRow: { flexDirection: 'row', alignItems: 'center', gap: ws(4) },
    recentText: { fontSize: wms(12), fontWeight: '700' },
    reviewRow: { paddingVertical: wvs(12) },
    reviewTop: { flexDirection: 'row', alignItems: 'center', gap: ws(10), marginBottom: wvs(6) },
    reviewAvatar: { width: ws(34), height: ws(34), borderRadius: ws(17), alignItems: 'center', justifyContent: 'center' },
    reviewInitials: { fontSize: wms(12), fontWeight: '800' },
    reviewAuthor: { fontSize: wms(13), fontWeight: '700', marginBottom: wvs(2) },
    reviewDate: { fontSize: wms(11) },
    reviewComment: { fontSize: wms(12), lineHeight: wms(17) },
});
