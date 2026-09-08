import { COLORS } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
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
import { Alert } from '@/lib/Alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
import {
  analyzeProblem,
  countWorkersBySkill,
  AIUnavailableError,
  AIAnalysisResult,
  AIWorkerRecommendation,
} from '@/lib/api/ai';
import { setAiJobDraft } from '@/lib/aiJobDraftBridge';
import type { RootStackParamList } from '@/navigation/types';

type ThemeColors = ReturnType<typeof useThemeColors>;

/* ─── Config ─── */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const LOW_CONFIDENCE_THRESHOLD = 0.4;
const SOFT_CONFIDENCE_THRESHOLD = 0.65;

const ANALYSIS_STAGES = [
  'Examining your image...',
  'Identifying the problem...',
  'Understanding what type of work is needed...',
  'Finding the best professionals...',
  'Almost done...',
];

// Keyed by the skill id the ai-analyze function returns.
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  plumbing: 'water-outline',
  electrical: 'flash-outline',
  carpentry: 'hammer-outline',
  painting: 'color-palette-outline',
  cleaning: 'sparkles-outline',
  masonry: 'cube-outline',
  welding: 'flame-outline',
  ac: 'snow-outline',
  tiling: 'grid-outline',
  roofing: 'home-outline',
  security: 'videocam-outline',
  other: 'construct-outline',
};

type Phase = 'upload' | 'analyzing' | 'results' | 'no_match' | 'error' | 'not_configured';

/** Pull raw base64 out of an image asset, however the platform gave it to us. */
async function assetToBase64(asset: ImagePicker.ImagePickerAsset): Promise<string | null> {
  if (asset.base64) return asset.base64;
  if (asset.uri?.startsWith('data:')) {
    const comma = asset.uri.indexOf(',');
    return comma >= 0 ? asset.uri.slice(comma + 1) : null;
  }
  try {
    const blob = await (await fetch(asset.uri)).blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const r = String(reader.result || '');
        const comma = r.indexOf(',');
        resolve(comma >= 0 ? r.slice(comma + 1) : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/* ─── Pulse ring (matches finding-worker.tsx's PulseRing technique) ─── */
function PulseRing({ delay, size, color }: { delay: number; size: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.2, 0] }),
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.5] }) }],
      }}
    />
  );
}

/* ─── Analysis loading view ─── */
function AIAnalysisLoading({ T }: { T: ThemeColors }) {
  const [stageIndex, setStageIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStageIndex(i => Math.min(i + 1, ANALYSIS_STAGES.length - 1)), 1100);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={al.wrap}>
      <View style={al.radarWrap}>
        <PulseRing delay={0} size={180} color={COLORS.primary} />
        <PulseRing delay={600} size={180} color={COLORS.primary} />
        <PulseRing delay={1200} size={180} color={COLORS.primary} />
        <View style={[al.centerIcon, { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary + '40' }]}>
          <Ionicons name="sparkles" size={30} color={COLORS.primary} />
        </View>
      </View>
      <Text style={[al.title, { color: T.text }]}>Analyzing your problem...</Text>
      <Text style={[al.stage, { color: T.subText }]}>{ANALYSIS_STAGES[stageIndex]}</Text>
    </View>
  );
}

const al = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 60, paddingBottom: 30 },
  radarWrap: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  centerIcon: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  title: { fontSize: 19, fontWeight: '800', marginBottom: 8 },
  stage: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
});

