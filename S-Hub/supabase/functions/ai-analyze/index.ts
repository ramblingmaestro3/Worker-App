// Supabase Edge Function: ai-analyze
//
// Analyzes a customer-submitted problem photo with a vision LLM via
// OpenRouter and returns an identified problem + ranked worker-skill
// recommendations. Originally called Gemini directly, switched to
// OpenRouter 2026-09 to avoid Google Cloud's
// project-level billing/prepayment-credits setup in favor of OpenRouter's
// single-key prepaid-credit model, and to have a real free-tier option.
//
// Deploy:   supabase functions deploy ai-analyze --use-api   (no Docker needed)
// Secret:   supabase secrets set OPENROUTER_API_KEY=...   (key: https://openrouter.ai/keys)
// Optional: supabase secrets set OPENROUTER_MODEL="slugA:free,slugB:free"
//
// OPENROUTER_MODEL is a comma-separated preference list; two known-good free
// vision models are always appended as fallbacks (see FALLBACK_MODELS below),
// so a model going paid / 429ing / 503ing doesn't take the feature down — the
// request just tries the next one. Avoid Google's gemma-4-*:free vision models:
// they route through the shared "Google AI Studio" free pool that 429s hard
// from cloud/serverless IPs like Supabase Edge Functions. Free-tier lineups
// churn — re-check https://openrouter.ai/models?input_modalities=image&max_price=0
// For real reliability the OpenRouter account needs ~$10 credit (unlocks paid
// models + higher limits); then set OPENROUTER_MODEL to a cheap paid vision model.
//
// verify_jwt is disabled (config.toml) so the CORS preflight isn't rejected by
// the gateway; this function verifies the caller's token itself below.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// App skill vocabulary — id + friendly label. Must stay in sync with the app's
// constants/categories.ts SERVICE_CATEGORIES (this is a separate Deno bundle
// and can't import it).
const SKILLS: Record<string, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  carpentry: 'Carpentry',
  painting: 'Painting',
  cleaning: 'Cleaning',
  mechanic: 'Mechanic',
  masonry: 'Masonry',
  welding: 'Welding',
  ac: 'AC & Cooling',
  tiling: 'Tiling',
  roofing: 'Roofing',
  security: 'Security / CCTV',
  other: 'General Maintenance',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function buildPrompt(description?: string): string {
  const ids = Object.keys(SKILLS).join(', ');
  const list = Object.entries(SKILLS).map(([id, label]) => `"${id}" (${label})`).join(', ');
  const extra = description ? `\nThe customer also wrote: "${description}"` : '';
  return `You are analyzing a photo from a customer of a home-services marketplace in Ghana who needs to hire a blue-collar tradesperson.${extra}

Identify the single most likely problem shown, then recommend which type(s) of worker can fix it.

Respond with ONLY one JSON object (no markdown fences, no prose) of exactly this shape:
{
  "problem": {
    "title": "short problem title, e.g. 'Leaking water pipe under sink'",
    "description": "1-2 plain-language sentences on what the image appears to show",
    "confidence": 0.0-1.0,
    "is_hazard": true or false,
    "hazard_warning": "short safety warning if is_hazard is true (electrical, gas, fire, structural), else null",
    "quality_issue": "short note if the photo is too blurry/dark/unclear to judge well, else null"
  },
  "recommendations": [
    { "category": one of ${ids}, "confidence": 0.0-1.0, "reason": "one short sentence" }
  ]
}

Rules:
- "category" MUST be exactly one of: ${list}.
- Order "recommendations" highest confidence first, at most 4.
- If you cannot confidently identify any problem, set "problem" to null and "recommendations" to [].
- Never invent details you cannot see.`;
}

function extractJson(text: string): unknown {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) throw new Error('AI response contained no JSON object');
  return JSON.parse(t.slice(start, end + 1));
}

