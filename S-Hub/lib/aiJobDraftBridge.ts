// Hands a job draft from the AI assistant (app/ai-assistant.tsx) to the
// post-a-job form (app/post-a-job.tsx), the same one-shot pattern as
// locationPickerBridge.ts — set right before navigating, consumed once on focus.

export type AiJobDraft = {
  /** Skill id, e.g. "plumbing" — matches post-a-job's category keys. */
  category: string;
  /** Pre-filled description combining the customer's note + the AI assessment. */
  description: string;
  /** Local URI of the photo the customer took, if any. */
  photoUri?: string;
};

let pending: AiJobDraft | null = null;

export function setAiJobDraft(draft: AiJobDraft): void {
  pending = draft;
}

export function consumeAiJobDraft(): AiJobDraft | null {
  const value = pending;
  pending = null;
  return value;
}
