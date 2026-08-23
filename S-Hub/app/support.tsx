import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FAQS = [
  { q: 'How do I post a job?', a: 'Tap the + button at the bottom of the home screen, fill in the service details, describe the job, add photos, set your location and tap Next to schedule.' },
  { q: 'How are workers verified?', a: 'All workers on AdwumaGo go through an identity verification process. Look for the blue verified badge on worker profiles.' },
  { q: 'What if I\'m not satisfied with the work?', a: 'You can report an issue within 24 hours of job completion. Our support team will review the case and facilitate a resolution.' },
  { q: 'How do I pay a worker?', a: 'Payments are made through the app using Mobile Money (MTN, Vodafone, AirtelTigo) or card. Funds are held securely until you confirm the job is complete.' },
  { q: 'Can I cancel a job?', a: 'You can cancel a job up to 2 hours before the scheduled time without a penalty. Late cancellations may incur a small fee.' },
  { q: 'How do I become a worker on AdwumaGo?', a: 'Go to Profile → Worker Profile to start the worker onboarding process. You\'ll need a valid Ghana ID and a skills assessment.' },
];

export default function SupportScreen() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const T = useThemeColors();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />
      <View style={[s.header, { backgroundColor: T.header, borderColor: T.border }]}>
        <ScreenContent style={s.headerInner}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
          <Text style={[s.title, { color: T.text }]}>Help & Support</Text>
          <View style={{ width: 38 }} />
        </ScreenContent>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <ScreenContent>

          {/* Contact options */}
          <Text style={[s.sectionLabel, { color: T.subText }]}>Contact Us</Text>
          <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
            {[
              { icon: 'chatbubble-ellipses-outline', label: 'Live Chat', detail: 'Usually replies in 5 mins', color: COLORS.primary, onPress: () => Alert.alert('Live Chat', 'Connecting you to a support agent...') },
              { icon: 'call-outline', label: 'Call Support', detail: '+233 302 000 000', color: '#1D6FBA', onPress: () => Linking.openURL('tel:+233302000000') },
              { icon: 'mail-outline', label: 'Email Us', detail: 'support@AdwumaGo.com.gh', color: '#D97706', onPress: () => Linking.openURL('mailto:support@AdwumaGo.com.gh') },
            ].map((item, i) => (
              <View key={item.label}>
                {i > 0 && <View style={[s.divider, { backgroundColor: T.divider }]} />}
                <TouchableOpacity style={s.contactRow} onPress={item.onPress} activeOpacity={0.75}>
                  <View style={[s.contactIconWrap, { backgroundColor: item.color + '18' }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <View style={s.contactInfo}>
                    <Text style={[s.contactLabel, { color: T.text }]}>{item.label}</Text>
                    <Text style={[s.contactDetail, { color: T.subText }]}>{item.detail}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <Text style={[s.sectionLabel, { color: T.subText }]}>Frequently Asked Questions</Text>
          <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
            {FAQS.map((faq, i) => (
              <View key={i}>
                {i > 0 && <View style={[s.divider, { backgroundColor: T.divider }]} />}
                <TouchableOpacity style={s.faqRow} onPress={() => setOpenFaq(openFaq === i ? null : i)} activeOpacity={0.75}>
                  <Text style={[s.faqQ, { color: T.text }]}>{faq.q}</Text>
                  <Ionicons name={openFaq === i ? 'chevron-up' : 'chevron-down'} size={18} color={T.subText} />
                </TouchableOpacity>
                {openFaq === i && (
                  <View style={s.faqAnswer}>
                    <Text style={[s.faqA, { color: T.subText }]}>{faq.a}</Text>
                  </View>
                )}
              </View>
            ))}
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
  scroll: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  card: { borderRadius: RADIUS.lg, marginBottom: 20, borderWidth: 1, overflow: 'hidden' },
  divider: { height: 1, marginLeft: 56 },
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  contactIconWrap: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  contactDetail: { fontSize: 12 },
  faqRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  faqAnswer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 0 },
  faqA: { fontSize: 13, lineHeight: 20 },
});
