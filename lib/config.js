// ─── App Configuration ────────────────────────────────────────────────────────
// Set EXPO_PUBLIC_MAPBOX_TOKEN in your .env file
// Get token at: https://account.mapbox.com/access-tokens/
export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "";

// Mapbox geocoding base URL (India + South Asia focus)
export const MAPBOX_GEOCODE_URL =
  "https://api.mapbox.com/geocoding/v5/mapbox.places";

export const MAPBOX_COUNTRIES = "IN,NP,LK,BD,BT,MV";
