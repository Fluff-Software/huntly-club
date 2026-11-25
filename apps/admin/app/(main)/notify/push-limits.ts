// Keep in sync with supabase/functions/send-admin-push (MAX_TITLE_LENGTH / MAX_MESSAGE_LENGTH).
// Short enough to show untruncated on most lock screens.
export const PUSH_TITLE_MAX = 65;
export const PUSH_MESSAGE_MAX = 240;
export const PUSH_DEFAULT_TITLE = "Huntly World";

/** Who a push goes to. Mirrors the audience accepted by send-admin-push. */
export type PushAudience =
  | { type: "all" }
  | { type: "users"; userIds: string[] }
  | { type: "inactive"; days: number };

export const INACTIVE_DAY_OPTIONS = [
  { days: 7, label: "1 week" },
  { days: 14, label: "2 weeks" },
  { days: 30, label: "1 month" },
  { days: 60, label: "2 months" },
  { days: 90, label: "3 months" },
] as const;
