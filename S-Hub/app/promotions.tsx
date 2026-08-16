import { COLORS } from '@/constants/theme';
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

export default function PromotionsScreen() {
  const [code, setCode] = useState('');

  const applyCode = () => {
    if (!code.trim()) return;
    Alert.alert('Promotions coming soon', 'Promo codes aren\'t available yet — check back soon.');
    setCode('');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={s.title}>Promotions</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Enter promo code */}
          <View style={s.inputCard}>
            <MaterialCommunityIcons name="tag-outline" size={20} color={COLORS.primary} />
            <TextInput
              style={s.codeInput}
              placeholder="Enter promo code"
              placeholderTextColor={COLORS.muted}
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

          {/* Active promos */}
          <Text style={s.sectionLabel}>Your Promotions</Text>
          <View style={s.emptyBox}>
            <MaterialCommunityIcons name="ticket-percent-outline" size={36} color={COLORS.muted} />
            <Text style={s.emptyTitle}>No active promotions</Text>
            <Text style={s.emptySub}>Promo codes and offers aren't available yet — check back soon.</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F0' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F0F0F0' },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  scroll: { padding: 16, paddingBottom: 40 },
  inputCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderWidth: 1, borderColor: '#E8E8E8', marginBottom: 24 },
  codeInput: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1A1A', letterSpacing: 1 },
  applyBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  applyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginBottom: 12, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  emptyBox: { backgroundColor: '#fff', borderRadius: 16, padding: 28, borderWidth: 1, borderColor: '#E8E8E8', alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginTop: 4 },
  emptySub: { fontSize: 12, color: COLORS.muted, textAlign: 'center', lineHeight: 18 },
});