function clamp01(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function normalize(payload: any): { problem: any; recommendations: any[] } {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.recommendations)) {
    throw new Error('AI response was missing expected fields');
  }

  let problem = null;
  if (payload.problem && typeof payload.problem === 'object' && payload.problem.title) {
    problem = {
      title: String(payload.problem.title),
      description: String(payload.problem.description ?? ''),
      confidence: clamp01(payload.problem.confidence),
      is_hazard: !!payload.problem.is_hazard,
      hazard_warning: payload.problem.hazard_warning ? String(payload.problem.hazard_warning) : null,
      quality_issue: payload.problem.quality_issue ? String(payload.problem.quality_issue) : null,
    };
  }

  const recommendations = payload.recommendations
    .map((r: any) => {
      const id = String(r?.category ?? '').toLowerCase().trim();
      const category = SKILLS[id] ? id : 'other';
      return {
        category,
        label: SKILLS[category],
        confidence: clamp01(r?.confidence),
        reason: String(r?.reason ?? ''),
      };
    })
    .filter((r: any) => r.reason)
    .slice(0, 4);

  return { problem, recommendations };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Manual auth — verify_jwt is off so the preflight gets through.
  const authHeader = req.headers.get('Authorization') ?? '';
  const authed = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  try {
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return json({ error: 'Sign in to use the AI assistant' }, 401);
  } catch {
    return json({ error: 'Could not verify your session' }, 401);
  }

  // Caller is authenticated but otherwise unthrottled — cap calls per user so
  // one account can't burn the shared GEMINI_API_KEY's quota/cost.
  try {
    const { data: allowed, error } = await authed.rpc('check_ai_analyze_rate_limit');
    if (error) throw error;
    if (!allowed) return json({ error: 'Too many requests — try again later.' }, 429);
  } catch (err) {
    console.error('rate limit check failed', err);
    return json({ error: 'Could not verify your session' }, 401);
  }

  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) return json({ error: 'AI is not configured', code: 'not_configured' }, 503);

  // OpenRouter's free-tier model lineup churns constantly (models move to paid,
  // providers 429/503) — so try a list, not one. OPENROUTER_MODEL may be a
  // single slug or a comma-separated preference list; the known-good free
  // fallbacks below are always appended so a stale secret can't take the
  // feature down. Re-check https://openrouter.ai/models?fmt=cards&input_modalities=image&max_price=0
  const FALLBACK_MODELS = ['dots-studio/dots-3-note-preview:free', 'nex-agi/nex-n2.5-mini:free'];
  const models = [
    ...(Deno.env.get('OPENROUTER_MODEL') || '').split(',').map((m) => m.trim()).filter(Boolean),
    ...FALLBACK_MODELS,
  ].filter((m, i, a) => a.indexOf(m) === i);

  let imageBase64: string, mimeType: string, description: string | undefined;
  try {
    const body = await req.json();
    imageBase64 = String(body.imageBase64 ?? '');
    mimeType = String(body.mimeType ?? 'image/jpeg');
    description = body.description ? String(body.description) : undefined;
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  if (!imageBase64) return json({ error: 'An image is required' }, 400);
  if (imageBase64.length > 12_000_000) return json({ error: 'This photo is too large.' }, 413);

  const requestBody = (model: string) =>
    JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: buildPrompt(description) },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

  let text = '';
  let lastStatus = 0;
  let lastDetail = '';

  for (const model of models) {
    let providerRes: Response;
    try {
      providerRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://adwumago.app',
          'X-Title': 'AdwumaGo',
        },
        body: requestBody(model),
      });
    } catch (err) {
      console.error('openrouter fetch failed', model, err);
      lastStatus = 502;
      continue;
    }

    if (!providerRes.ok) {
      lastStatus = providerRes.status;
      lastDetail = await providerRes.text().catch(() => '');
      console.error('openrouter error', model, providerRes.status, lastDetail.slice(0, 300));
      // A bad key/permission is fatal for every model — stop early.
      if (providerRes.status === 401 || providerRes.status === 403) {
        return json({ error: 'AI service is misconfigured', code: 'not_configured' }, 503);
      }
      // 402/404/429/5xx → this model is unavailable right now; try the next.
      continue;
    }

    try {
      const data = await providerRes.json();
      text = String(data?.choices?.[0]?.message?.content ?? '').trim();
    } catch {
      lastStatus = 502;
      continue;
    }
    if (text) break;
  }

  if (!text) {
    console.error('all models failed', lastStatus, lastDetail.slice(0, 300));
    if (lastStatus === 429) return json({ error: 'AI service is busy — try again shortly' }, 429);
    return json({ error: 'The AI service is unavailable right now', code: 'not_configured' }, 503);
  }

  try {
    return json(normalize(extractJson(text)), 200);
  } catch (err) {
    console.error('parse/normalize failed', err, text.slice(0, 500));
    return json({ error: 'AI response could not be parsed' }, 502);
  }
});
