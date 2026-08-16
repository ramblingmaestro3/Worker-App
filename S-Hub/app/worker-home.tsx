import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { useUnreadMessages } from '../contexts/unread-messages';
import { api } from '../lib/api';
import { messagingSocket } from '../lib/messaging';

type JobRequest = {
  id: number;
  title: string;
  description: string;
  scheduled_date?: string;
  scheduled_time?: string;
  location_address?: string;
  is_emergency?: boolean;
  image_urls?: string[];
  service?: { name?: string };
};

export default function WorkerHomeScreen() {
  const { unreadCount } = useUnreadMessages();
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  const loadJobs = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const result = await api.getOpenJobRequests({ per_page: 50 });
      setJobs(result.items || []);
    } catch (error: any) {
      Alert.alert('Could not load requests', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  useEffect(() => {
    const socket = messagingSocket();
    if (!socket) return;
    const handleNew = (payload: any) => {
      if (payload?.related_entity_type === 'booking') loadJobs(true);
    };
    socket.on('notification:new', handleNew);
    return () => { socket.off('notification:new', handleNew); };
  }, [loadJobs]);

  const acceptJob = (job: JobRequest) => {
    Alert.alert('Accept request', `Accept “${job.title}”? The customer will be notified.`, [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          setAcceptingId(job.id);
          try {
            await api.acceptBooking(job.id);
            setJobs(current => current.filter(item => item.id !== job.id));
            Alert.alert('Request accepted', 'You can now coordinate with the customer in Messages.');
          } catch (error: any) {
            Alert.alert('Could not accept request', error?.message || 'This request may already be taken.');
            loadJobs(true);
          } finally {
            setAcceptingId(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>WORKER DASHBOARD</Text>
          <Text style={styles.title}>Available requests</Text>
          <Text style={styles.subtitle}>Choose work that fits your skills and schedule.</Text>
        </View>
        <TouchableOpacity style={styles.bell} onPress={() => router.push('/notifications' as any)}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={job => String(job.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadJobs(true)} tintColor={COLORS.primary} />}
          contentContainerStyle={jobs.length ? styles.list : styles.emptyList}
          ListHeaderComponent={<Text style={styles.count}>{jobs.length} open request{jobs.length === 1 ? '' : 's'} near you</Text>}
          renderItem={({ item: job }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/request-details', params: { id: job.id } } as any)}
            >
              <View style={styles.cardTop}>
                <View style={[styles.iconBox, job.is_emergency && styles.emergencyIcon]}>
                  <Ionicons name={job.is_emergency ? 'alert' : 'construct-outline'} size={20} color={job.is_emergency ? '#B42318' : COLORS.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <Text style={styles.service}>{job.service?.name || 'Service request'}</Text>
                </View>
                {job.is_emergency && <Text style={styles.emergency}>URGENT</Text>}
              </View>
              <Text style={styles.description} numberOfLines={3}>{job.description}</Text>
              {!!job.image_urls?.[0] && <Image source={{ uri: job.image_urls[0] }} style={styles.image} />}
              <View style={styles.detail}><Ionicons name="calendar-outline" size={15} color={COLORS.muted} /><Text style={styles.detailText}>{job.scheduled_date || 'Schedule flexible'}{job.scheduled_time ? ` · ${job.scheduled_time}` : ''}</Text></View>
              <View style={styles.detail}><Ionicons name="location-outline" size={15} color={COLORS.muted} /><Text style={styles.detailText}>{job.location_address || 'Location shared after acceptance'}</Text></View>
              <TouchableOpacity style={styles.acceptButton} onPress={() => acceptJob(job)} disabled={acceptingId === job.id}>
                {acceptingId === job.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptText}>Accept request</Text>}
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="briefcase-outline" size={48} color={COLORS.muted} /><Text style={styles.emptyTitle}>No open requests yet</Text><Text style={styles.emptyText}>Pull down to refresh. New requests will appear here as customers post them.</Text></View>}
        />
      )}

      <View style={styles.nav}>
        <TouchableOpacity style={styles.navItem}><Ionicons name="home" size={22} color={COLORS.primary} /><Text style={[styles.navLabel, styles.navActive]}>Requests</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/bookings' as any)}><Ionicons name="briefcase-outline" size={22} color={COLORS.muted} /><Text style={styles.navLabel}>My jobs</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/messages' as any)}><View><Ionicons name="chatbubble-outline" size={22} color={COLORS.muted} />{unreadCount>0 && <View style={styles.navDot} />}</View><Text style={styles.navLabel}>Messages</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile' as any)}><Ionicons name="person-outline" size={22} color={COLORS.muted} /><Text style={styles.navLabel}>Profile</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7F6' }, header: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { fontSize: 11, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 }, title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 3 }, subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 3 }, bell: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F3F4F3', alignItems: 'center', justifyContent: 'center' }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center' }, list: { padding: 16, paddingBottom: 95 }, emptyList: { flexGrow: 1, padding: 16 }, count: { fontSize: 13, color: COLORS.muted, fontWeight: '600', marginBottom: 12 }, card: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E8EAE8' }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#E6F4EE', alignItems: 'center', justifyContent: 'center' }, emergencyIcon: { backgroundColor: '#FEE4E2' }, cardInfo: { flex: 1 }, jobTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text }, service: { fontSize: 12, color: COLORS.muted, marginTop: 2 }, emergency: { fontSize: 10, fontWeight: '800', color: '#B42318', backgroundColor: '#FEE4E2', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 }, description: { fontSize: 13, color: '#4B5563', lineHeight: 19, marginTop: 13, marginBottom: 12 }, image: { height: 150, width: '100%', borderRadius: 10, marginBottom: 12, backgroundColor: '#EEE' }, detail: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 }, detailText: { fontSize: 12, color: COLORS.muted, flex: 1 }, acceptButton: { backgroundColor: COLORS.primary, alignItems: 'center', borderRadius: 10, paddingVertical: 12, marginTop: 7 }, acceptText: { color: '#fff', fontWeight: '800', fontSize: 14 }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingBottom: 80 }, emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 14 }, emptyText: { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 19, marginTop: 7 }, nav: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E8EAE8', paddingVertical: 10 }, navItem: { flex: 1, alignItems: 'center', gap: 3 }, navLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '600' }, navActive: { color: COLORS.primary, fontWeight: '800' }, navDot: { position: 'absolute', top: -2, right: -6, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger },
});
