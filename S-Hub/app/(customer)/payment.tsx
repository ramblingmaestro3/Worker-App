import { COLORS } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PaymentMethod = { id: number; type: string; label: string; detail: string; icon: string; default: boolean };

export default function PaymentScreen() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  const setDefault = (id: number) => {
    setMethods(m => m.map(x => ({ ...x, default: x.id === id })));
  };

  const remove = (id: number) => {
    Alert.alert('Remove', 'Remove this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setMethods(m => m.filter(x => x.id !== id)) },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={s.title}>Payment Methods</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>Saved Methods</Text>
        {methods.length === 0 ? (
          <View style={s.emptyBox}>
            <MaterialCommunityIcons name="wallet-outline" size={32} color={COLORS.muted} />
            <Text style={s.emptyTitle}>No payment methods added yet</Text>
            <Text style={s.emptySub}>Add one below to pay workers directly in the app.</Text>
          </View>
        ) : (
          <View style={s.card}>
            {methods.map((m, i) => (
              <View key={m.id}>
                {i > 0 && <View style={s.divider} />}
                <View style={s.methodRow}>
                  <Text style={s.methodIcon}>{m.icon}</Text>
                  <View style={s.methodInfo}>
                    <View style={s.methodTop}>
                      <Text style={s.methodLabel}>{m.label}</Text>
                      {m.default && (
                        <View style={s.defaultBadge}>
                          <Text style={s.defaultBadgeText}>Default</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.methodDetail}>{m.detail}</Text>
                  </View>
                  <View style={s.methodActions}>
                    {!m.default && (
                      <TouchableOpacity onPress={() => setDefault(m.id)} style={s.actionBtn}>
                        <Text style={s.actionLink}>Set default</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => remove(m.id)} style={s.actionBtn}>
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={s.sectionLabel}>Add New</Text>
        <View style={s.card}>
          {[
            { label: 'MTN Mobile Money', icon: '📱' },
            { label: 'Vodafone Cash',    icon: '📲' },
            { label: 'AirtelTigo Money', icon: '📶' },
            { label: 'Visa / Mastercard', icon: '💳' },
          ].map((opt, i, arr) => (
            <View key={opt.label}>
              {i > 0 && <View style={s.divider} />}
              <TouchableOpacity
                style={s.addRow}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Add Payment', `${opt.label} integration coming soon.`)}
              >
                <Text style={s.methodIcon}>{opt.icon}</Text>
                <Text style={s.addLabel}>{opt.label}</Text>
                <Ionicons name="chevron-forward" size={18} color="#BBB" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={s.infoBox}>
          <MaterialCommunityIcons name="shield-lock-outline" size={16} color={COLORS.primary} />
          <Text style={s.infoText}>Your payment details are encrypted and securely stored.</Text>
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
  scroll: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  emptyBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: '#F0F0F0', alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginTop: 4 },
  emptySub: { fontSize: 12, color: COLORS.muted, textAlign: 'center', lineHeight: 18 },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#F0F0F0', overflow: 'hidden' },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 56 },
  methodRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  methodIcon: { fontSize: 26, width: 36, textAlign: 'center' },
  methodInfo: { flex: 1 },
  methodTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  methodLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  methodDetail: { fontSize: 12, color: COLORS.muted },
  defaultBadge: { backgroundColor: COLORS.primary + '18', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  methodActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionBtn: { padding: 4 },
  actionLink: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  addRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  addLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1A1A1A' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.primary + '10', borderRadius: 12, padding: 14 },
  infoText: { flex: 1, fontSize: 12, color: COLORS.primary, fontWeight: '500', lineHeight: 18 },
});
