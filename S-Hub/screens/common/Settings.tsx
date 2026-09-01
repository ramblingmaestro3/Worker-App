import { COLORS, RADIUS } from '@/constants/theme';
import { useAppTheme, useThemeColors } from '@/contexts/ThemeContext';
import ScreenContent from '@/components/ScreenContent';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect, useState } from 'react';
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
import { resetToSignIn } from '@/navigation/navigationRef';
import type { RootStackParamList } from '@/navigation/types';

export default function SettingsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Settings'>) {
  const { isDark, toggleDark } = useAppTheme();
  const T = useThemeColors();
  const [language, setLanguage] = useState('English');
  const [currency] = useState('GHS (₵)');
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: true, headerTitle: 'Settings' });
  }, [navigation]);

  const LANGUAGES = ['English', 'Twi', 'Ga', 'Ewe', 'Hausa'];
  const iconColor = T.icon;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <ScreenContent>

          {/* Profile summary */}
          <TouchableOpacity
            style={[s.profileCard, { backgroundColor: T.card, borderColor: T.border }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('WorkerPersonalInfo')}
          >
            <View style={[s.profileAvatar, { backgroundColor: COLORS.primary }]}>
              <Ionicons name="person" size={26} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.profileName, { color: T.text }]}>Kofi Mensah</Text>
              <Text style={[s.profileMeta, { color: COLORS.primary }]}>Verified Pro • Accra</Text>
            </View>
            <Ionicons name="pencil-outline" size={18} color={iconColor} />
          </TouchableOpacity>

          {/* Preferences */}
          <Text style={[s.sectionLabel, { color: T.subText }]}>Preferences</Text>
          <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <TouchableOpacity
              style={s.row}
              activeOpacity={0.7}
              onPress={() =>
                Alert.alert('Language', 'Choose language:', LANGUAGES.map(l => ({
                  text: l, onPress: () => setLanguage(l),
                })).concat([{ text: 'Cancel', onPress: () => { } }]))
              }
            >
              <View style={[s.iconChip, { backgroundColor: T.inputBg }]}>
                <Ionicons name="language-outline" size={18} color={iconColor} />
              </View>
              <Text style={[s.rowLabel, { color: T.text }]}>Language</Text>
              <Text style={[s.rowValue, { color: T.subText }]}>{language}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </TouchableOpacity>
            <View style={[s.divider, { backgroundColor: T.divider }]} />
            <TouchableOpacity
              style={s.row}
              activeOpacity={0.7}
              onPress={() => Alert.alert('Currency', 'Currency selection coming soon.')}
            >
              <View style={[s.iconChip, { backgroundColor: T.inputBg }]}>
                <Ionicons name="cash-outline" size={18} color={iconColor} />
              </View>
              <Text style={[s.rowLabel, { color: T.text }]}>Currency</Text>
              <Text style={[s.rowValue, { color: T.subText }]}>{currency}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </TouchableOpacity>
            <View style={[s.divider, { backgroundColor: T.divider }]} />
            <View style={s.row}>
              <View style={[s.iconChip, { backgroundColor: T.inputBg }]}>
                <Ionicons name="moon-outline" size={18} color={iconColor} />
              </View>
              <View style={s.rowInfo}>
                <Text style={[s.rowLabel, { color: T.text }]}>Dark Mode</Text>
                <Text style={[s.rowSub, { color: T.subText }]}>{isDark ? 'On' : 'Off'}</Text>
              </View>
              <Switch value={isDark} onValueChange={toggleDark} trackColor={{ false: '#E0E0E0', true: COLORS.primary }} thumbColor="#fff" />
            </View>
          </View>

          {/* Notifications */}
          <Text style={[s.sectionLabel, { color: T.subText }]}>Notifications</Text>
          <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <View style={s.row}>
              <View style={[s.iconChip, { backgroundColor: T.inputBg }]}>
                <Ionicons name="notifications-outline" size={18} color={iconColor} />
              </View>
              <View style={s.rowInfo}>
                <Text style={[s.rowLabel, { color: T.text }]}>Push Notifications</Text>
                <Text style={[s.rowSub, { color: T.subText }]}>Job updates and messages</Text>
              </View>
              <Switch value={pushNotifs} onValueChange={setPushNotifs} trackColor={{ false: '#E0E0E0', true: COLORS.primary }} thumbColor="#fff" />
            </View>
            <View style={[s.divider, { backgroundColor: T.divider }]} />
            <View style={s.row}>
              <View style={[s.iconChip, { backgroundColor: T.inputBg }]}>
                <Ionicons name="mail-outline" size={18} color={iconColor} />
              </View>
              <View style={s.rowInfo}>
                <Text style={[s.rowLabel, { color: T.text }]}>Email Notifications</Text>
                <Text style={[s.rowSub, { color: T.subText }]}>Receipts and account updates</Text>
              </View>
              <Switch value={emailNotifs} onValueChange={setEmailNotifs} trackColor={{ false: '#E0E0E0', true: COLORS.primary }} thumbColor="#fff" />
            </View>
            <View style={[s.divider, { backgroundColor: T.divider }]} />
            <View style={s.row}>
              <View style={[s.iconChip, { backgroundColor: T.inputBg }]}>
                <Ionicons name="chatbox-outline" size={18} color={iconColor} />
              </View>
              <View style={s.rowInfo}>
                <Text style={[s.rowLabel, { color: T.text }]}>SMS Notifications</Text>
                <Text style={[s.rowSub, { color: T.subText }]}>Text message alerts</Text>
              </View>
              <Switch value={smsNotifs} onValueChange={setSmsNotifs} trackColor={{ false: '#E0E0E0', true: COLORS.primary }} thumbColor="#fff" />
            </View>
          </View>

          {/* Account actions */}
          <Text style={[s.sectionLabel, { color: T.subText }]}>Account</Text>
          <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={() => Alert.alert('Clear Cache', 'App cache cleared.')}>
              <View style={[s.iconChip, { backgroundColor: T.inputBg }]}>
                <Ionicons name="trash-outline" size={18} color={iconColor} />
              </View>
              <Text style={[s.rowLabel, { color: T.text }]}>Clear App Cache</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={s.logoutButton}
            activeOpacity={0.85}
            onPress={() => Alert.alert('Log Out?', 'You will need to sign in again to access your jobs.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log Out', style: 'destructive', onPress: () => resetToSignIn() },
            ])}
          >
            <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
            <Text style={s.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>

          <View style={s.dangerZone}>
            <View style={s.dangerZoneHeader}>
              <Ionicons name="warning-outline" size={16} color={COLORS.danger} />
              <Text style={s.dangerZoneTitle}>Danger Zone</Text>
            </View>
            <Text style={s.dangerZoneBody}>
              Deleting your account is permanent. All your job history, earned badges, and
              verification status will be lost forever.
            </Text>
            <TouchableOpacity
              style={s.deleteButton}
              activeOpacity={0.7}
              onPress={() => Alert.alert('Delete Account', 'This will permanently delete your account and all data. This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => resetToSignIn() },
              ])}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
              <Text style={s.deleteButtonText}>Delete My Account</Text>
            </TouchableOpacity>
          </View>

          <Text style={[s.version, { color: T.subText }]}>AdwumaGo v1.0.0 · Made in Ghana 🇬🇭</Text>
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
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderRadius: RADIUS.lg, padding: 14, marginBottom: 24,
  },
  profileAvatar: { width: 52, height: 52, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 17, fontWeight: '800' },
  profileMeta: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  divider: { height: 1, marginLeft: 56 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  iconChip: { width: 34, height: 34, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '500', flex: 1 },
  rowValue: { fontSize: 13, marginRight: 6 },
  rowSub: { fontSize: 11, marginTop: 2 },
  version: { textAlign: 'center', fontSize: 12, marginTop: 4 },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: RADIUS.md, backgroundColor: COLORS.dangerLight,
    marginBottom: 20,
  },
  logoutButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.danger },
  dangerZone: {
    borderWidth: 1, borderColor: COLORS.danger, borderRadius: RADIUS.lg, padding: 16, marginBottom: 24, gap: 10,
  },
  dangerZoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dangerZoneTitle: { fontSize: 14, fontWeight: '800', color: COLORS.danger },
  dangerZoneBody: { fontSize: 12, lineHeight: 18, color: COLORS.danger },
  deleteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 46, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.danger,
  },
  deleteButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.danger },
});
