import { supabase } from '../supabase';

/* ── Shape returned by the `ai-analyze` Edge Function ── */

export type AIProblemAssessment = {
  title: string;
  description: string;
  confidence: number;
  is_hazard?: boolean;
  hazard_warning?: string | null;
  quality_issue?: string | null;
};

export type AIWorkerRecommendation = {
  /** Skill id, e.g. "plumbing" — matches post-a-job categories + worker_profiles.skills. */
  category: string;
  /** Friendly label, e.g. "Plumbing". */
  label: string;
  confidence: number;
  reason: string;
};

export type AIAnalysisResult = {
  problem: AIProblemAssessment | null;
  recommendations: AIWorkerRecommendation[];
};

export class AIUnavailableError extends Error {}

/**
 * Sends a problem photo to the `ai-analyze` Edge Function for vision analysis.
 * `imageBase64` is the raw base64 (no `data:` prefix) from expo-image-picker.
 */
export async function analyzeProblem(input: {
  imageBase64: string;
  mimeType?: string;
  description?: string;
}): Promise<AIAnalysisResult> {
  const { data, error } = await supabase.functions.invoke<AIAnalysisResult & { error?: string; code?: string }>(
    'ai-analyze',
    { body: input },
  );

  if (error) {
    // supabase-js wraps a non-2xx response in FunctionsHttpError; the body is on error.context
    const ctx = (error as any).context;
    let payload: any = null;
    try {
      payload = await ctx?.json?.();
    } catch {
      /* body wasn't JSON */
    }
    // 404 = function not deployed yet; 503 w/ code = deployed but no API key
    if (ctx?.status === 404 || payload?.code === 'not_configured') {
      throw new AIUnavailableError('The AI assistant isn’t switched on yet.');
    }
    throw new Error(payload?.error || error.message || 'Could not analyze this photo right now.');
  }

  if (!data || !Array.isArray(data.recommendations)) {
    throw new Error('The AI returned an unexpected response.');
  }
  return { problem: data.problem ?? null, recommendations: data.recommendations };
}

/**
 * Best-effort count of verified workers who list `skill`. Returns null if the
 * query is blocked (e.g. RLS) or fails — callers should treat null as "unknown".
 */
export async function countWorkersBySkill(skill: string): Promise<number | null> {
  const { count, error } = await supabase
    .from('worker_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', 'verified')
    .contains('skills', [skill]);
  if (error) return null;
  return count ?? 0;
}
