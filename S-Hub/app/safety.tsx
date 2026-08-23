import { COLORS, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SafetyScreen() {
  const [shareLocation, setShareLocation] = useState(true);
  const [twoFactor, setTwoFactor]         = useState(false);
  const [biometric, setBiometric]         = useState(true);
  const T = useThemeColors();

  const CONTACTS = [
    { name: 'Abena Mensah', phone: '+233 24 111 2233', relation: 'Sister' },
    { name: 'Kweku Agyei',  phone: '+233 50 444 5566', relation: 'Father' },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />
      <View style={[s.header, { backgroundColor: T.header, borderColor: T.border }]}>
        <ScreenContent style={s.headerInner}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
          <Text style={[s.title, { color: T.text }]}>Safety</Text>
          <View style={{ width: 38 }} />
        </ScreenContent>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <ScreenContent>

          {/* Emergency button */}
          <TouchableOpacity
            style={s.emergencyBtn}
            activeOpacity={0.85}
            onPress={() => Alert.alert('🚨 Emergency', 'Your emergency contacts will be notified and support will be dispatched.')}
          >
            <MaterialCommunityIcons name="alarm-light-outline" size={24} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={s.emergencyTitle}>Emergency Panic Button</Text>
              <Text style={s.emergencySub}>Tap to alert contacts and support</Text>
            </View>
          </TouchableOpacity>

          <Text style={[s.sectionLabel, { color: T.subText }]}>Security</Text>
          <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <View style={s.toggleRow}>
              <Ionicons name="location-outline" size={20} color={T.text} style={s.rowIcon} />
              <View style={s.rowInfo}>
                <Text style={[s.rowLabel, { color: T.text }]}>Share Location During Jobs</Text>
                <Text style={[s.rowSub, { color: T.subText }]}>Workers can see your general area</Text>
              </View>
              <Switch value={shareLocation} onValueChange={setShareLocation} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor="#fff" />
            </View>
            <View style={[s.divider, { backgroundColor: T.divider }]} />
            <View style={s.toggleRow}>
              <Ionicons name="phone-portrait-outline" size={20} color={T.text} style={s.rowIcon} />
              <View style={s.rowInfo}>
                <Text style={[s.rowLabel, { color: T.text }]}>Two-Factor Authentication</Text>
                <Text style={[s.rowSub, { color: T.subText }]}>Extra security on login</Text>
              </View>
              <Switch value={twoFactor} onValueChange={setTwoFactor} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor="#fff" />
            </View>
            <View style={[s.divider, { backgroundColor: T.divider }]} />
            <View style={s.toggleRow}>
              <Ionicons name="finger-print-outline" size={20} color={T.text} style={s.rowIcon} />
              <View style={s.rowInfo}>
                <Text style={[s.rowLabel, { color: T.text }]}>Biometric Login</Text>
                <Text style={[s.rowSub, { color: T.subText }]}>Use fingerprint or face ID</Text>
              </View>
              <Switch value={biometric} onValueChange={setBiometric} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor="#fff" />
            </View>
            <View style={[s.divider, { backgroundColor: T.divider }]} />
            <TouchableOpacity style={s.actionRow} activeOpacity={0.7} onPress={() => Alert.alert('Change Password', 'A password reset link will be sent to your email.')}>
              <Ionicons name="lock-closed-outline" size={20} color={T.text} style={s.rowIcon} />
              <Text style={[s.rowLabel, { color: T.text }]}>Change Password</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          <Text style={[s.sectionLabel, { color: T.subText }]}>Emergency Contacts</Text>
          <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
            {CONTACTS.map((c, i) => (
              <View key={c.phone}>
                {i > 0 && <View style={[s.divider, { backgroundColor: T.divider }]} />}
                <View style={s.contactRow}>
                  <View style={s.contactAvatar}>
                    <Text style={s.contactInitial}>{c.name[0]}</Text>
                  </View>
                  <View style={s.rowInfo}>
                    <Text style={[s.rowLabel, { color: T.text }]}>{c.name}</Text>
                    <Text style={[s.rowSub, { color: T.subText }]}>{c.relation} · {c.phone}</Text>
                  </View>
                  <TouchableOpacity onPress={() => Alert.alert('Remove', `Remove ${c.name}?`)}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={[s.divider, { backgroundColor: T.divider }]} />
            <TouchableOpacity style={s.actionRow} activeOpacity={0.7} onPress={() => Alert.alert('Add Contact', 'Contact picker coming soon.')}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} style={s.rowIcon} />
              <Text style={[s.rowLabel, { color: COLORS.primary }]}>Add Emergency Contact</Text>
            </TouchableOpacity>
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
  emergencyBtn: { backgroundColor: COLORS.danger, borderRadius: RADIUS.lg, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  emergencyTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emergencySub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  card: { borderRadius: RADIUS.lg, marginBottom: 20, borderWidth: 1, overflow: 'hidden' },
  divider: { height: 1, marginLeft: 56 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowIcon: { width: 24 },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 11, marginTop: 2 },
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  contactAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center' },
  contactInitial: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
});
