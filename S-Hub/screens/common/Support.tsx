/**
 * Help & support: contact options (some placeholder) and an FAQ list.
 */
import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect, useState } from 'react';
import {
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alert } from '@/lib/Alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
import type { RootStackParamList } from '@/navigation/types';

const FAQS = [
  { q: 'How do I post a job?', a: 'Tap the + button at the bottom of the home screen, fill in the service details, describe the job, add photos, set your location and tap Next to schedule.' },
  { q: 'How are workers verified?', a: 'All workers on AdwumaGo go through an identity verification process. Look for the blue verified badge on worker profiles.' },
  { q: 'What if I\'m not satisfied with the work?', a: 'You can report an issue within 24 hours of job completion. Our support team will review the case and facilitate a resolution.' },
  { q: 'How do I pay a worker?', a: 'AdwumaGo doesn\'t process payments. You agree on a price with the worker in the app, then pay them directly — cash, Mobile Money, or however you\'ve arranged — once the job is done.' },
  { q: 'Can I cancel a job?', a: 'You can cancel a request or booking any time before it\'s marked complete, with no fee — just be considerate of the worker\'s time if they\'re already on the way.' },
  { q: 'How do I become a worker on AdwumaGo?', a: 'Go to Profile → Worker Profile to start the worker onboarding process. You\'ll need a valid Ghana ID and a skills assessment.' },
];

export default function SupportScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Support'>) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const T = useThemeColors();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />
      <ScreenHeader title="Help & Support" onBack={() => navigation.goBack()} />

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
