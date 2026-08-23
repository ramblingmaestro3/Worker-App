import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ws, wvs, wms } from '@/lib/scaling';
import { becomeWorker } from '@/lib/api/profiles';
import { createWorkerProfile, PREFERRED_TIME_OPTIONS, PreferredTime } from '@/lib/api/workerProfiles';
import { submitVerification } from '@/lib/api/verification';
import { uploadIdDocument, uploadSelfie } from '@/lib/api/storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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

/* ─── Constants ─── */
const TOTAL_STEPS = 4;

const SKILL_CATEGORIES = [
  { id: 'plumbing', label: 'Plumbing', icon: '🔧', color: COLORS.accent },
  { id: 'electrical', label: 'Electrical', icon: '⚡', color: '#F59E0B' },
  { id: 'carpentry', label: 'Carpentry', icon: '🪚', color: '#92400E' },
  { id: 'painting', label: 'Painting', icon: '🖌️', color: '#3B82F6' },
  { id: 'cleaning', label: 'Cleaning', icon: '🧹', color: '#8B5CF6' },
  { id: 'masonry', label: 'Masonry', icon: '🧱', color: '#DC2626' },
  { id: 'welding', label: 'Welding', icon: '🔩', color: '#64748B' },
  { id: 'ac', label: 'AC & Cooling', icon: '❄️', color: '#0891B2' },
  { id: 'tiling', label: 'Tiling', icon: '🏗️', color: '#D97706' },
  { id: 'roofing', label: 'Roofing', icon: '🏚️', color: '#BE185D' },
  { id: 'security', label: 'Security/CCTV', icon: '📷', color: '#374151' },
  { id: 'other', label: 'Other', icon: '⋯', color: '#6B7280' },
];

const EXPERIENCE_OPTIONS = ['Less than 1 year', '1–2 years', '3–5 years', '6–10 years', '10+ years'];
const AVAILABILITY_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ID_TYPES = ['Ghana Card', 'Voter ID', 'Passport', "Driver's Licence"];
const ID_TYPE_DB_VALUES: Record<string, 'ghana_card' | 'voter_id' | 'passport' | 'drivers_licence'> = {
  'Ghana Card': 'ghana_card',
  'Voter ID': 'voter_id',
  'Passport': 'passport',
  "Driver's Licence": 'drivers_licence',
};

/* ─── Step indicator ─── */
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <View style={sb.wrap}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            sb.seg,
            i < current && sb.segDone,
            i === current - 1 && sb.segActive,
          ]}
        />
      ))}
    </View>
  );
}
const sb = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: ws(4), paddingHorizontal: ws(16), paddingVertical: wvs(10) },
  seg: { flex: 1, height: wvs(4), borderRadius: ws(2), backgroundColor: COLORS.border },
  segDone: { backgroundColor: COLORS.primary },
  segActive: { backgroundColor: COLORS.primary },
});

/* ─── Field label ─── */
function FieldLabel({ label, required, color }: { label: string; required?: boolean; color: string }) {
  return (
    <Text style={[fl.label, { color }]}>
      {label}{required && <Text style={fl.req}> *</Text>}
    </Text>
  );
}
const fl = StyleSheet.create({
  label: { fontSize: wms(13), fontWeight: '700', marginBottom: wvs(8), marginTop: wvs(4) },
  req: { color: COLORS.danger },
});

/* ─── Info box ─── */
function InfoBox({ text }: { text: string }) {
  return (
    <View style={ib.box}>
      <Ionicons name="information-circle-outline" size={wms(16)} color={COLORS.primary} />
      <Text style={ib.text}>{text}</Text>
    </View>
  );
}
const ib = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'flex-start', gap: ws(10), backgroundColor: COLORS.primary + '10', borderRadius: ws(12), padding: ws(14), marginTop: wvs(4), marginBottom: wvs(16) },
  text: { flex: 1, fontSize: wms(12), color: COLORS.primary, fontWeight: '500', lineHeight: wms(18) },
});

