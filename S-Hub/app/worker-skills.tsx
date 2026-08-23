import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyWorkerProfile, updateWorkerProfile } from '@/lib/api/workerProfiles';
import RequireVerifiedWorker from '@/components/RequireVerifiedWorker';

const SUGGESTED = [
  'Pipe Repair', 'Leak Detection', 'Bathroom Fitting', 'Drainage', 'Water Heater',
  'Gutter Repair', 'Kitchen Plumbing', 'Pump Installation', 'Emergency Repairs', 'Pipe Fitting',
];

function WorkerSkillsScreen() {
  const T = useThemeColors();
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await getMyWorkerProfile();
      if (result.success && result.data) {
        setSkills(result.data.skills ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (skills.some(s => s.toLowerCase() === trimmed.toLowerCase())) return;
    setSkills([...skills, trimmed]);
    setCustomSkill('');
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleSave = async () => {
    if (skills.length === 0) {
      Alert.alert('Add at least one skill', 'Clients search by skill, so you need at least one listed.');
      return;
    }
    setSaving(true);
    const result = await updateWorkerProfile({ skills });
    setSaving(false);
    if (!result.success) {
      Alert.alert('Could Not Save', result.error ?? 'Something went wrong.');
      return;
    }
    Alert.alert('Saved', 'Your skills have been updated.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const suggestionsToShow = SUGGESTED.filter(sk => !skills.includes(sk));

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }]} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={[s.header, { backgroundColor: COLORS.primary }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={wms(22)} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Skills & Services</Text>
        <View style={s.backBtn} />
      </View>

      <View style={s.pageInner}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[s.sectionLabel, { color: T.subText }]}>Your skills ({skills.length})</Text>
        <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
          {skills.length === 0 ? (
            <Text style={[s.emptyText, { color: T.subText }]}>No skills added yet.</Text>
          ) : (
            <View style={s.chipsWrap}>
              {skills.map(sk => (
                <View key={sk} style={[s.chip, { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary + '30' }]}>
                  <Text style={[s.chipText, { color: COLORS.primary }]}>{sk}</Text>
                  <TouchableOpacity onPress={() => removeSkill(sk)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name="close-circle" size={wms(16)} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={[s.sectionLabel, { color: T.subText }]}>Add a custom skill</Text>
        <View style={[s.addRow, { backgroundColor: T.inputBg }]}>
          <TextInput
            style={[s.addInput, { color: T.text }]}
            placeholder="e.g. Solar Panel Wiring"
            placeholderTextColor={T.subText}
            value={customSkill}
            onChangeText={setCustomSkill}
            onSubmitEditing={() => addSkill(customSkill)}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[s.addBtn, { opacity: customSkill.trim() ? 1 : 0.4 }]}
            onPress={() => addSkill(customSkill)}
            disabled={!customSkill.trim()}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={wms(20)} color="#fff" />
          </TouchableOpacity>
        </View>

        {suggestionsToShow.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { color: T.subText }]}>Suggested skills</Text>
            <View style={s.chipsWrap}>
              {suggestionsToShow.map(sk => (
                <TouchableOpacity
                  key={sk}
                  style={[s.suggestChip, { backgroundColor: T.card, borderColor: T.border }]}
                  onPress={() => addSkill(sk)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="add" size={wms(14)} color={COLORS.primary} />
                  <Text style={[s.suggestText, { color: T.text }]}>{sk}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={{ height: wvs(100) }} />
      </ScrollView>

      <View style={[s.footer, { backgroundColor: T.card, borderColor: T.border }]}>
        <TouchableOpacity onPress={handleSave} activeOpacity={0.85} disabled={saving}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.saveBtn}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
      </View>
    </SafeAreaView>
  );
}

export default function GatedWorkerSkillsScreen() {
  return (
    <RequireVerifiedWorker>
      <WorkerSkillsScreen />
    </RequireVerifiedWorker>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  pageInner: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ws(14), paddingVertical: wvs(12) },
  backBtn: { width: ws(38), height: ws(38), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: wms(16), fontWeight: '700', color: '#fff' },

  scroll: { padding: ws(16) },
  sectionLabel: { fontSize: wms(12), fontWeight: '700', marginBottom: wvs(10), marginTop: wvs(12), textTransform: 'uppercase', letterSpacing: wms(0.4) },

  card: { borderRadius: ws(16), borderWidth: ws(1), padding: ws(14) },
  emptyText: { fontSize: wms(13), textAlign: 'center', paddingVertical: wvs(8) },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: ws(8) },
  chip: { flexDirection: 'row', alignItems: 'center', gap: ws(6), borderRadius: ws(10), borderWidth: ws(1), paddingHorizontal: ws(12), paddingVertical: wvs(8) },
  chipText: { fontSize: wms(12), fontWeight: '700' },

  addRow: { flexDirection: 'row', alignItems: 'center', borderRadius: ws(12), paddingLeft: ws(14), paddingRight: ws(6), paddingVertical: wvs(6), gap: ws(8) },
  addInput: { flex: 1, fontSize: wms(14), paddingVertical: wvs(8) },
  addBtn: { width: ws(34), height: ws(34), borderRadius: ws(10), backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },

  suggestChip: { flexDirection: 'row', alignItems: 'center', gap: ws(5), borderRadius: ws(10), borderWidth: ws(1), paddingHorizontal: ws(12), paddingVertical: wvs(8) },
  suggestText: { fontSize: wms(12), fontWeight: '600' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: ws(1), padding: ws(16), paddingBottom: wvs(28) },
  saveBtn: { borderRadius: ws(30), paddingVertical: wvs(15), alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: wms(15), fontWeight: '700' },
});
