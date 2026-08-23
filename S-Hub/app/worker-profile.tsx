import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';
import ScreenContent from '@/components/ScreenContent';
import { getWorkerProfile, preferredTimeShortLabel } from '@/lib/api/workerProfiles';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WORKERS } from './search';

const DARK = '#1A1A1A';

/* ─── Extra detail not carried on the search-result cards ───
   Keyed by worker id — bio, skills, certifications, reviews. Mock-mode only. */
const WORKER_DETAILS: Record<number, {
    bio: string;
    jobsDone: number;
    onTime: number;
    experience: string;
    skills: string[];
    certifications: string[];
    reviews: { author: string; initials: string; color: string; rating: number; comment: string; date: string }[];
}> = {
    1: {
        bio: 'Licensed plumber with 6 years of experience fixing leaks, installing fittings, and handling full bathroom plumbing across Kumasi.',
        jobsDone: 143, onTime: 98, experience: '6 yrs',
        skills: ['Pipe Repair', 'Leak Detection', 'Bathroom Fitting', 'Drainage', 'Water Heater'],
        certifications: ['Ghana Water & Sanitation', 'First Aid Certified'],
        reviews: [
            { author: 'Akosua Badu', initials: 'AB', color: '#7C3AED', rating: 5, comment: 'Fixed the leak fast and left everything clean. Highly recommend!', date: '30 Jun' },
            { author: 'Ernest Ofori', initials: 'EO', color: '#1D6FBA', rating: 5, comment: 'Very professional, arrived on time and explained everything clearly.', date: '28 Jun' },
        ],
    },
    2: {
        bio: 'Certified electrician specializing in home wiring, socket installation, and safety inspections. Fast, careful, and reliable.',
        jobsDone: 96, onTime: 95, experience: '5 yrs',
        skills: ['Wiring', 'Socket Installation', 'Circuit Repair', 'Safety Inspection'],
        certifications: ['GESE Certified', 'Electrical Safety Board'],
        reviews: [
            { author: 'Linda Owusu', initials: 'LO', color: '#DC2626', rating: 4, comment: 'Good work, a little late but communicated well.', date: '2 days ago' },
        ],
    },
    3: {
        bio: 'Skilled carpenter for cabinets, furniture repair, and custom woodwork. Detail-oriented with a strong eye for finish quality.',
        jobsDone: 73, onTime: 92, experience: '4 yrs',
        skills: ['Cabinet Making', 'Furniture Repair', 'Custom Woodwork', 'Door Fitting'],
        certifications: ['Ghana Carpentry Guild'],
        reviews: [
            { author: 'Mabel Asante', initials: 'MA', color: '#D97706', rating: 5, comment: 'Beautiful cabinet work, exactly what I asked for.', date: '1 week ago' },
        ],
    },
    4: {
        bio: 'Professional painter offering interior and exterior painting with premium, long-lasting finishes.',
        jobsDone: 54, onTime: 97, experience: '3 yrs',
        skills: ['Interior Painting', 'Exterior Painting', 'Wall Prep', 'Color Consulting'],
        certifications: ['First Aid Certified'],
        reviews: [
            { author: 'Kojo Antwi', initials: 'KA', color: '#0891B2', rating: 5, comment: 'Neat work, finished ahead of schedule.', date: '3 days ago' },
        ],
    },
    5: {
        bio: 'Reliable home cleaner offering deep cleaning, move-in/move-out cleaning, and regular housekeeping.',
        jobsDone: 38, onTime: 99, experience: '2 yrs',
        skills: ['Deep Cleaning', 'Move-in/out Cleaning', 'Laundry', 'Kitchen Detailing'],
        certifications: [],
        reviews: [
            { author: 'Efua Mensah', initials: 'EM', color: '#7C3AED', rating: 5, comment: 'Spotless every time. Very trustworthy.', date: '5 days ago' },
        ],
    },
};

