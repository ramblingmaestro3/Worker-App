import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PROMOS = [
  { code: 'WELCOME50', discount: 'GH₵ 50 off', description: 'First job posted', expires: 'Dec 31, 2025', used: false },
  { code: 'ADWUMAGO10',   discount: '10% off',     description: 'Any service booking', expires: 'Sep 30, 2025', used: false },
  { code: 'KUMASI20',  discount: 'GH₵ 20 off',  description: 'Kumasi area jobs',    expires: 'Jun 01, 2025', used: true  },
];

export default function PromotionsScreen() {
  const [code, setCode] = useState('');
  const T = useThemeColors();

  const applyCode = () => {
    if (!code.trim()) return;
    const found = PROMOS.find(p => p.code === code.toUpperCase() && !p.used);
    if (found) {
      Alert.alert('🎉 Code Applied!', `${found.discount} has been added to your account.`);
      setCode('');
    } else {
      Alert.alert('Invalid Code', 'The promo code you entered is invalid or has already been used.');
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />
      <View style={[s.header, { backgroundColor: T.header, borderColor: T.border }]}>
        <ScreenContent style={s.headerInner}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
          <Text style={[s.title, { color: T.text }]}>Promotions</Text>
          <View style={{ width: 38 }} />
        </ScreenContent>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <ScreenContent>

            <View style={[s.inputCard, { backgroundColor: T.card, borderColor: T.border }]}>
              <MaterialCommunityIcons name="tag-outline" size={20} color={COLORS.primary} />
              <TextInput
                style={[s.codeInput, { color: T.text }]}
                placeholder="Enter promo code"
                placeholderTextColor={T.subText}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={applyCode}
              />
              <TouchableOpacity style={s.applyBtn} onPress={applyCode} activeOpacity={0.85}>
                <Text style={s.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>

            <Text style={[s.sectionLabel, { color: T.subText }]}>Your Promotions</Text>
            {PROMOS.map((promo) => (
              <View key={promo.code} style={[s.promoCard, { backgroundColor: T.card, borderColor: T.border }, promo.used && s.promoCardUsed]}>
                <View style={s.promoLeft}>
                  <View style={[s.promoIconWrap, { backgroundColor: promo.used ? T.inputBg : COLORS.primary + '18' }]}>
                    <MaterialCommunityIcons name="ticket-percent-outline" size={22} color={promo.used ? T.subText : COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.promoTop}>
                      <Text style={[s.promoCode, { color: T.text }, promo.used && { color: T.subText }]}>{promo.code}</Text>
                      {promo.used && <View style={[s.usedBadge, { backgroundColor: T.inputBg }]}><Text style={[s.usedBadgeText, { color: T.subText }]}>Used</Text></View>}
                    </View>
                    <Text style={s.promoDiscount}>{promo.discount}</Text>
                    <Text style={[s.promoDesc, { color: T.subText }]}>{promo.description}</Text>
                    <Text style={[s.promoExpiry, { color: T.subText }]}>Expires {promo.expires}</Text>
                  </View>
                </View>
                {!promo.used && (
                  <TouchableOpacity style={s.promoUseBtn} activeOpacity={0.8} onPress={() => Alert.alert('Use Code', `${promo.code} will be applied to your next job.`)}>
                    <Text style={s.promoUseBtnText}>Use</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

          </ScreenContent>
        </ScrollView>
      </KeyboardAvoidingView>
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
  inputCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderWidth: 1, marginBottom: 24 },
  codeInput: { flex: 1, fontSize: 15, fontWeight: '600', letterSpacing: 1 },
  applyBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  applyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: 12, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  promoCard: { borderRadius: RADIUS.lg, padding: 14, marginBottom: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  promoCardUsed: { opacity: 0.6 },
  promoLeft: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  promoIconWrap: { width: 46, height: 46, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  promoTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  promoCode: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  textUsed: { color: COLORS.muted },
  usedBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  usedBadgeText: { fontSize: 10, fontWeight: '700' },
  promoDiscount: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  promoDesc: { fontSize: 12 },
  promoExpiry: { fontSize: 11, marginTop: 4 },
  promoUseBtn: { backgroundColor: COLORS.primary + '18', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  promoUseBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});
