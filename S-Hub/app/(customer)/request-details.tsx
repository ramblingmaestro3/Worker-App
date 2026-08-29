import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { api } from '@/lib/api';

type BookingDetail = {
  id: number;
  title: string;
  description: string;
  status: string;
  scheduled_date?: string;
  scheduled_time?: string;
  is_emergency?: boolean;
  image_urls?: string[];
  location_address?: string;
  location_city?: string;
  location_region?: string;
  estimated_cost?: number;
  hourly_rate?: number;
  service?: { name?: string; icon?: string } | null;
  customer?: { full_name?: string; name?: string } | null;
  worker_id?: number | null;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [job, setJob] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const bookingId = Number(id);
    if (!bookingId) { setLoading(false); return; }
    setLoading(true);
    api.getBooking(bookingId)
      .then(result => { if (mounted) setJob(result.booking); })
      .catch((error: any) => {
        if (mounted) Alert.alert('Could not load request', error?.message || 'Please try again.');
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  const acceptJob = () => {
    if (!job) return;
    Alert.alert('Accept request', `Accept “${job.title}”? The customer will be notified.`, [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          setAccepting(true);
          try {
            await api.acceptBooking(job.id);
            Alert.alert('Request accepted', 'You can now coordinate with the customer in Messages.');
            router.back();
          } catch (error: any) {
            Alert.alert('Could not accept request', error?.message || 'This request may already be taken.');
          } finally {
            setAccepting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, s.center]} edges={['top', 'bottom']}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={[s.safe, s.center]} edges={['top', 'bottom']}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.muted} />
        <Text style={s.notFoundTitle}>Request not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const location = [job.location_address, job.location_city, job.location_region].filter(Boolean).join(', ') || 'Location shared after acceptance';
  const images = job.image_urls || [];

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Request details</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
        <View style={s.titleRow}>
          <View style={[s.iconBox, job.is_emergency && s.emergencyIcon]}>
            <Ionicons name={job.is_emergency ? 'alert' : 'construct-outline'} size={22} color={job.is_emergency ? '#B42318' : COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{job.title}</Text>
            <Text style={s.service}>{job.service?.name || 'Service request'}</Text>
          </View>
          {job.is_emergency && <Text style={s.emergency}>URGENT</Text>}
        </View>

        {images.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.imageRow}>
              {images.map((uri, index) => (
                <TouchableOpacity key={uri + index} activeOpacity={0.85} onPress={() => setViewerIndex(index)}>
                  <Image source={{ uri }} style={s.thumb} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionLabel}>Job description</Text>
          <Text style={s.description}>{job.description}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Details</Text>
          <View style={s.detailCard}>
            <View style={s.detailRow}>
              <Ionicons name="build-outline" size={17} color={COLORS.muted} />
              <View style={{ flex: 1 }}>
                <Text style={s.detailLabel}>Work category</Text>
                <Text style={s.detailValue}>{job.service?.name || 'Not specified'}</Text>
              </View>
            </View>
            <View style={s.detailRow}>
              <Ionicons name="location-outline" size={17} color={COLORS.muted} />
              <View style={{ flex: 1 }}>
                <Text style={s.detailLabel}>Job site location</Text>
                <Text style={s.detailValue}>{location}</Text>
              </View>
            </View>
            <View style={s.detailRow}>
              <Ionicons name="calendar-outline" size={17} color={COLORS.muted} />
              <View style={{ flex: 1 }}>
                <Text style={s.detailLabel}>Schedule</Text>
                <Text style={s.detailValue}>{job.scheduled_date || 'Flexible'}{job.scheduled_time ? ` · ${job.scheduled_time}` : ''}</Text>
              </View>
            </View>
            {(job.estimated_cost != null || job.hourly_rate != null) && (
              <View style={s.detailRow}>
                <Ionicons name="cash-outline" size={17} color={COLORS.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={s.detailLabel}>Estimated cost</Text>
                  <Text style={s.detailValue}>{job.estimated_cost != null ? `GH₵ ${job.estimated_cost}` : `GH₵ ${job.hourly_rate}/hr`}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {job.status === 'open' && !job.worker_id && (
        <View style={s.footer}>
          <TouchableOpacity style={s.acceptButton} onPress={acceptJob} disabled={accepting}>
            {accepting ? <ActivityIndicator color="#fff" /> : <Text style={s.acceptText}>Accept request</Text>}
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={viewerIndex !== null} transparent animationType="fade" onRequestClose={() => setViewerIndex(null)}>
        <View style={s.viewerBackdrop}>
          <TouchableOpacity style={s.viewerClose} onPress={() => setViewerIndex(null)}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          {viewerIndex !== null && (
            <Image source={{ uri: images[viewerIndex] }} style={s.viewerImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7F6' },
  center: { alignItems: 'center', justifyContent: 'center' },
  notFoundTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#E8EAE8' },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3F4F3', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '800', color: COLORS.text },
  body: { padding: 16, paddingBottom: 30 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#E8EAE8' },
  iconBox: { width: 46, height: 46, borderRadius: 13, backgroundColor: '#E6F4EE', alignItems: 'center', justifyContent: 'center' },
  emergencyIcon: { backgroundColor: '#FEE4E2' },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  service: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  emergency: { fontSize: 10, fontWeight: '800', color: '#B42318', backgroundColor: '#FEE4E2', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  section: { marginTop: 18 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: COLORS.muted, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' },
  imageRow: { gap: 10 },
  thumb: { width: 130, height: 130, borderRadius: 12, backgroundColor: '#EEE' },
  description: { fontSize: 14, color: '#374151', lineHeight: 21, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E8EAE8' },
  detailCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E8EAE8', padding: 14, gap: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  detailValue: { fontSize: 14, color: COLORS.text, fontWeight: '600', marginTop: 2 },
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E8EAE8' },
  acceptButton: { backgroundColor: COLORS.primary, alignItems: 'center', borderRadius: 12, paddingVertical: 14 },
  acceptText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerClose: { position: 'absolute', top: 50, right: 20, zIndex: 1, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: SCREEN_WIDTH, height: '80%' },
});
