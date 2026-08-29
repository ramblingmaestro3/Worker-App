# ai-analyze

Vision analysis for the customer **AI Help** screen (`app/ai-assistant.tsx`).
Takes a problem photo, asks Google Gemini what's wrong, returns an identified
problem + ranked worker-skill recommendations.

Called from the app via `lib/api/ai.ts` → `supabase.functions.invoke('ai-analyze')`.
Until it's deployed, the screen still works — it falls back to "Post a Job Manually".

## Deploy

```bash
# 1. Free Gemini key: https://aistudio.google.com/apikey
supabase secrets set GEMINI_API_KEY=AIza...

# 2. (optional) pin the model — default is gemini-2.5-flash
supabase secrets set GEMINI_MODEL=gemini-2.5-flash

# 3. deploy
supabase functions deploy ai-analyze
```

`verify_jwt` is off (see `supabase/config.toml`) so the browser CORS preflight
isn't rejected by the gateway — the function verifies the caller's token itself
and returns 401 for anyone not signed in. `SUPABASE_URL` / `SUPABASE_ANON_KEY`
are injected automatically; you don't set them.

## Request / response

```
POST  { imageBase64: string, mimeType?: string, description?: string }

200   { problem: { title, description, confidence, is_hazard, hazard_warning, quality_issue } | null,
        recommendations: [ { category, label, confidence, reason } ] }   // category = skill id
503   { error, code: "not_configured" }   // GEMINI_API_KEY missing / rejected
```

## Local test

```bash
supabase functions serve ai-analyze --env-file supabase/.env
# then POST to http://localhost:54321/functions/v1/ai-analyze with an Authorization: Bearer <user jwt>
```