/* ─── Main screen ─── */
export default function WorkerSetupScreen() {
  const [step, setStep] = useState(1);
  const T = useThemeColors();

  /* Step 1 – Skills */
  const [skills, setSkills] = useState<string[]>([]);

  /* Step 2 – Profile */
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');

  /* Step 3 – Availability & Rate */
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<PreferredTime[]>([]);
  const [ratePerHour, setRate] = useState('');
  const [ratePerJob, setRateJ] = useState('');

  /* Step 4 – Verification */
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idImageUri, setIdImageUri] = useState<string | null>(null);
  const [selfieImageUri, setSelfieImageUri] = useState<string | null>(null);

  /* Submission */
  const [submitting, setSubmitting] = useState(false);

  const toggleSkill = (id: string) =>
    setSkills(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const toggleDay = (d: string) => setDays(a => a.includes(d) ? a.filter(x => x !== d) : [...a, d]);
  const toggleTime = (t: PreferredTime) => setTimes(a => a.includes(t) ? a.filter(x => x !== t) : [...a, t]);

  const pickImage = async (onPicked: (uri: string) => void) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload this image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length) {
      onPicked(result.assets[0].uri);
    }
  };

  const validate = (): boolean => {
    if (step === 1 && skills.length === 0) {
      Alert.alert('Select Skills', 'Please select at least one skill to continue.'); return false;
    }
    if (step === 2 && (!firstName.trim() || !lastName.trim() || !phone.trim())) {
      Alert.alert('Required Fields', 'Please fill in your name and phone number.'); return false;
    }
    if (step === 3 && (days.length === 0 || !ratePerHour)) {
      Alert.alert('Availability & Rate', 'Please select at least one available day and set your hourly rate.'); return false;
    }
    if (step === 4 && (!idType || !idImageUri)) {
      Alert.alert('Verification Required', 'Please select your ID type and upload a photo to continue.'); return false;
    }
    return true;
  };

  const handleSubmitVerification = async () => {
    if (!idImageUri) return;
    setSubmitting(true);

    const roleResult = await becomeWorker();
    if (!roleResult.success) {
      setSubmitting(false);
      Alert.alert('Submission Failed', roleResult.error ?? 'Could not update your account role.');
      return;
    }

    const profileResult = await createWorkerProfile({
      skills,
      bio: bio || undefined,
      years_experience: experience ? EXPERIENCE_OPTIONS.indexOf(experience) : undefined,
      hourly_rate: ratePerHour ? Number(ratePerHour) : undefined,
      per_job_rate: ratePerJob ? Number(ratePerJob) : undefined,
      // Matches the AvailabilityDay[] shape worker-availability.tsx reads/writes
      // for this same jsonb column.
      availability: AVAILABILITY_DAYS.map((day) => ({ day, on: days.includes(day) })),
      preferred_times: times,
      address: location || undefined,
    });
    if (!profileResult.success) {
      setSubmitting(false);
      Alert.alert('Submission Failed', profileResult.error ?? 'Could not save your worker profile.');
      return;
    }

    const idUpload = await uploadIdDocument(idImageUri);
    if (!idUpload.success || !idUpload.path) {
      setSubmitting(false);
      Alert.alert('Upload Failed', idUpload.error ?? 'Could not upload your ID document.');
      return;
    }

    let selfiePath: string | undefined;
    if (selfieImageUri) {
      const selfieUpload = await uploadSelfie(selfieImageUri);
      if (selfieUpload.success) selfiePath = selfieUpload.path;
    }

    const verificationResult = await submitVerification({
      id_type: ID_TYPE_DB_VALUES[idType] ?? null,
      id_number: idNumber,
      id_document_url: idUpload.path,
      selfie_url: selfiePath,
    });
    setSubmitting(false);
    if (!verificationResult.success) {
      Alert.alert('Submission Failed', verificationResult.error ?? 'Could not submit your verification.');
      return;
    }

    router.replace('/verification-pending' as any);
  };

  const handleNext = () => {
    if (!validate()) return;
    if (step < TOTAL_STEPS) { setStep(s => s + 1); return; }
    handleSubmitVerification();
  };

  const stepTitles = [
    'Your Skills',
    'About You',
    'Availability & Pricing',
    'Identity Verification',
  ];

  const stepSubs = [
    'Select every service you offer — clients will search for these.',
    'Tell clients who you are and what makes you stand out.',
    'When can you work, and what do you charge?',
    'We verify every worker to build trust on the platform.',
  ];

  const handleBack = () => {
    if (step > 1) { setStep(p => p - 1); return; }
    if (router.canGoBack()) router.back();
    else router.replace('/home' as any);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />

      <View style={s.pageInner}>
      {/* ── HEADER ── */}
      <View style={[s.header, { backgroundColor: T.header, borderColor: T.border }]}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={wms(22)} color={T.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: T.text }]}>Become a Worker</Text>
          <Text style={[s.headerSub, { color: T.subText }]}>Step {step} of {TOTAL_STEPS}</Text>
        </View>
        <View style={[s.stepBadge, { backgroundColor: COLORS.primaryLight }]}>
          <Text style={s.stepBadgeText}>{step}/{TOTAL_STEPS}</Text>
        </View>
      </View>

      {/* ── STEP BAR ── */}
      <StepBar current={step} total={TOTAL_STEPS} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step title */}
          <Text style={[s.stepTitle, { color: T.text }]}>{stepTitles[step - 1]}</Text>
          <Text style={[s.stepSub, { color: T.subText }]}>{stepSubs[step - 1]}</Text>

          {/* ════ STEP 1 — Skills ════ */}
          {step === 1 && (
            <>
              <View style={s.skillsGrid}>
                {SKILL_CATEGORIES.map(cat => {
                  const active = skills.includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        s.skillTile,
                        { backgroundColor: T.card, borderColor: active ? cat.color : T.border },
                        active && { backgroundColor: cat.color + '10' },
                      ]}
                      onPress={() => toggleSkill(cat.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.skillTileEmoji}>{cat.icon}</Text>
                      <Text style={[s.skillTileLabel, { color: active ? cat.color : T.text }]}>{cat.label}</Text>
                      {active && (
                        <View style={[s.skillCheck, { backgroundColor: cat.color }]}>
                          <Ionicons name="checkmark" size={wms(10)} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {skills.length > 0 && (
                <View style={[s.selectedBanner, { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary + '30' }]}>
                  <Ionicons name="checkmark-circle" size={wms(16)} color={COLORS.primary} />
                  <Text style={s.selectedBannerText}>{skills.length} skill{skills.length > 1 ? 's' : ''} selected</Text>
                </View>
              )}
              <InfoBox text="You can add or remove skills later from your profile settings." />
            </>
          )}

          {/* ════ STEP 2 — Profile ════ */}
          {step === 2 && (
            <>
              {/* Name row */}
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <FieldLabel label="First Name" required color={T.text} />
                  <TextInput
                    style={[s.input, { backgroundColor: T.inputBg, borderColor: T.border, color: T.text }]}
                    placeholder="Kofi"
                    placeholderTextColor={T.subText}
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FieldLabel label="Last Name" required color={T.text} />
                  <TextInput
                    style={[s.input, { backgroundColor: T.inputBg, borderColor: T.border, color: T.text }]}
                    placeholder="Mensah"
                    placeholderTextColor={T.subText}
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>
              </View>

              <FieldLabel label="Phone Number" required color={T.text} />
              <View style={[s.phoneRow, { backgroundColor: T.inputBg, borderColor: T.border }]}>
                <View style={s.dialCode}>
                  <Text style={s.flag}>🇬🇭</Text>
                  <Text style={[s.dialCodeText, { color: T.text }]}>+233</Text>
                </View>
                <TextInput
                  style={[s.phoneInput, { color: T.text }]}
                  placeholder="24 123 4567"
                  placeholderTextColor={T.subText}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              <FieldLabel label="Service Area / Location" required color={T.text} />
              <View style={[s.locationRow, { backgroundColor: T.inputBg, borderColor: T.border }]}>
                <Ionicons name="location-outline" size={wms(18)} color={COLORS.primary} />
                <TextInput
                  style={[s.locationInput, { color: T.text }]}
                  placeholder="e.g. Kumasi, Ashanti Region"
                  placeholderTextColor={T.subText}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              <FieldLabel label="Years of Experience" required color={T.text} />
              <View style={s.optionRow}>
                {EXPERIENCE_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      s.optionChip,
                      { backgroundColor: T.card, borderColor: experience === opt ? COLORS.primary : T.border },
                      experience === opt && { backgroundColor: COLORS.primary + '10' },
                    ]}
                    onPress={() => setExperience(opt)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.optionChipText, { color: experience === opt ? COLORS.primary : T.subText }]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FieldLabel label="Professional Bio" color={T.text} />
              <TextInput
                style={[s.textarea, { backgroundColor: T.inputBg, borderColor: T.border, color: T.text }]}
                placeholder="e.g. Experienced plumber with 5+ years fixing pipes, leaks and installations across Kumasi. I work neatly and always leave the site tidy."
                placeholderTextColor={T.subText}
                multiline
                numberOfLines={5}
                value={bio}
                onChangeText={setBio}
                textAlignVertical="top"
              />
              <Text style={[s.charCount, { color: T.subText }]}>{bio.length}/300 characters</Text>

              <InfoBox text="A strong bio helps clients choose you. Mention your experience, specialties, and what makes you reliable." />
            </>
          )}

          {/* ════ STEP 3 — Availability & Rate ════ */}
          {step === 3 && (
            <>
              <FieldLabel label="Working Days" required color={T.text} />
              <View style={s.dayGrid}>
                {AVAILABILITY_DAYS.map(d => {
                  const on = days.includes(d);
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[
                        s.dayCell,
                        { backgroundColor: on ? COLORS.primary : T.card, borderColor: on ? COLORS.primary : T.border },
                      ]}
                      onPress={() => toggleDay(d)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.dayText, { color: on ? '#fff' : T.subText }]}>{d}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <FieldLabel label="Preferred Working Hours" color={T.text} />
              <View style={s.timeOptions}>
                {PREFERRED_TIME_OPTIONS.map(opt => {
                  const on = times.includes(opt.value);
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        s.timeRow,
                        { backgroundColor: T.card, borderColor: on ? COLORS.primary : T.border },
                        on && { backgroundColor: COLORS.primary + '08' },
                      ]}
                      onPress={() => toggleTime(opt.value)}
                      activeOpacity={0.8}
                    >
                      <View style={[s.timeRadio, { borderColor: COLORS.primary }]}>
                        {on && <View style={s.timeRadioDot} />}
                      </View>
                      <Ionicons
                        name={opt.icon as any}
                        size={wms(16)}
                        color={on ? COLORS.primary : T.subText}
                      />
                      <Text style={[s.timeText, { color: on ? COLORS.primary : T.text }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <FieldLabel label="Hourly Rate" required color={T.text} />
              <View style={[s.rateRow, { backgroundColor: T.inputBg, borderColor: T.border }]}>
                <Text style={s.cedis}>GH₵</Text>
                <TextInput
                  style={[s.rateInput, { color: T.text }]}
                  placeholder="e.g. 80"
                  placeholderTextColor={T.subText}
                  keyboardType="numeric"
                  value={ratePerHour}
                  onChangeText={setRate}
                />
                <Text style={[s.rateUnit, { color: T.subText }]}>/ hour</Text>
              </View>

              <FieldLabel label="Starting Price per Job (optional)" color={T.text} />
              <View style={[s.rateRow, { backgroundColor: T.inputBg, borderColor: T.border }]}>
                <Text style={s.cedis}>GH₵</Text>
                <TextInput
                  style={[s.rateInput, { color: T.text }]}
                  placeholder="e.g. 200"
                  placeholderTextColor={T.subText}
                  keyboardType="numeric"
                  value={ratePerJob}
                  onChangeText={setRateJ}
                />
                <Text style={[s.rateUnit, { color: T.subText }]}>/ job</Text>
              </View>

              <InfoBox text="Set competitive rates to attract more clients. You can negotiate on individual jobs too." />
            </>
          )}

          {/* ════ STEP 4 — Verification ════ */}
          {step === 4 && (
            <>
              {/* ID type selector */}
              <FieldLabel label="Select ID Type" required color={T.text} />
              <View style={s.idTypeGrid}>
                {ID_TYPES.map(type => {
                  const active = idType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        s.idTypeChip,
                        { backgroundColor: T.card, borderColor: active ? COLORS.primary : T.border },
                        active && { backgroundColor: COLORS.primary + '10' },
                      ]}
                      onPress={() => setIdType(type)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name={type === 'Passport' ? 'passport' : 'card-account-details-outline'}
                        size={wms(20)}
                        color={active ? COLORS.primary : T.subText}
                      />
                      <Text style={[s.idTypeText, { color: active ? COLORS.primary : T.subText }]}>{type}</Text>
                      {active && <Ionicons name="checkmark-circle" size={wms(14)} color={COLORS.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ID number */}
              {idType !== '' && (
                <>
                  <FieldLabel label={`${idType} Number`} required color={T.text} />
                  <TextInput
                    style={[s.input, { backgroundColor: T.inputBg, borderColor: T.border, color: T.text, marginBottom: wvs(20) }]}
                    placeholder="Enter ID number"
                    placeholderTextColor={T.subText}
                    value={idNumber}
                    onChangeText={setIdNumber}
                    autoCapitalize="characters"
                  />
                </>
              )}

              {/* Upload boxes */}
              <FieldLabel label="Upload ID Photo" required color={T.text} />
              <TouchableOpacity
                style={[s.uploadBox, { backgroundColor: T.card, borderColor: idImageUri ? COLORS.primary : T.border }, !!idImageUri && { borderStyle: 'solid' }]}
                onPress={() => pickImage(setIdImageUri)}
                activeOpacity={0.8}
              >
                <View style={[s.uploadIconWrap, { backgroundColor: idImageUri ? COLORS.primaryLight : T.inputBg }]}>
                  <Ionicons name={idImageUri ? 'checkmark-circle' : 'cloud-upload-outline'} size={wms(28)} color={idImageUri ? COLORS.primary : T.subText} />
                </View>
                <Text style={[s.uploadTitle, { color: idImageUri ? COLORS.primary : T.text }]}>
                  {idImageUri ? 'ID Photo Selected ✓' : 'Tap to upload ID photo'}
                </Text>
                <Text style={[s.uploadSub, { color: T.subText }]}>JPG, PNG · Max 5 MB · Clear, unobstructed</Text>
              </TouchableOpacity>

              <FieldLabel label="Selfie with ID (optional but recommended)" color={T.text} />
              <TouchableOpacity
                style={[s.uploadBox, { backgroundColor: T.card, borderColor: selfieImageUri ? COLORS.primary : T.border }, !!selfieImageUri && { borderStyle: 'solid' }]}
                onPress={() => pickImage(setSelfieImageUri)}
                activeOpacity={0.8}
              >
                <View style={[s.uploadIconWrap, { backgroundColor: selfieImageUri ? COLORS.primaryLight : T.inputBg }]}>
                  <Ionicons name={selfieImageUri ? 'checkmark-circle' : 'camera-outline'} size={wms(28)} color={selfieImageUri ? COLORS.primary : T.subText} />
                </View>
                <Text style={[s.uploadTitle, { color: selfieImageUri ? COLORS.primary : T.text }]}>
                  {selfieImageUri ? 'Selfie Selected ✓' : 'Tap to take / upload selfie'}
                </Text>
                <Text style={[s.uploadSub, { color: T.subText }]}>Hold your ID next to your face</Text>
              </TouchableOpacity>

              {/* Terms */}
              <View style={[s.termsBox, { backgroundColor: T.card, borderColor: T.border }]}>
                <Ionicons name="document-text-outline" size={wms(18)} color={COLORS.primary} />
                <Text style={[s.termsText, { color: T.subText }]}>
                  By submitting, you agree to S-Hub's{' '}
                  <Text style={s.termsLink} onPress={() => router.push('/terms' as any)}>
                    Worker Terms & Conditions
                  </Text>{' '}
                  and consent to background verification.
                </Text>
              </View>

              <InfoBox text="Your ID is used for verification only and is never shared with clients. All data is encrypted." />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── FOOTER CTA ── */}
      <View style={[s.footer, { backgroundColor: T.card, borderColor: T.border }]}>
        {step === TOTAL_STEPS && (
          <Text style={[s.footerHint, { color: T.subText }]}>
            Your details will be reviewed within 24 hours.
          </Text>
        )}
        <TouchableOpacity style={s.nextBtn} onPress={handleNext} disabled={submitting} activeOpacity={0.85}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={s.nextBtnText}>
                {step === TOTAL_STEPS ? 'Submit Profile' : 'Continue'}
              </Text>
              <Ionicons
                name={step === TOTAL_STEPS ? 'checkmark-circle-outline' : 'arrow-forward'}
                size={wms(18)}
                color="#fff"
              />
            </>
          )}
        </TouchableOpacity>
      </View>
      </View>
    </SafeAreaView>
  );
}

/* ─── Styles ─── */
const s = StyleSheet.create({
  safe: { flex: 1 },
  pageInner: { flex: 1, width: '100%', maxWidth: ws(544), alignSelf: 'center' },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: ws(14), paddingVertical: wvs(12), borderBottomWidth: ws(1), gap: ws(10) },
  backBtn: { width: ws(38), height: ws(38), alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: wms(16), fontWeight: '700' },
  headerSub: { fontSize: wms(11), marginTop: wvs(1) },
  stepBadge: { borderRadius: ws(12), paddingHorizontal: ws(10), paddingVertical: wvs(4) },
  stepBadgeText: { fontSize: wms(12), fontWeight: '700', color: COLORS.primary },

  /* Scroll */
  scroll: { padding: ws(18), paddingBottom: wvs(32) },
  stepTitle: { fontSize: wms(22), fontWeight: '800', marginBottom: wvs(4) },
  stepSub: { fontSize: wms(13), lineHeight: wms(19), marginBottom: wvs(20) },

  /* Step 1 – Skills */
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: ws(10), marginBottom: wvs(14) },
  skillTile: {
    width: '30%', alignItems: 'center', paddingVertical: wvs(14), paddingHorizontal: ws(6),
    borderRadius: ws(14), borderWidth: ws(1.5), gap: ws(6), position: 'relative',
  },
  skillTileEmoji: { fontSize: wms(24) },
  skillTileLabel: { fontSize: wms(11), fontWeight: '700', textAlign: 'center' },
  skillCheck: { position: 'absolute', top: wvs(6), right: ws(6), width: ws(18), height: ws(18), borderRadius: ws(9), alignItems: 'center', justifyContent: 'center' },
  selectedBanner: { flexDirection: 'row', alignItems: 'center', gap: ws(8), borderRadius: ws(10), borderWidth: ws(1), padding: ws(12), marginBottom: wvs(12) },
  selectedBannerText: { fontSize: wms(13), color: COLORS.primary, fontWeight: '700' },

  /* Step 2 – Profile */
  row: { flexDirection: 'row', gap: ws(12) },
  input: { borderWidth: ws(1), borderRadius: ws(12), paddingHorizontal: ws(14), paddingVertical: wvs(12), fontSize: wms(14), marginBottom: wvs(14) },
  phoneRow: { flexDirection: 'row', alignItems: 'center', borderWidth: ws(1), borderRadius: ws(12), marginBottom: wvs(14), overflow: 'hidden' },
  dialCode: { flexDirection: 'row', alignItems: 'center', gap: ws(5), paddingHorizontal: ws(12), paddingVertical: wvs(12), borderRightWidth: ws(1), borderColor: COLORS.border },
  flag: { fontSize: wms(16) },
  dialCodeText: { fontSize: wms(14), fontWeight: '700' },
  phoneInput: { flex: 1, paddingHorizontal: ws(12), fontSize: wms(14) },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: ws(10), borderWidth: ws(1), borderRadius: ws(12), paddingHorizontal: ws(14), paddingVertical: wvs(12), marginBottom: wvs(14) },
  locationInput: { flex: 1, fontSize: wms(14) },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: ws(8), marginBottom: wvs(16) },
  optionChip: { borderWidth: ws(1.5), borderRadius: ws(20), paddingHorizontal: ws(14), paddingVertical: wvs(8) },
  optionChipText: { fontSize: wms(12), fontWeight: '600' },
  textarea: { borderWidth: ws(1), borderRadius: ws(12), padding: ws(14), fontSize: wms(14), minHeight: wvs(120), lineHeight: wms(21), marginBottom: wvs(4) },
  charCount: { fontSize: wms(11), textAlign: 'right', marginBottom: wvs(14) },

  /* Step 3 – Availability */
  dayGrid: { flexDirection: 'row', gap: ws(8), marginBottom: wvs(18) },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: wvs(10), borderRadius: ws(10), borderWidth: ws(1.5) },
  dayText: { fontSize: wms(11), fontWeight: '700' },
  timeOptions: { gap: ws(10), marginBottom: wvs(18) },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: ws(12), borderWidth: ws(1.5), borderRadius: ws(12), padding: ws(14) },
  timeRadio: { width: ws(18), height: ws(18), borderRadius: ws(9), borderWidth: ws(2), alignItems: 'center', justifyContent: 'center' },
  timeRadioDot: { width: ws(8), height: ws(8), borderRadius: ws(4), backgroundColor: COLORS.primary },
  timeText: { fontSize: wms(13), fontWeight: '600', flex: 1 },
  rateRow: { flexDirection: 'row', alignItems: 'center', borderWidth: ws(1), borderRadius: ws(12), paddingHorizontal: ws(14), paddingVertical: wvs(12), gap: ws(8), marginBottom: wvs(16) },
  cedis: { fontSize: wms(15), fontWeight: '700', color: COLORS.primary },
  rateInput: { flex: 1, fontSize: wms(18), fontWeight: '700' },
  rateUnit: { fontSize: wms(13) },

  /* Step 4 – Verification */
  idTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: ws(10), marginBottom: wvs(16) },
  idTypeChip: { flexDirection: 'row', alignItems: 'center', gap: ws(8), borderWidth: ws(1.5), borderRadius: ws(12), paddingHorizontal: ws(14), paddingVertical: wvs(10), minWidth: '45%' },
  idTypeText: { fontSize: wms(13), fontWeight: '600', flex: 1 },
  uploadBox: {
    alignItems: 'center', borderWidth: ws(2), borderStyle: 'dashed', borderRadius: ws(14),
    padding: ws(24), marginBottom: wvs(16), gap: ws(8),
  },
  uploadIconWrap: { width: ws(60), height: ws(60), borderRadius: ws(30), alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { fontSize: wms(14), fontWeight: '700' },
  uploadSub: { fontSize: wms(11), textAlign: 'center' },

  /* Terms (step 4) */
  termsBox: { flexDirection: 'row', alignItems: 'flex-start', gap: ws(10), borderWidth: ws(1), borderRadius: ws(12), padding: ws(14), marginBottom: wvs(14), marginTop: wvs(8) },
  termsText: { flex: 1, fontSize: wms(12), lineHeight: wms(18) },
  termsLink: { color: COLORS.primary, fontWeight: '700', textDecorationLine: 'underline' },

  /* Footer */
  footer: { paddingHorizontal: ws(16), paddingVertical: wvs(14), borderTopWidth: ws(1) },
  footerHint: { fontSize: wms(11), textAlign: 'center', marginBottom: wvs(8) },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ws(8),
    backgroundColor: COLORS.primary, borderRadius: ws(14), paddingVertical: wvs(15),
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  nextBtnText: { color: '#fff', fontSize: wms(16), fontWeight: '700' },
});