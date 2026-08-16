import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
    Dimensions, FlatList, StyleSheet,
    Text, TouchableOpacity, View
} from 'react-native';

const { width, height } = Dimensions.get('window');
const PRIMARY = '#1B8B3A';
const PRIMARY_DARK = '#0F5C26';

const SLIDES = [
    {
        id: '1',
        title: 'Find trusted\nworkers nearby',
        subtitle: 'Connect with verified and highly rated professionals near you.',
        illustration: 'find',
    },
    {
        id: '2',
        title: 'Receive & compare\nbids in real time',
        subtitle: 'Post your job and get offers from available workers. You choose the best one.',
        illustration: 'bids',
    },
    {
        id: '3',
        title: 'Schedule & manage\nwork with ease',
        subtitle: 'Plan one-time or recurring jobs and track progress from start to finish.',
        illustration: 'schedule',
    },
];

/* ── Illustration: Find Workers ── */
function FindIllustration() {
    return (
        <View style={ill.container}>
            <View style={ill.mapBox}>
                <Text style={ill.mapEmoji}>🗺️</Text>
                {/* Pin markers */}
                {[
                    { top: '20%', left: '25%', emoji: '📍' },
                    { top: '40%', left: '55%', emoji: '📍' },
                    { top: '60%', left: '30%', emoji: '📍' },
                ].map((p, i) => (
                    <View key={i} style={[ill.pin, { top: p.top as any, left: p.left as any }]}>
                        <Text style={{ fontSize: 22 }}>{p.emoji}</Text>
                    </View>
                ))}
                {/* Worker card overlay */}
                <View style={ill.workerCard}>
                    <View style={ill.workerAvatar}>
                        <Text style={{ fontSize: 22 }}>👷🏿</Text>
                    </View>
                    <View>
                        <Text style={ill.workerName}>Kofi Mensah</Text>
                        <Text style={ill.workerRole}>Plumber • ⭐ 4.8</Text>
                    </View>
                    <Text style={ill.workerPrice}>GHC 450</Text>
                </View>
            </View>
            {/* Person illustration */}
            <View style={ill.personBox}>
                <Text style={ill.personEmoji}>🧑🏿‍💼</Text>
            </View>
        </View>
    );
}

/* ── Illustration: Bids ── */
function BidsIllustration() {
    const bids = [
        { name: 'Kwame A.', rating: 4.7, price: 'GHC 400', color: '#2EA94F' },
        { name: 'Kofi M.', rating: 4.8, price: 'GHC 450', color: '#1B8B3A' },
        { name: 'Yaw B.', rating: 4.6, price: 'GHC 350', color: '#0F5C26' },
    ];
    return (
        <View style={ill.container}>
            <View style={ill.phoneFrame}>
                <Text style={ill.phoneLabel}>Incoming Bids</Text>
                {bids.map((b, i) => (
                    <View key={i} style={ill.bidRow}>
                        <View style={[ill.bidAvatar, { backgroundColor: b.color }]}>
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                                {b.name.split(' ').map(n => n[0]).join('')}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={ill.bidName}>{b.name}</Text>
                            <Text style={ill.bidRating}>⭐ {b.rating}</Text>
                        </View>
                        <Text style={ill.bidPrice}>{b.price}</Text>
                    </View>
                ))}
            </View>
            <View style={ill.personBox}>
                <Text style={ill.personEmoji}>👩🏿‍🔧</Text>
            </View>
        </View>
    );
}

/* ── Illustration: Schedule ── */
function ScheduleIllustration() {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const dates = [
        [null, null, null, 1, 2, 3, 4],
        [5, 6, 7, 8, 9, 10, 11],
        [12, 13, 14, 15, 16, 17, 18],
        [19, 20, 21, 22, 23, 24, 25],
        [26, 27, 28, 29, 30, 31, null],
    ];
    return (
        <View style={ill.container}>
            <View style={ill.calendarBox}>
                <Text style={ill.calendarMonth}>May 2024</Text>
                {/* Day headers */}
                <View style={ill.calRow}>
                    {days.map((d, i) => (
                        <Text key={i} style={ill.calDayHeader}>{d}</Text>
                    ))}
                </View>
                {/* Dates */}
                {dates.map((week, wi) => (
                    <View key={wi} style={ill.calRow}>
                        {week.map((d, di) => (
                            <View key={di} style={[
                                ill.calDate,
                                d === 21 && ill.calDateActive,
                            ]}>
                                <Text style={[
                                    ill.calDateText,
                                    d === 21 && ill.calDateTextActive,
                                    !d && { opacity: 0 },
                                ]}>{d || '·'}</Text>
                            </View>
                        ))}
                    </View>
                ))}
                {/* Upcoming job */}
                <View style={ill.upcomingBox}>
                    <Text style={ill.upcomingLabel}>Upcoming Job</Text>
                    <View style={ill.upcomingRow}>
                        <Text style={{ fontSize: 18 }}>🔧</Text>
                        <View>
                            <Text style={ill.upcomingTitle}>Plumbing</Text>
                            <Text style={ill.upcomingSub}>Tue, 21 May · 12:00 PM</Text>
                            <Text style={ill.upcomingSub}>Spendal Ayeduase, Kumasi</Text>
                        </View>
                    </View>
                </View>
            </View>
            <View style={ill.personBox}>
                <Text style={ill.personEmoji}>👷🏿‍♂️</Text>
            </View>
        </View>
    );
}

