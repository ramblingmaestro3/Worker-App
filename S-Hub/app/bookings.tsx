import { COLORS } from '@/constants/theme';
import { useUnreadMessages } from '@/contexts/unread-messages';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { messagingSocket } from '../lib/messaging';

/* ─── Types ─── */
type Tab = 'posted' | 'scheduled' | 'cancelled' | 'saved';

interface Job {
  id: number;
  title: string;
  service: string;
  icon: string;
  serviceColor: string;
  worker?: string;
  workerInitials?: string;
  date: string;
  time?: string;
  location: string;
  price: number;
  status: 'open' | 'assigned' | 'scheduled' | 'completed' | 'cancelled';
  imageUrls?: string[];
  saved?: boolean;
  /** True for a direct hire request sitting with this worker awaiting a response (as opposed to an unclaimed broadcast request, which can only be accepted or ignored). */
  canDecline?: boolean;
}

function initials(name?: string) {
  return (name || 'Worker')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function mapBookingToJob(booking: any): Job {
  const workerName = booking.worker?.full_name;
  const statusMap: Record<string, Job['status']> = {
    open: 'open',
    pending: 'open',
    accepted: 'assigned',
    in_progress: 'scheduled',
    completed: 'completed',
    cancelled: 'cancelled',
  };

  return {
    id: booking.id,
    title: booking.title || 'Job request',
    service: booking.service?.name || 'Service',
    icon: booking.is_emergency ? '⚠️' : '🛠️',
    serviceColor: booking.is_emergency ? COLORS.danger : COLORS.primary,
    worker: workerName,
    workerInitials: workerName ? initials(workerName) : undefined,
    date: booking.scheduled_date || 'Open',
    time: booking.scheduled_time,
    location: booking.location_address || booking.location_city || 'Location not set',
    price: booking.estimated_cost ?? booking.hourly_rate ?? 0,
    status: statusMap[booking.status] || 'open',
    imageUrls: booking.image_urls || [],
    canDecline: Boolean(booking.worker_id) && booking.status === 'pending',
  };
}

/* ─── Status chip ─── */
function StatusChip({ status }: { status: Job['status'] }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    open: { label: 'Open', bg: '#E6F4EE', color: COLORS.primary },
    assigned: { label: 'Assigned', bg: '#E3F2FD', color: '#1565C0' },
    scheduled: { label: 'Scheduled', bg: '#FFF8E1', color: '#F57F17' },
    completed: { label: 'Completed', bg: '#E8F5E9', color: '#2E7D32' },
    cancelled: { label: 'Cancelled', bg: '#FEECEC', color: COLORS.danger },
  };
  const m = map[status];
  return (
    <View style={[chip.wrap, { backgroundColor: m.bg }]}>
      <Text style={[chip.text, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}
const chip = StyleSheet.create({
  wrap: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  text: { fontSize: 11, fontWeight: '700' },
});

/* ─── Job Card ─── */
function JobCard({
  job,
  tab,
  isWorker,
  onAccept,
  onDecline,
  onCancel,
}: {
  job: Job;
  tab: Tab;
  isWorker: boolean;
  onAccept: (job: Job) => void;
  onDecline: (job: Job) => void;
  onCancel: (job: Job) => void;
}) {
  const handleCancel = () =>
    Alert.alert('Cancel Job', 'Are you sure you want to cancel this job?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => onCancel(job) },
    ]);

  const handleDecline = () =>
    Alert.alert('Decline Request', 'Decline this hire request? The customer will need to find another worker.', [
      { text: 'No', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => onDecline(job) },
    ]);

  const handleUnsave = () =>
    Alert.alert('Remove', 'Remove this worker from saved?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive' },
    ]);

  return (
    <TouchableOpacity
      style={jc.card}
      activeOpacity={0.82}
      onPress={() => router.push(`/worker-profile?id=${job.id}` as any)}
    >
      {/* Top row: icon + title + status */}
      <View style={jc.topRow}>
        <View style={[jc.iconWrap, { backgroundColor: job.serviceColor + '18' }]}>
          <Text style={jc.icon}>{job.icon}</Text>
        </View>
        <View style={jc.topInfo}>
          <Text style={jc.jobTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={jc.service}>{job.service}</Text>
        </View>
        <StatusChip status={job.status} />
      </View>

      {/* Meta row */}
      <View style={jc.metaRow}>
        <View style={jc.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={COLORS.muted} />
          <Text style={jc.metaText}>{job.date}{job.time ? ` · ${job.time}` : ''}</Text>
        </View>
        <View style={jc.metaItem}>
          <Ionicons name="location-outline" size={13} color={COLORS.muted} />
          <Text style={jc.metaText} numberOfLines={1}>{job.location}</Text>
        </View>
      </View>

      {!!job.imageUrls?.length && (
        <Image source={{ uri: job.imageUrls[0] }} style={jc.jobImage} />
      )}

      {/* Worker row (if assigned) */}
      {job.worker && (
        <View style={jc.workerRow}>
          <View style={[jc.workerAvatar, { backgroundColor: job.serviceColor + '18' }]}>
            <Text style={[jc.workerInitials, { color: job.serviceColor }]}>{job.workerInitials}</Text>
          </View>
          <Text style={jc.workerName}>{job.worker}</Text>
          <TouchableOpacity style={jc.chatBtn} activeOpacity={0.75} onPress={() => router.push('/messages' as any)}>
            <Ionicons name="chatbubble-outline" size={14} color={COLORS.primary} />
            <Text style={jc.chatBtnText}>Chat</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom row: price + actions */}
      <View style={jc.bottomRow}>
        <View>
          <Text style={jc.priceLabel}>Budget</Text>
          <Text style={jc.price}>GH₵ {job.price}</Text>
        </View>

        <View style={jc.actions}>
          {tab === 'posted' && isWorker && (
            <>
              {job.canDecline && (
                <TouchableOpacity style={jc.actionBtnOutline} activeOpacity={0.75} onPress={handleDecline}>
                  <Text style={jc.actionBtnOutlineText}>Decline</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={jc.actionBtn} activeOpacity={0.8} onPress={() => onAccept(job)}>
                <Text style={jc.actionBtnText}>Accept</Text>
              </TouchableOpacity>
            </>
          )}
          {tab === 'posted' && !isWorker && (
            <>
              <TouchableOpacity style={jc.actionBtnOutline} onPress={handleCancel} activeOpacity={0.75}>
                <Text style={jc.actionBtnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={jc.actionBtn} activeOpacity={0.8} onPress={() => router.push('/search' as any)}>
                <Text style={jc.actionBtnText}>Find Workers</Text>
              </TouchableOpacity>
            </>
          )}
          {tab === 'scheduled' && (
            <>
              <TouchableOpacity style={jc.actionBtnOutline} onPress={handleCancel} activeOpacity={0.75}>
                <Text style={jc.actionBtnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={jc.actionBtn} activeOpacity={0.8} onPress={() => Alert.alert('Reschedule', 'Date picker coming soon.')}>
                <Text style={jc.actionBtnText}>Reschedule</Text>
              </TouchableOpacity>
            </>
          )}
          {tab === 'cancelled' && (
            <TouchableOpacity style={jc.actionBtn} activeOpacity={0.8} onPress={() => router.push('/post-job' as any)}>
              <Text style={jc.actionBtnText}>Re-post Job</Text>
            </TouchableOpacity>
          )}
          {tab === 'saved' && (
            <>
              <TouchableOpacity style={jc.actionBtnOutline} onPress={handleUnsave} activeOpacity={0.75}>
                <Text style={jc.actionBtnOutlineText}>Remove</Text>
              </TouchableOpacity>
              <TouchableOpacity style={jc.actionBtn} activeOpacity={0.8} onPress={() => router.push('/post-job' as any)}>
                <Text style={jc.actionBtnText}>Hire</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const jc = StyleSheet.create({
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#EDEDED', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon: { fontSize: 22 },
  topInfo: { flex: 1 },
  jobTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  service: { fontSize: 12, color: COLORS.muted },
  metaRow: { gap: 5, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: COLORS.muted, flex: 1 },
  jobImage: { width: '100%', height: 150, borderRadius: 10, marginBottom: 10, backgroundColor: '#F3F3F3' },
  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8F8F8', borderRadius: 10, padding: 10, marginBottom: 10 },
  workerAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  workerInitials: { fontSize: 11, fontWeight: '800' },
  workerName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary },
  chatBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#F2F2F2', paddingTop: 10 },
  priceLabel: { fontSize: 10, color: COLORS.muted, fontWeight: '500' },
  price: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  actionBtnOutline: { borderWidth: 1.5, borderColor: '#E0E0E0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  actionBtnOutlineText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
});

/* ─── Empty state ─── */
function EmptyState({ tab }: { tab: Tab }) {
  const map: Record<Tab, { icon: string; title: string; sub: string; cta?: string; ctaRoute?: string }> = {
    posted: { icon: '📋', title: 'No active jobs', sub: 'Post a job to find skilled workers near you.', cta: 'Post a Job', ctaRoute: '/post-job' },
    scheduled: { icon: '📅', title: 'Nothing scheduled', sub: 'Accepted jobs with a set date will appear here.', cta: 'Browse Workers', ctaRoute: '/search' },
    cancelled: { icon: '❌', title: 'No cancelled jobs', sub: 'Jobs you cancel will appear here.', },
    saved: { icon: '🔖', title: 'No saved workers yet', sub: 'Saving workers for later isn\'t available yet — browse workers in the meantime.', cta: 'Find Workers', ctaRoute: '/search' },
  };
  const m = map[tab];
  return (
    <View style={es.wrap}>
      <Text style={es.icon}>{m.icon}</Text>
      <Text style={es.title}>{m.title}</Text>
      <Text style={es.sub}>{m.sub}</Text>
      {m.cta && (
        <TouchableOpacity style={es.cta} onPress={() => router.push(m.ctaRoute! as any)} activeOpacity={0.85}>
          <Text style={es.ctaText}>{m.cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const es = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  icon: { fontSize: 52, marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  sub: { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  cta: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

/* ─── MAIN SCREEN ─── */
export default function BookingsScreen() {
  const { unreadCount } = useUnreadMessages();
  const [activeTab, setActiveTab] = useState<Tab>('posted');
  const [isWorker, setIsWorker] = useState(false);
  const [apiJobs, setApiJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'posted', label: 'Posted' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'saved', label: 'Saved' },
  ];

  const tabData = useMemo<Record<Tab, Job[]>>(() => ({
    posted: apiJobs.filter(j => j.status === 'open' || j.status === 'assigned'),
    scheduled: apiJobs.filter(j => j.status === 'scheduled' || j.status === 'completed'),
    cancelled: apiJobs.filter(j => j.status === 'cancelled'),
    saved: [],
  }), [apiJobs]);

  const jobs = tabData[activeTab];

  const loadJobs = async () => {
    setLoading(true);
    try {
      const me = await api.getMe();
      const workerMode = me.user?.role === 'worker';
      setIsWorker(workerMode);
      if (workerMode) {
        const [openResult, assignedResult] = await Promise.all([
          api.getOpenJobRequests({ per_page: 50 }),
          api.getMyBookings({ role: 'worker', per_page: 50 }),
        ]);
        setApiJobs([...openResult.items, ...assignedResult.items].map(mapBookingToJob));
      } else {
        const result = await api.getMyBookings({ role: 'customer', per_page: 50 });
        setApiJobs(result.items.map(mapBookingToJob));
      }
      setLoadError(false);
    } catch (error) {
      setApiJobs([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    const socket = messagingSocket();
    if (!socket) return;
    const handleNew = (payload: any) => {
      if (payload?.related_entity_type === 'booking') loadJobs();
    };
    socket.on('notification:new', handleNew);
    return () => { socket.off('notification:new', handleNew); };
  }, []);

  const handleAccept = (job: Job) => {
    Alert.alert('Accept Job', 'Accept this request? Other workers will no longer be able to claim it.', [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          try {
            await api.acceptBooking(job.id);
            Alert.alert('Accepted', 'The customer has been notified and a message thread is ready.');
            loadJobs();
          } catch (error: any) {
            Alert.alert('Could not accept', error?.message ?? 'Please try again.');
            loadJobs();
          }
        },
      },
    ]);
  };

  const handleDecline = async (job: Job) => {
    try {
      await api.rejectBooking(job.id);
      Alert.alert('Declined', 'The customer has been informed.');
      loadJobs();
    } catch (error: any) {
      Alert.alert('Could not decline', error?.message ?? 'Please try again.');
    }
  };

  const handleCancel = async (job: Job) => {
    try {
      await api.cancelBooking(job.id, 'Cancelled from app');
      Alert.alert('Cancelled', 'Your job has been cancelled.');
      loadJobs();
    } catch (error: any) {
      Alert.alert('Could not cancel', error?.message ?? 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── HEADER ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{isWorker ? 'Available Jobs' : 'My Jobs'}</Text>
        {!isWorker && (
          <TouchableOpacity
            style={s.postBtn}
            onPress={() => router.push('/post-job' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.postBtnText}>Post Job</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── SUMMARY STRIP ── */}
      <View style={s.summaryStrip}>
        {[
          { label: isWorker ? 'Open' : 'Posted', count: tabData.posted.length, tab: 'posted' as Tab },
          { label: 'Scheduled', count: tabData.scheduled.length, tab: 'scheduled' as Tab },
          { label: 'Cancelled', count: tabData.cancelled.length, tab: 'cancelled' as Tab },
          { label: 'Saved', count: tabData.saved.length, tab: 'saved' as Tab },
        ].map((item, i, arr) => (
          <TouchableOpacity
            key={item.tab}
            style={[s.summaryItem, i < arr.length - 1 && s.summaryBorder, activeTab === item.tab && s.summaryItemActive]}
            onPress={() => setActiveTab(item.tab)}
            activeOpacity={0.75}
          >
            <Text style={[s.summaryCount, activeTab === item.tab && s.summaryCountActive]}>{item.count}</Text>
            <Text style={s.summaryLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TAB BAR ── */}
      <View style={s.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.75}
          >
            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>
              {tab.label}
            </Text>
            {tabData[tab.key].length > 0 && (
              <View style={[s.tabBadge, activeTab === tab.key && s.tabBadgeActive]}>
                <Text style={[s.tabBadgeText, activeTab === tab.key && s.tabBadgeTextActive]}>
                  {tabData[tab.key].length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── JOB LIST ── */}
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : loadError && activeTab !== 'saved' ? (
        <View style={s.loadingWrap}>
          <Ionicons name="alert-circle-outline" size={44} color={COLORS.muted} />
          <Text style={{ color: COLORS.muted, marginTop: 10 }}>Couldn't load your jobs. Pull to refresh.</Text>
        </View>
      ) : jobs.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              tab={activeTab}
              isWorker={isWorker}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onCancel={handleCancel}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
        />
      )}

      {/* ── BOTTOM NAV ── */}
      <View style={s.bottomNav}>
        {[
          { icon: 'home-outline', iconActive: 'home', label: 'Home', route: '/(tabs)/home', active: false },
          { icon: 'briefcase-outline', iconActive: 'briefcase', label: 'Jobs', route: '/bookings', active: true },
          { icon: 'add', iconActive: 'add', label: '', route: '/post-job', center: true },
          { icon: 'chatbubble-outline', iconActive: 'chatbubble', label: 'Messages', route: '/messages', active: false },
          { icon: 'person-outline', iconActive: 'person', label: 'Profile', route: '/profile', active: false },
        ].map(tab =>
          (tab as any).center ? (
            <TouchableOpacity key="center" style={s.centerBtn} activeOpacity={0.85} onPress={() => router.push(tab.route as any)}>
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity key={tab.label} style={s.navTab} activeOpacity={0.7} onPress={() => router.push(tab.route as any)}>
              <View>
                <Ionicons name={tab.active ? (tab.iconActive as any) : (tab.icon as any)} size={22} color={tab.active ? COLORS.primary : COLORS.muted} />
                {tab.label === 'Messages' && unreadCount > 0 && <View style={s.navDot} />}
              </View>
              <Text style={[s.navLabel, tab.active && s.navLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F0' },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, backgroundColor: '#fff' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  postBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  /* Summary strip */
  summaryStrip: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F0F0F0' },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  summaryItemActive: { borderBottomWidth: 0 },
  summaryBorder: { borderRightWidth: 1, borderColor: '#F0F0F0' },
  summaryCount: { fontSize: 18, fontWeight: '800', color: COLORS.muted, marginBottom: 2 },
  summaryCountActive: { color: COLORS.primary },
  summaryLabel: { fontSize: 10, color: COLORS.muted, fontWeight: '500' },

  /* Tab bar */
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#EBEBEB', paddingHorizontal: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderBottomWidth: 2.5, borderColor: 'transparent' },
  tabActive: { borderColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  tabBadge: { backgroundColor: '#E8E8E8', borderRadius: 8, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeActive: { backgroundColor: COLORS.primary + '20' },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.muted },
  tabBadgeTextActive: { color: COLORS.primary },

  /* List */
  list: { paddingTop: 14, paddingBottom: 110 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Bottom nav */
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#ECECEC', flexDirection: 'row', alignItems: 'center', paddingBottom: 22, paddingTop: 10, paddingHorizontal: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 10 },
  navTab: { flex: 1, alignItems: 'center', gap: 3 },
  navLabel: { fontSize: 10, fontWeight: '500', color: COLORS.muted },
  navLabelActive: { color: COLORS.primary, fontWeight: '700' },
  navDot: { position: 'absolute', top: -2, right: -6, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger },
  centerBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: COLORS.primary, shadowOpacity: 0.45, shadowRadius: 10, elevation: 8 },
});