/* ─── Confidence bar ─── */
function ConfidenceBar({ value, color = COLORS.primary, trackColor }: { value: number; color?: string; trackColor: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[cb.track, { backgroundColor: trackColor }]}>
      <View style={[cb.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}
const cb = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

/* ─── Recommended worker card ─── */
function RecommendedWorkerCard({
  rec, best, nearbyCount, T,
}: { rec: AIWorkerRecommendation; best: boolean; nearbyCount?: number | null; T: ThemeColors }) {
  const pct = Math.round(rec.confidence * 100);
  const matchLabel = best ? 'Best Match' : rec.confidence >= 0.5 ? 'Good Match' : 'Possible Match';
  const icon = CATEGORY_ICONS[rec.category] || 'construct-outline';
  const name = rec.label || rec.category;
  return (
    <View
      style={[
        rw.card,
        { backgroundColor: T.card, borderColor: T.border },
        best && { borderColor: COLORS.primary, borderWidth: 1.5, shadowColor: COLORS.primary, shadowOpacity: 0.15, shadowRadius: 10, elevation: 3 },
      ]}
    >
      <View style={rw.top}>
        <View style={[rw.iconBox, { backgroundColor: best ? COLORS.primary : T.inputBg }]}>
          <Ionicons name={icon} size={20} color={best ? '#fff' : COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[rw.category, { color: T.text }]}>{name}</Text>
          <View style={[rw.badge, { backgroundColor: best ? COLORS.primaryLight : T.inputBg }]}>
            <Text style={[rw.badgeText, { color: best ? COLORS.primary : T.subText }]}>{matchLabel}</Text>
          </View>
        </View>
        <Text style={[rw.pct, { color: best ? COLORS.primary : T.subText }]}>{pct}%</Text>
      </View>
      <Text style={[rw.reason, { color: T.subText }]}>{rec.reason}</Text>
      <ConfidenceBar value={rec.confidence} color={best ? COLORS.primary : COLORS.primary + '60'} trackColor={T.inputBg} />
      {typeof nearbyCount === 'number' && nearbyCount > 0 && (
        <Text style={rw.nearby}>{nearbyCount} {name.toLowerCase()} worker{nearbyCount === 1 ? '' : 's'} verified on AdwumaGo</Text>
      )}
    </View>
  );
}
const rw = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  category: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  pct: { fontSize: 16, fontWeight: '800' },
  reason: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  nearby: { fontSize: 11, color: COLORS.accent, fontWeight: '600', marginTop: 8 },
});

