import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  analyzeProblem,
  countWorkersBySkill,
  AIUnavailableError,
  AIAnalysisResult,
  AIWorkerRecommendation,
} from '../lib/api/ai';
import { setAiJobDraft } from '@/lib/aiJobDraftBridge';

// This screen is a light surface regardless of app theme; COLORS.text/.muted are
// the dark-theme palette (near-white) and would vanish here.
const INK = '#1A1A1A';
const SUBTLE = '#6B7280';

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
  }, []);
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
function AIAnalysisLoading() {
  const [stageIndex, setStageIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStageIndex(i => Math.min(i + 1, ANALYSIS_STAGES.length - 1)), 1100);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={al.wrap}>
      <View style={al.radarWrap}>
        <PulseRing delay={0} size={180} color="#7C3AED" />
        <PulseRing delay={600} size={180} color="#7C3AED" />
        <PulseRing delay={1200} size={180} color="#7C3AED" />
        <View style={al.centerIcon}>
          <Ionicons name="sparkles" size={30} color="#7C3AED" />
        </View>
      </View>
      <Text style={al.title}>Analyzing your problem...</Text>
      <Text style={al.stage}>{ANALYSIS_STAGES[stageIndex]}</Text>
    </View>
  );
}

const al = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 60, paddingBottom: 30 },
  radarWrap: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  centerIcon: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#F4F0FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E4D9FF' },
  title: { fontSize: 19, fontWeight: '800', color: INK, marginBottom: 8 },
  stage: { fontSize: 13, color: SUBTLE, textAlign: 'center', paddingHorizontal: 40 },
});

