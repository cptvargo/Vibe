// ─────────────────────────────────────────────
//  Vibe · Config
//  Reads from your .env file — fill that in!
// ─────────────────────────────────────────────

export const VIBE_CONFIG = {
  serverUrl: import.meta.env.VITE_JELLYFIN_URL || 'http://100.79.48.48:8096',
  token:     import.meta.env.VITE_JELLYFIN_API_KEY || '',
  userId:    import.meta.env.VITE_JELLYFIN_USER_ID || '',
};