/* ─── Error / no-match state ─── */
function AIErrorState({
  variant, message, sub, onPrimary, primaryLabel, onSecondary, secondaryLabel, onTertiary, tertiaryLabel, T,
}: {
  variant: 'error' | 'no_match' | 'not_configured';
  message: string; sub: string;
  onPrimary: () => void; primaryLabel: string;
  onSecondary?: () => void; secondaryLabel?: string;
  onTertiary?: () => void; tertiaryLabel?: string;
  T: ThemeColors;
}) {
  const iconName = variant === 'error' ? 'cloud-offline-outline' : variant === 'not_configured' ? 'sparkles-outline' : 'help-circle-outline';
  return (
    <View style={es.wrap}>
      <View style={[es.iconWrap, { backgroundColor: T.inputBg }]}>
        <Ionicons name={iconName} size={40} color={variant === 'error' ? COLORS.danger : T.subText} />
      </View>
      <Text style={[es.title, { color: T.text }]}>{message}</Text>
      <Text style={[es.sub, { color: T.subText }]}>{sub}</Text>
      <TouchableOpacity style={es.primaryBtn} onPress={onPrimary} activeOpacity={0.85}>
        <Text style={es.primaryText}>{primaryLabel}</Text>
      </TouchableOpacity>
      {onSecondary && secondaryLabel && (
        <TouchableOpacity style={es.secondaryBtn} onPress={onSecondary} activeOpacity={0.7}>
          <Text style={es.secondaryText}>{secondaryLabel}</Text>
        </TouchableOpacity>
      )}
      {onTertiary && tertiaryLabel && (
        <TouchableOpacity style={es.secondaryBtn} onPress={onTertiary} activeOpacity={0.7}>
          <Text style={es.secondaryText}>{tertiaryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const es = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 30 },
  iconWrap: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 24 },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 30, marginBottom: 12, width: '100%', alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  secondaryBtn: { paddingVertical: 8 },
  secondaryText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
});

/* ─── Main screen ─── */
export default function AIAssistantScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'AiAssistant'>) {
  const T = useThemeColors();
  const [phase, setPhase] = useState<Phase>('upload');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission needed', 'Allow camera access so you can photograph the problem.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
    if (!result.canceled && result.assets[0]) setImage(result.assets[0]);
  };

  const chooseFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo permission needed', 'Allow access to your photos to select an image of the problem.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
    if (!result.canceled && result.assets[0]) setImage(result.assets[0]);
  };

  const removePhoto = () => setImage(null);

  const validateImage = (asset: ImagePicker.ImagePickerAsset): string | null => {
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
      return 'This photo is too large. Please choose a smaller image or take a new one.';
    }
    const mime = asset.mimeType || '';
    if (mime && !['image/jpeg', 'image/jpg', 'image/png'].includes(mime)) {
      return 'Unsupported file type. Please use a JPG or PNG photo.';
    }
    if (!asset.uri) {
      return 'This image is unavailable. Please choose another photo.';
    }
    return null;
  };

  const runAnalysis = async () => {
    if (!image) return;
    const validationError = validateImage(image);
    if (validationError) {
      Alert.alert('Choose Another Photo', validationError);
      return;
    }

    setPhase('analyzing');
    try {
      const imageBase64 = await assetToBase64(image);
      if (!imageBase64) {
        setErrorMessage('This image could not be read. Please choose another photo.');
        setPhase('error');
        return;
      }

      const response = await analyzeProblem({
        imageBase64,
        mimeType: image.mimeType || 'image/jpeg',
        description: description.trim() || undefined,
      });
      setResult(response);
      setQualityWarning(response.problem?.quality_issue || null);

      if (!response.problem || response.problem.confidence < LOW_CONFIDENCE_THRESHOLD || response.recommendations.length === 0) {
        setPhase('no_match');
        return;
      }

      setPhase('results');

      const topCategory = response.recommendations[0]?.category;
      if (topCategory) {
        countWorkersBySkill(topCategory)
          .then(setNearbyCount)
          .catch(() => setNearbyCount(null));
      }
    } catch (error: any) {
      if (error instanceof AIUnavailableError) {
        setPhase('not_configured');
        return;
      }
      setErrorMessage(error?.message || "We couldn't analyze your image right now.");
      setPhase('error');
    }
  };

  const resetToUpload = () => {
    setImage(null);
    setResult(null);
    setNearbyCount(null);
    setQualityWarning(null);
    setPhase('upload');
  };

  /** Hand the AI's findings to the post-a-job form, pre-filled and ready to send. */
  const postJob = (category?: string) => {
    const parts: string[] = [];
    if (description.trim()) parts.push(description.trim());
    if (result?.problem) {
      parts.push(`AI assessment: ${result.problem.title}${result.problem.description ? ` — ${result.problem.description}` : ''}`);
      if (result.problem.is_hazard && result.problem.hazard_warning) {
        parts.push(`⚠ ${result.problem.hazard_warning}`);
      }
    }
    setAiJobDraft({
      category: category || result?.recommendations?.[0]?.category || 'other',
      description: parts.join('\n\n'),
      photoUri: image?.uri,
    });
    navigation.navigate('PostAJob', { category: category || result?.recommendations?.[0]?.category || '' });
  };

  const findWorkers = () => {
    if (!result?.recommendations?.length) return;
    postJob(result.recommendations[0].category);
  };

  const isSoftConfidence = !!result?.problem && result.problem.confidence < SOFT_CONFIDENCE_THRESHOLD;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />
      <ScreenHeader title="How can we help?" onBack={() => navigation.goBack()} />

      {phase === 'upload' && (
        <Text style={[s.headerSub, { color: T.subText }]}>Take a photo of the problem and our AI will help you identify it and find the right professional.</Text>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* ══════════ UPLOAD PHASE ══════════ */}
          {phase === 'upload' && !image && (
            <>
              <Text style={[s.sectionTitle, { color: T.text }]}>Show us the problem</Text>
              <Text style={[s.sectionSub, { color: T.subText }]}>Take a photo or upload an image of the problem you need help with.</Text>

              <View style={s.actionsRow}>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.inputBg, borderColor: T.border }]} onPress={takePhoto} activeOpacity={0.85}>
                  <Ionicons name="camera-outline" size={26} color={COLORS.primary} />
                  <Text style={s.actionText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.inputBg, borderColor: T.border }]} onPress={chooseFromGallery} activeOpacity={0.85}>
                  <Ionicons name="images-outline" size={26} color={COLORS.primary} />
                  <Text style={s.actionText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>

              <View style={[s.tipsCard, { backgroundColor: T.card, borderColor: T.border }]}>
                <Text style={[s.tipsTitle, { color: T.text }]}>For better results</Text>
                {[
                  'Make sure the problem is clearly visible.',
                  'Use good lighting.',
                  'Take the photo close enough to show the affected area.',
                  'Avoid blurry images.',
                  'Include the surrounding area if it provides useful context.',
                ].map(tip => (
                  <View key={tip} style={s.tipRow}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                    <Text style={[s.tipText, { color: T.subText }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {phase === 'upload' && image && (
            <>
              <Text style={[s.sectionTitle, { color: T.text }]}>Your photo</Text>
              <Image source={{ uri: image.uri }} style={[s.previewImage, { backgroundColor: T.inputBg }]} />
              <View style={s.previewActions}>
                <TouchableOpacity style={s.previewActionBtn} onPress={chooseFromGallery} activeOpacity={0.8}>
                  <Ionicons name="refresh-outline" size={15} color={COLORS.primary} />
                  <Text style={s.previewActionText}>Change Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.previewActionBtn} onPress={removePhoto} activeOpacity={0.8}>
                  <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                  <Text style={[s.previewActionText, { color: COLORS.danger }]}>Remove Photo</Text>
                </TouchableOpacity>
              </View>

              <Text style={[s.sectionTitle, { color: T.text }]}>
                Tell us more about the problem <Text style={[s.optional, { color: T.subText }]}>(optional)</Text>
              </Text>
              <TextInput
                style={[s.descInput, { borderColor: T.border, backgroundColor: T.inputBg, color: T.text }]}
                placeholder="Example: Water has been leaking from this pipe since yesterday."
                placeholderTextColor={T.subText}
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />

              <TouchableOpacity style={s.analyzeBtn} onPress={runAnalysis} activeOpacity={0.85}>
                <Ionicons name="sparkles" size={17} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.analyzeBtnText}>Analyze Problem</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ══════════ ANALYZING PHASE ══════════ */}
          {phase === 'analyzing' && <AIAnalysisLoading T={T} />}

          {/* ══════════ RESULTS PHASE ══════════ */}
          {phase === 'results' && result?.problem && (
            <>
              <Text style={[s.resultsHeader, { color: T.text }]}>Here&apos;s what we found</Text>

              {image && <Image source={{ uri: image.uri }} style={[s.resultImage, { backgroundColor: T.inputBg }]} />}

              <View style={[s.assessmentCard, { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary + '25' }]}>
                <Text style={s.assessmentLabel}>Problem Identified</Text>
                {isSoftConfidence && (
                  <Text style={s.softNotice}>We&apos;re not completely sure, but this may be:</Text>
                )}
                <Text style={[s.assessmentTitle, { color: T.text }]}>{result.problem.title}</Text>

                <View style={s.confidenceRow}>
                  <ConfidenceBar value={result.problem.confidence} trackColor={T.card} />
                  <Text style={s.confidenceText}>Confidence: {Math.round(result.problem.confidence * 100)}%</Text>
                </View>

                <Text style={[s.assessmentFoundLabel, { color: T.text }]}>What we found</Text>
                <Text style={[s.assessmentDesc, { color: T.subText }]}>{result.problem.description}</Text>

                {qualityWarning && (
                  <View style={[s.qualityBox, { backgroundColor: T.card, borderColor: COLORS.primary + '30' }]}>
                    <Ionicons name="alert-circle-outline" size={15} color={COLORS.primaryDark} />
                    <Text style={[s.qualityText, { color: T.text }]}>{qualityWarning}</Text>
                  </View>
                )}

                {result.problem.is_hazard && (
                  <View style={[s.hazardBox, { backgroundColor: COLORS.dangerLight }]}>
                    <Ionicons name="warning" size={16} color={COLORS.danger} />
                    <Text style={[s.hazardText, { color: COLORS.danger }]}>
                      {result.problem.hazard_warning || 'This may involve a hazardous issue. Avoid unsafe DIY intervention and seek a qualified professional.'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={s.recommendedHeader}>
                <Text style={[s.sectionTitle, { color: T.text }]}>Recommended Professionals</Text>
                <Text style={[s.sectionSub, { color: T.subText }]}>Based on the problem identified, these professionals are most likely to help.</Text>
              </View>

              {result.recommendations.map((rec, i) => (
                <RecommendedWorkerCard
                  key={rec.category + i}
                  rec={rec}
                  best={i === 0}
                  nearbyCount={i === 0 ? nearbyCount : undefined}
                  T={T}
                />
              ))}

              <Text style={[s.disclaimer, { color: T.subText }]}>
                AI-generated suggestion. A qualified professional should inspect the problem before work begins.
              </Text>

              <TouchableOpacity style={s.findBtn} onPress={findWorkers} activeOpacity={0.85}>
                <Text style={s.findBtnText}>Post This Job</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.viewOthersBtn} onPress={resetToUpload} activeOpacity={0.7}>
                <Text style={s.viewOthersText}>Start Over</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ══════════ NO MATCH PHASE ══════════ */}
          {phase === 'no_match' && (
            <AIErrorState
              variant="no_match"
              message="We couldn't confidently identify the problem."
              sub="Try a clearer, closer photo — or just describe the job and post it yourself."
              onPrimary={resetToUpload}
              primaryLabel="Try Another Photo"
              onSecondary={() => postJob()}
              secondaryLabel="Post a Job Manually"
              onTertiary={() => navigation.goBack()}
              tertiaryLabel="Go Back"
              T={T}
            />
          )}

          {/* ══════════ ERROR PHASE ══════════ */}
          {phase === 'error' && (
            <AIErrorState
              variant="error"
              message="We couldn't analyze your image right now."
              sub={errorMessage || 'Please check your internet connection and try again.'}
              onPrimary={runAnalysis}
              primaryLabel="Try Again"
              onSecondary={() => postJob()}
              secondaryLabel="Post a Job Manually"
              onTertiary={() => navigation.goBack()}
              tertiaryLabel="Go Back"
              T={T}
            />
          )}

          {/* ══════════ AI NOT CONFIGURED PHASE ══════════ */}
          {phase === 'not_configured' && (
            <AIErrorState
              variant="not_configured"
              message="Photo analysis isn't switched on yet"
              sub="The AI vision service still needs to be deployed. You can still describe the job and post it — a professional will pick it up."
              onPrimary={() => postJob()}
              primaryLabel="Post a Job Manually"
              onSecondary={() => navigation.goBack()}
              secondaryLabel="Go Back"
              T={T}
            />
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  headerSub: { fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 30, paddingTop: 12, marginBottom: 14 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6, marginTop: 6 },
  sectionSub: { fontSize: 12, lineHeight: 18, marginBottom: 16 },
  optional: { fontSize: 12, fontWeight: '500' },

  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  actionBtn: { flex: 1, alignItems: 'center', gap: 8, borderRadius: 16, paddingVertical: 22, borderWidth: 1 },
  actionText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, textAlign: 'center', paddingHorizontal: 6 },

  tipsCard: { borderRadius: 14, padding: 16, gap: 9, borderWidth: 1 },
  tipsTitle: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipText: { flex: 1, fontSize: 12, lineHeight: 18 },

  previewImage: { width: '100%', height: 240, borderRadius: 16, marginBottom: 12 },
  previewActions: { flexDirection: 'row', gap: 20, marginBottom: 22 },
  previewActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  previewActionText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  descInput: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 14, minHeight: 80, marginBottom: 20, lineHeight: 20 },

  analyzeBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  analyzeBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  resultsHeader: { fontSize: 20, fontWeight: '800', marginBottom: 16, marginTop: 6 },
  resultImage: { width: '100%', height: 160, borderRadius: 14, marginBottom: 16 },

  assessmentCard: { borderRadius: 16, padding: 16, marginBottom: 22, borderWidth: 1 },
  assessmentLabel: { fontSize: 11, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  softNotice: { fontSize: 12, color: COLORS.primary, fontStyle: 'italic', marginBottom: 4 },
  assessmentTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  confidenceRow: { marginBottom: 14, gap: 6 },
  confidenceText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  assessmentFoundLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  assessmentDesc: { fontSize: 13, lineHeight: 19 },
  qualityBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 10, marginTop: 12, borderWidth: 1 },
  qualityText: { flex: 1, fontSize: 11, lineHeight: 16 },
  hazardBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 10, marginTop: 12 },
  hazardText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },

  recommendedHeader: { marginBottom: 4 },

  disclaimer: { fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 6, marginBottom: 20, paddingHorizontal: 10 },

  findBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  findBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  viewOthersBtn: { alignItems: 'center', paddingVertical: 10 },
  viewOthersText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
});