function Slide({ item }: { item: typeof SLIDES[0] }) {
    return (
        <View style={styles.slide}>
            {/* Green top */}
            <View style={styles.slideTop}>
                {item.illustration === 'find' && <FindIllustration />}
                {item.illustration === 'bids' && <BidsIllustration />}
                {item.illustration === 'schedule' && <ScheduleIllustration />}
            </View>
            {/* White bottom */}
            <View style={styles.slideBottom}>
                <Text style={styles.slideTitle}>{item.title}</Text>
                <Text style={styles.slideSub}>{item.subtitle}</Text>
            </View>
        </View>
    );
}

export default function OnboardingScreen() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatRef = useRef<FlatList>(null);

    const goNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatRef.current?.scrollToIndex({ index: currentIndex + 1 });
            setCurrentIndex(currentIndex + 1);
        } else {
            router.replace('/login');
        }
    };

    const goBack = () => {
        if (currentIndex > 0) {
            flatRef.current?.scrollToIndex({ index: currentIndex - 1 });
            setCurrentIndex(currentIndex - 1);
        }
    };

    return (
        <View style={styles.container}>
            {/* Skip */}
            <TouchableOpacity style={styles.skipBtn} onPress={() => router.replace('/login')}>
                <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            {/* Slides */}
            <FlatList
                ref={flatRef}
                data={SLIDES}
                keyExtractor={item => item.id}
                horizontal
                pagingEnabled
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => <Slide item={item} />}
                onMomentumScrollEnd={e => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
            />

            {/* Bottom controls */}
            <View style={styles.controls}>
                {/* Back */}
                <TouchableOpacity
                    style={[styles.backBtn, currentIndex === 0 && { opacity: 0 }]}
                    onPress={goBack}
                    disabled={currentIndex === 0}
                >
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>

                {/* Dots */}
                <View style={styles.dotsRow}>
                    {SLIDES.map((_, i) => (
                        <View key={i} style={[
                            styles.dot,
                            i === currentIndex && styles.dotActive,
                        ]} />
                    ))}
                </View>

                {/* Next / Get Started */}
                <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
                    <Text style={styles.nextText}>
                        {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

/* ── Illustration styles ── */
const ill = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 16,
    },
    mapBox: {
        width: width * 0.72,
        height: 220,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: -30,
    },
    mapEmoji: { fontSize: 80, opacity: 0.3 },
    pin: { position: 'absolute' },
    workerCard: {
        position: 'absolute',
        bottom: 12, left: 12, right: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    workerAvatar: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#E8F5EC',
        alignItems: 'center', justifyContent: 'center',
    },
    workerName: { fontSize: 13, fontWeight: '700', color: '#111' },
    workerRole: { fontSize: 11, color: '#666' },
    workerPrice: { fontSize: 13, fontWeight: '800', color: PRIMARY, marginLeft: 'auto' },

    phoneFrame: {
        width: width * 0.68,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: -30,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    phoneLabel: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 12 },
    bidRow: {
        flexDirection: 'row', alignItems: 'center',
        gap: 10, paddingVertical: 8,
        borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0',
    },
    bidAvatar: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    bidName: { fontSize: 13, fontWeight: '600', color: '#111' },
    bidRating: { fontSize: 11, color: '#666' },
    bidPrice: { fontSize: 13, fontWeight: '800', color: PRIMARY },

    calendarBox: {
        width: width * 0.72,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: -30,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
    },
    calendarMonth: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 8, textAlign: 'center' },
    calRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    calDayHeader: { width: 28, textAlign: 'center', fontSize: 10, color: '#999', fontWeight: '600' },
    calDate: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    calDateActive: { backgroundColor: PRIMARY },
    calDateText: { fontSize: 11, color: '#333' },
    calDateTextActive: { color: '#fff', fontWeight: '700' },
    upcomingBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: '#F0F0F0' },
    upcomingLabel: { fontSize: 10, color: '#999', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
    upcomingRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    upcomingTitle: { fontSize: 12, fontWeight: '700', color: '#111' },
    upcomingSub: { fontSize: 10, color: '#888' },

    personBox: { alignItems: 'center' },
    personEmoji: { fontSize: 90 },
});

/* ── Screen styles ── */
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: PRIMARY_DARK },

    skipBtn: {
        position: 'absolute', top: 52, right: 24, zIndex: 10,
    },
    skipText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

    slide: { width, flex: 1 },

    slideTop: {
        flex: 1,
        backgroundColor: PRIMARY_DARK,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 0,
    },

    slideBottom: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 28,
        paddingTop: 36,
        paddingBottom: 20,
        minHeight: height * 0.28,
    },
    slideTitle: {
        fontSize: 26, fontWeight: '800', color: '#111',
        lineHeight: 34, marginBottom: 12,
    },
    slideSub: {
        fontSize: 15, color: '#666', lineHeight: 23,
    },

    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingBottom: 36,
        paddingTop: 8,
    },

    backBtn: {
        paddingVertical: 12, paddingHorizontal: 20,
        borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0',
        minWidth: 80, alignItems: 'center',
    },
    backText: { fontSize: 15, fontWeight: '600', color: '#555' },

    dotsRow: { flexDirection: 'row', gap: 6 },
    dot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: '#D0D0D0',
    },
    dotActive: {
        width: 24, backgroundColor: PRIMARY,
    },

    nextBtn: {
        backgroundColor: PRIMARY,
        paddingVertical: 12, paddingHorizontal: 20,
        borderRadius: 12, minWidth: 100, alignItems: 'center',
    },
    nextText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