function initialsOf(name: string): string {
    return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

type ViewModel = {
    isRealMode: boolean;
    workerId: string;
    name: string;
    initials: string;
    color: string;
    skillLabel: string;
    rating: number;
    reviewCount: number;
    distance: string | null;
    available: boolean | null;
    price: number | null;
    bio: string | null;
    skills: string[];
    certifications: string[];
    jobsDone: number | null;
    onTimePct: number | null;
    experience: string | null;
    preferredTimes: string[];
    reviews: { author: string; initials: string; color: string; rating: number; comment: string; date: string }[];
};

export default function WorkerProfileScreen() {
    const T = useThemeColors();
    const { id } = useLocalSearchParams<{ id: string }>();

    const numericId = Number(id);
    const mockWorker = !Number.isNaN(numericId) ? WORKERS.find((w) => w.id === numericId) : undefined;
    const isRealMode = !mockWorker && !!id;

    const [myId, setMyId] = useState<string | null>(null);
    const [realVm, setRealVm] = useState<ViewModel | null>(null);
    const [loading, setLoading] = useState(isRealMode);
    const [loadError, setLoadError] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!isRealMode) return;
        let cancelled = false;
        (async () => {
            const [auth, result] = await Promise.all([supabase.auth.getUser(), getWorkerProfile(id)]);
            if (cancelled) return;
            setMyId(auth.data.user?.id ?? null);
            if (!result.success || !result.data) {
                setLoadError(true);
                setLoading(false);
                return;
            }
            const w = result.data;
            setRealVm({
                isRealMode: true,
                workerId: w.id,
                name: w.full_name || 'Worker',
                initials: initialsOf(w.full_name || '?'),
                color: COLORS.accent,
                skillLabel: w.skills[0] ?? 'General services',
                rating: w.rating_avg,
                reviewCount: w.rating_count,
                distance: null,
                available: null,
                price: w.hourly_rate,
                bio: w.bio,
                skills: w.skills,
                certifications: [],
                jobsDone: null,
                onTimePct: null,
                experience: w.years_experience != null ? `${w.years_experience} yrs` : null,
                preferredTimes: (w.preferred_times ?? []).map(preferredTimeShortLabel),
                reviews: [],
            });
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [isRealMode, id]);

    const vm: ViewModel | null = mockWorker
        ? (() => {
            const details = WORKER_DETAILS[mockWorker.id];
            if (!details) return null;
            return {
                isRealMode: false,
                workerId: String(mockWorker.id),
                name: mockWorker.name,
                initials: mockWorker.initials,
                color: mockWorker.color,
                skillLabel: mockWorker.skill,
                rating: mockWorker.rating,
                reviewCount: mockWorker.reviews,
                distance: mockWorker.distance,
                available: mockWorker.available,
                price: mockWorker.price,
                bio: details.bio,
                skills: details.skills,
                certifications: details.certifications,
                jobsDone: details.jobsDone,
                onTimePct: details.onTime,
                experience: details.experience,
                preferredTimes: [],
                reviews: details.reviews,
            };
        })()
        : realVm;

    if (isRealMode && loading) {
        return (
            <SafeAreaView style={[s.safe, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }]} edges={['top', 'bottom']}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    if (!vm || loadError) {
        return (
            <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
                <View style={s.notFound}>
                    <Ionicons name="person-remove-outline" size={wms(40)} color={T.subText} />
                    <Text style={[s.notFoundText, { color: T.text }]}>Worker not found</Text>
                    <TouchableOpacity style={s.notFoundBtn} onPress={() => router.back()} activeOpacity={0.8}>
                        <Text style={s.notFoundBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const handleMessage = () => {
        if (vm.isRealMode) {
            // Got here from a real chat thread (or a direct link) — just return to it.
            router.back();
            return;
        }
        router.push('/messages' as any);
    };

    const handleCall = () => Alert.alert('Call', 'Calling from the app is coming soon.');
    const handleEmail = () => Alert.alert('Email', 'Emailing from the app is coming soon.');

    const handlePrimaryAction = () => {
        if (vm.isRealMode) {
            router.push('/post-a-job' as any);
            return;
        }
        Alert.alert(
            `Book ${vm.name}?`,
            `Starting price is GH₵ ${vm.price}. A request will be sent to them.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Book',
                    onPress: () => {
                        Alert.alert('Request Sent', `${vm.name} has been notified of your booking request.`);
                        router.push('/bookings' as any);
                    },
                },
            ]
        );
    };

    const pills = [
        vm.experience ? { icon: 'time-outline', label: vm.experience } : null,
        { icon: 'star', label: `${vm.rating.toFixed(1)} ★` },
        vm.distance ? { icon: 'location-outline', label: vm.distance } : null,
        vm.available !== null ? { icon: vm.available ? 'checkmark-circle-outline' : 'close-circle-outline', label: vm.available ? 'Available' : 'Busy' } : null,
        vm.preferredTimes.length > 0 ? { icon: 'time-outline', label: vm.preferredTimes.join(', ') } : null,
    ].filter((p): p is { icon: string; label: string } => p !== null);

    const details = [
        { value: vm.skillLabel, label: 'Primary Skill' },
        { value: vm.price != null ? `GH₵ ${vm.price}` : '—', label: 'Starting Price' },
        { value: vm.experience ?? '—', label: 'Experience' },
        { value: vm.jobsDone != null ? String(vm.jobsDone) : String(vm.reviewCount), label: vm.jobsDone != null ? 'Jobs Done' : 'Reviews' },
        { value: vm.onTimePct != null ? `${vm.onTimePct}%` : `${vm.rating.toFixed(1)} ★`, label: vm.onTimePct != null ? 'On-time Rate' : 'Rating' },
        { value: String(vm.certifications.length), label: 'Certifications' },
    ];

    return (
        <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
            <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

            {/* ── HEADER ── */}
            <View style={s.headerOuter}>
                <ScreenContent style={s.header}>
                    <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
                        <Ionicons name="arrow-back" size={wms(22)} color={T.text} />
                    </TouchableOpacity>
                    <Text style={[s.headerTitle, { color: T.text }]}>Worker Profile</Text>
                    <View style={s.backBtn} />
                </ScreenContent>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollOuter}>
                <ScreenContent style={s.scroll}>

                {/* ══ HERO CARD ══ */}
                <View style={[s.heroCard, { backgroundColor: COLORS.primary }]}>
                    <View style={s.heroTopRow}>
                        {vm.price != null ? (
                            <View style={s.priceBadge}>
                                <Text style={s.priceBadgeText}>GH₵ {vm.price}{vm.isRealMode ? '/hr' : ''}</Text>
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
                        <Text style={s.primaryBtnText}>{vm.isRealMode ? 'Post a Job' : 'Hire Now'}</Text>
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

                {/* ══ CERTIFICATIONS ══ */}
                {vm.certifications.length > 0 && (
                    <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
                        <Text style={[s.cardTitle, { color: T.text }]}>Certifications</Text>
                        {vm.certifications.map((cert, i) => (
                            <View key={cert} style={[s.certRow, i > 0 && [s.rowDivider, { borderTopWidth: ws(1), borderColor: T.divider }]]}>
                                <Ionicons name="ribbon-outline" size={wms(15)} color={COLORS.primary} />
                                <Text style={[s.certText, { color: T.text }]}>{cert}</Text>
                                <Ionicons name="checkmark-circle" size={wms(16)} color="#22C55E" />
                            </View>
                        ))}
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

    /* Header */
    headerOuter: { alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ws(14), paddingVertical: wvs(12) },
    backBtn: { width: ws(38), height: ws(38), alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: wms(16), fontWeight: '700' },

    /* Not found */
    notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: ws(12), padding: ws(24) },
    notFoundText: { fontSize: wms(15), fontWeight: '700' },
    notFoundBtn: { backgroundColor: COLORS.primary, borderRadius: ws(10), paddingHorizontal: ws(20), paddingVertical: wvs(10), marginTop: wvs(4) },
    notFoundBtnText: { color: '#fff', fontWeight: '700', fontSize: wms(13) },

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

    rowDivider: { height: wvs(1) },

    /* Certifications */
    certRow: { flexDirection: 'row', alignItems: 'center', gap: ws(10), paddingVertical: wvs(10) },
    certText: { flex: 1, fontSize: wms(13), fontWeight: '600' },

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
