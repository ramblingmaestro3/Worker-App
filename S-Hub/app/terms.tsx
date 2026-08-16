import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SECTIONS = [
  {
    title: 'Terms of Service',
    content: [
      { heading: '1. Acceptance', body: 'By using Vaker, you agree to be bound by these Terms of Service and all applicable laws and regulations of Ghana.' },
      { heading: '2. Use of Service', body: 'Vaker is a marketplace platform connecting customers with skilled service providers. We do not directly employ workers listed on the platform.' },
      { heading: '3. User Accounts', body: 'You are responsible for safeguarding your account credentials. You agree not to share your account with any other person.' },
      { heading: '4. Payments', body: 'All transactions are processed securely through our approved payment partners. Vaker charges a platform fee on each successful job.' },
      { heading: '5. Disputes', body: 'In the event of a dispute between a customer and worker, Vaker will mediate but bears no financial liability for outcomes.' },
      { heading: '6. Termination', body: 'We reserve the right to suspend or terminate accounts that violate these terms without prior notice.' },
    ],
  },
  {
    title: 'Privacy Policy',
    content: [
      { heading: '1. Data Collection', body: 'We collect personal information such as your name, phone number, email address, and location to provide our services.' },
      { heading: '2. Use of Data', body: 'Your data is used to match you with service providers, process payments, and improve our platform.' },
      { heading: '3. Data Sharing', body: 'We do not sell your personal data. We may share limited data with trusted partners for service delivery (e.g., payment processors).' },
      { heading: '4. Location Data', body: 'Location data is used to show nearby workers and for job routing. You may disable location access in your phone settings.' },
      { heading: '5. Data Security', body: 'We use industry-standard encryption to protect your data. However, no system is 100% secure.' },
      { heading: '6. Your Rights', body: 'You have the right to access, correct, or delete your personal data at any time by contacting support@vaker.com.gh.' },
    ],
  },
];

export default function TermsScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={s.title}>Terms & Privacy</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Text style={s.lastUpdated}>Last updated: June 2025</Text>

        {SECTIONS.map(section => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            {section.content.map(item => (
              <View key={item.heading} style={s.item}>
                <Text style={s.itemHeading}>{item.heading}</Text>
                <Text style={s.itemBody}>{item.body}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={s.contactBox}>
          <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
          <Text style={s.contactText}>
            Questions? Contact us at{' '}
            <Text style={s.contactLink}>legal@vaker.com.gh</Text>
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F0' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F0F0F0' },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  scroll: { padding: 20, paddingBottom: 40 },
  lastUpdated: { fontSize: 12, color: COLORS.muted, marginBottom: 20 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: COLORS.primary, paddingLeft: 12 },
  item: { marginBottom: 14 },
  itemHeading: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  itemBody: { fontSize: 13, color: '#555555', lineHeight: 21 },
  contactBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.primary + '10', borderRadius: 12, padding: 14, marginTop: 8 },
  contactText: { flex: 1, fontSize: 13, color: '#444', lineHeight: 19 },
  contactLink: { color: COLORS.primary, fontWeight: '700' },
});
