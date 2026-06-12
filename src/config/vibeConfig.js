export const VIBE_CONFIG = {
  serverUrl: import.meta.env.VITE_JELLYFIN_URL        || '',
  localUrl:  import.meta.env.VITE_JELLYFIN_LOCAL_URL  || '',
  token:     import.meta.env.VITE_JELLYFIN_API_KEY    || '',
  userId:    import.meta.env.VITE_JELLYFIN_USER_ID    || '',
};
