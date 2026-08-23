import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
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
      { heading: '1. Acceptance', body: 'By using AdwumaGo, you agree to be bound by these Terms of Service and all applicable laws and regulations of Ghana.' },
      { heading: '2. Use of Service', body: 'AdwumaGo is a marketplace platform connecting customers with skilled service providers. We do not directly employ workers listed on the platform.' },
      { heading: '3. User Accounts', body: 'You are responsible for safeguarding your account credentials. You agree not to share your account with any other person.' },
      { heading: '4. Payments', body: 'All transactions are processed securely through our approved payment partners. AdwumaGo charges a platform fee on each successful job.' },
      { heading: '5. Disputes', body: 'In the event of a dispute between a customer and worker, AdwumaGo will mediate but bears no financial liability for outcomes.' },
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
      { heading: '6. Your Rights', body: 'You have the right to access, correct, or delete your personal data at any time by contacting support@AdwumaGo.com.gh.' },
    ],
  },
];

export default function TermsScreen() {
  const T = useThemeColors();
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />
      <View style={[s.header, { backgroundColor: T.header, borderColor: T.border }]}>
        <ScreenContent style={s.headerInner}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
          <Text style={[s.title, { color: T.text }]}>Terms & Privacy</Text>
          <View style={{ width: 38 }} />
        </ScreenContent>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <ScreenContent>
          <Text style={[s.lastUpdated, { color: T.subText }]}>Last updated: June 2025</Text>
          {SECTIONS.map(section => (
            <View key={section.title} style={s.section}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              {section.content.map(item => (
                <View key={item.heading} style={s.item}>
                  <Text style={[s.itemHeading, { color: T.text }]}>{item.heading}</Text>
                  <Text style={[s.itemBody, { color: T.subText }]}>{item.body}</Text>
                </View>
              ))}
            </View>
          ))}
          <View style={s.contactBox}>
            <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
            <Text style={[s.contactText, { color: T.text }]}>
              Questions? Contact us at{' '}
              <Text style={s.contactLink}>legal@AdwumaGo.com.gh</Text>
            </Text>
          </View>
        </ScreenContent>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700' },
  scroll: { padding: 20, paddingBottom: 40 },
  lastUpdated: { fontSize: 12, marginBottom: 20 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: COLORS.primary, paddingLeft: 12 },
  item: { marginBottom: 14 },
  itemHeading: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  itemBody: { fontSize: 13, lineHeight: 21 },
  contactBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.primary + '10', borderRadius: RADIUS.md, padding: 14, marginTop: 8 },
  contactText: { flex: 1, fontSize: 13, lineHeight: 19 },
  contactLink: { color: COLORS.primary, fontWeight: '700' },
});