/* ─── Confidence bar ─── */
function ConfidenceBar({ value, color = '#7C3AED' }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={cb.track}>
      <View style={[cb.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}
const cb = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: '#EEE', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

/* ─── Recommended worker card ─── */
function RecommendedWorkerCard({
  rec, best, nearbyCount,
}: { rec: AIWorkerRecommendation; best: boolean; nearbyCount?: number | null }) {
  const pct = Math.round(rec.confidence * 100);
  const matchLabel = best ? 'Best Match' : rec.confidence >= 0.5 ? 'Good Match' : 'Possible Match';
  const icon = CATEGORY_ICONS[rec.category] || 'construct-outline';
  const name = rec.label || rec.category;
  return (
    <View style={[rw.card, best && rw.cardBest]}>
      <View style={rw.top}>
        <View style={[rw.iconBox, best && rw.iconBoxBest]}>
          <Ionicons name={icon} size={20} color={best ? '#fff' : '#7C3AED'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={rw.category}>{name}</Text>
          <View style={[rw.badge, best && rw.badgeBest]}>
            <Text style={[rw.badgeText, best && rw.badgeTextBest]}>{matchLabel}</Text>
          </View>
        </View>
        <Text style={[rw.pct, best && rw.pctBest]}>{pct}%</Text>
      </View>
      <Text style={rw.reason}>{rec.reason}</Text>
      <ConfidenceBar value={rec.confidence} color={best ? '#7C3AED' : '#B8A6E8'} />
      {typeof nearbyCount === 'number' && nearbyCount > 0 && (
        <Text style={rw.nearby}>{nearbyCount} {name.toLowerCase()} worker{nearbyCount === 1 ? '' : 's'} verified on AdwumaGo</Text>
      )}
    </View>
  );
}
const rw = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E8E8E8' },
  cardBest: { borderColor: '#7C3AED', borderWidth: 1.5, shadowColor: '#7C3AED', shadowOpacity: 0.15, shadowRadius: 10, elevation: 3 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F4F0FF', alignItems: 'center', justifyContent: 'center' },
  iconBoxBest: { backgroundColor: '#7C3AED' },
  category: { fontSize: 14, fontWeight: '800', color: INK, marginBottom: 3 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#F0F0F0', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeBest: { backgroundColor: '#F4F0FF' },
  badgeText: { fontSize: 10, fontWeight: '700', color: SUBTLE },
  badgeTextBest: { color: '#7C3AED' },
  pct: { fontSize: 16, fontWeight: '800', color: SUBTLE },
  pctBest: { color: '#7C3AED' },
  reason: { fontSize: 12, color: '#4B5563', lineHeight: 18, marginBottom: 10 },
  nearby: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 8 },
});

/* ─── Error / no-match state ─── */
function AIErrorState({
  variant, message, sub, onPrimary, primaryLabel, onSecondary, secondaryLabel, onTertiary, tertiaryLabel,
}: {
  variant: 'error' | 'no_match' | 'not_configured';
  message: string; sub: string;
  onPrimary: () => void; primaryLabel: string;
  onSecondary?: () => void; secondaryLabel?: string;
  onTertiary?: () => void; tertiaryLabel?: string;
}) {
  const iconName = variant === 'error' ? 'cloud-offline-outline' : variant === 'not_configured' ? 'sparkles-outline' : 'help-circle-outline';
  return (
    <View style={es.wrap}>
      <View style={es.iconWrap}>
        <Ionicons name={iconName} size={40} color={variant === 'error' ? COLORS.danger : SUBTLE} />
      </View>
      <Text style={es.title}>{message}</Text>
      <Text style={es.sub}>{sub}</Text>
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
  iconWrap: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 17, fontWeight: '800', color: INK, textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 13, color: SUBTLE, textAlign: 'center', lineHeight: 19, marginBottom: 24 },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 30, marginBottom: 12, width: '100%', alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  secondaryBtn: { paddingVertical: 8 },
  secondaryText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
});

/* ─── Main screen ─── */
export default function AIAssistantScreen() {
  const [phase, setPhase] = useState<Phase>('upload');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [description, setDescription] = useState('');
  const [descFocused, setDescFocused] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);

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
    router.push({ pathname: '/post-a-job', params: { category: category || result?.recommendations?.[0]?.category || '' } });
  };

  const findWorkers = () => {
    if (!result?.recommendations?.length) return;
    postJob(result.recommendations[0].category);
  };

  const isSoftConfidence = !!result?.problem && result.problem.confidence < SOFT_CONFIDENCE_THRESHOLD;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={INK} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>How can we help?</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {phase === 'upload' && (
        <Text style={s.headerSub}>Take a photo of the problem and our AI will help you identify it and find the right professional.</Text>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* ══════════ UPLOAD PHASE ══════════ */}
          {phase === 'upload' && !image && (
            <>
              <Text style={s.sectionTitle}>Show us the problem</Text>
              <Text style={s.sectionSub}>Take a photo or upload an image of the problem you need help with.</Text>

              <View style={s.actionsRow}>
                <TouchableOpacity style={s.actionBtn} onPress={takePhoto} activeOpacity={0.85}>
                  <Ionicons name="camera-outline" size={26} color="#7C3AED" />
                  <Text style={s.actionText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={chooseFromGallery} activeOpacity={0.85}>
                  <Ionicons name="images-outline" size={26} color="#7C3AED" />
                  <Text style={s.actionText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>

              <View style={s.tipsCard}>
                <Text style={s.tipsTitle}>For better results</Text>
                {[
                  'Make sure the problem is clearly visible.',
                  'Use good lighting.',
                  'Take the photo close enough to show the affected area.',
                  'Avoid blurry images.',
                  'Include the surrounding area if it provides useful context.',
                ].map(tip => (
                  <View key={tip} style={s.tipRow}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                    <Text style={s.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {phase === 'upload' && image && (
            <>
              <Text style={s.sectionTitle}>Your photo</Text>
              <Image source={{ uri: image.uri }} style={s.previewImage} />
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

              <Text style={s.sectionTitle}>
                Tell us more about the problem <Text style={s.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={s.descInput}
                placeholder="Example: Water has been leaking from this pipe since yesterday."
                placeholderTextColor="#AAAAAA"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
                onFocus={() => setDescFocused(true)}
                onBlur={() => setDescFocused(false)}
              />

              <TouchableOpacity style={s.analyzeBtn} onPress={runAnalysis} activeOpacity={0.85}>
                <Ionicons name="sparkles" size={17} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.analyzeBtnText}>Analyze Problem</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ══════════ ANALYZING PHASE ══════════ */}
          {phase === 'analyzing' && <AIAnalysisLoading />}

          {/* ══════════ RESULTS PHASE ══════════ */}
          {phase === 'results' && result?.problem && (
            <>
              <Text style={s.resultsHeader}>Here&apos;s what we found</Text>

              {image && <Image source={{ uri: image.uri }} style={s.resultImage} />}

              <View style={s.assessmentCard}>
                <Text style={s.assessmentLabel}>Problem Identified</Text>
                {isSoftConfidence && (
                  <Text style={s.softNotice}>We&apos;re not completely sure, but this may be:</Text>
                )}
                <Text style={s.assessmentTitle}>{result.problem.title}</Text>

                <View style={s.confidenceRow}>
                  <ConfidenceBar value={result.problem.confidence} />
                  <Text style={s.confidenceText}>Confidence: {Math.round(result.problem.confidence * 100)}%</Text>
                </View>

                <Text style={s.assessmentFoundLabel}>What we found</Text>
                <Text style={s.assessmentDesc}>{result.problem.description}</Text>

                {qualityWarning && (
                  <View style={s.qualityBox}>
                    <Ionicons name="alert-circle-outline" size={15} color="#B45309" />
                    <Text style={s.qualityText}>{qualityWarning}</Text>
                  </View>
                )}

                {result.problem.is_hazard && (
                  <View style={s.hazardBox}>
                    <Ionicons name="warning" size={16} color="#B42318" />
                    <Text style={s.hazardText}>
                      {result.problem.hazard_warning || 'This may involve a hazardous issue. Avoid unsafe DIY intervention and seek a qualified professional.'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={s.recommendedHeader}>
                <Text style={s.sectionTitle}>Recommended Professionals</Text>
                <Text style={s.sectionSub}>Based on the problem identified, these professionals are most likely to help.</Text>
              </View>

              {result.recommendations.map((rec, i) => (
                <RecommendedWorkerCard
                  key={rec.category + i}
                  rec={rec}
                  best={i === 0}
                  nearbyCount={i === 0 ? nearbyCount : undefined}
                />
              ))}

              <Text style={s.disclaimer}>
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
              onTertiary={() => router.back()}
              tertiaryLabel="Go Back"
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
              onTertiary={() => router.back()}
              tertiaryLabel="Go Back"
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
              onSecondary={() => router.back()}
              secondaryLabel="Go Back"
            />
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 19, fontWeight: '800', color: INK, textAlign: 'center' },
  headerSub: { fontSize: 12, color: SUBTLE, textAlign: 'center', lineHeight: 18, paddingHorizontal: 30, marginBottom: 14 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: INK, marginBottom: 6, marginTop: 6 },
  sectionSub: { fontSize: 12, color: SUBTLE, lineHeight: 18, marginBottom: 16 },
  optional: { fontSize: 12, fontWeight: '500', color: SUBTLE },

  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  actionBtn: { flex: 1, alignItems: 'center', gap: 8, backgroundColor: '#F4F0FF', borderRadius: 16, paddingVertical: 22, borderWidth: 1, borderColor: '#E4D9FF' },
  actionText: { fontSize: 12, fontWeight: '700', color: '#7C3AED', textAlign: 'center', paddingHorizontal: 6 },

  tipsCard: { backgroundColor: '#F8F8F8', borderRadius: 14, padding: 16, gap: 9 },
  tipsTitle: { fontSize: 13, fontWeight: '800', color: INK, marginBottom: 3 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipText: { flex: 1, fontSize: 12, color: '#4B5563', lineHeight: 18 },

  previewImage: { width: '100%', height: 240, borderRadius: 16, backgroundColor: '#EEE', marginBottom: 12 },
  previewActions: { flexDirection: 'row', gap: 20, marginBottom: 22 },
  previewActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  previewActionText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  descInput: { borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 14, padding: 14, fontSize: 14, color: INK, minHeight: 80, backgroundColor: '#FAFAFA', marginBottom: 20, lineHeight: 20 },

  analyzeBtn: { flexDirection: 'row', backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', shadowColor: '#7C3AED', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  analyzeBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  resultsHeader: { fontSize: 20, fontWeight: '800', color: INK, marginBottom: 16, marginTop: 6 },
  resultImage: { width: '100%', height: 160, borderRadius: 14, backgroundColor: '#EEE', marginBottom: 16 },

  assessmentCard: { backgroundColor: '#F4F0FF', borderRadius: 16, padding: 16, marginBottom: 22, borderWidth: 1, borderColor: '#E4D9FF' },
  assessmentLabel: { fontSize: 11, fontWeight: '800', color: '#7C3AED', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  softNotice: { fontSize: 12, color: '#7C3AED', fontStyle: 'italic', marginBottom: 4 },
  assessmentTitle: { fontSize: 17, fontWeight: '800', color: INK, marginBottom: 12 },
  confidenceRow: { marginBottom: 14, gap: 6 },
  confidenceText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  assessmentFoundLabel: { fontSize: 12, fontWeight: '700', color: INK, marginBottom: 4 },
  assessmentDesc: { fontSize: 13, color: '#4B5563', lineHeight: 19 },
  qualityBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginTop: 12 },
  qualityText: { flex: 1, fontSize: 11, color: '#92400E', lineHeight: 16 },
  hazardBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEE4E2', borderRadius: 10, padding: 10, marginTop: 12 },
  hazardText: { flex: 1, fontSize: 12, color: '#B42318', lineHeight: 17, fontWeight: '600' },

  recommendedHeader: { marginBottom: 4 },

  disclaimer: { fontSize: 11, color: SUBTLE, textAlign: 'center', lineHeight: 16, marginTop: 6, marginBottom: 20, paddingHorizontal: 10 },

  findBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  findBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  viewOthersBtn: { alignItems: 'center', paddingVertical: 10 },
  viewOthersText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
});
