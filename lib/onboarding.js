import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  DONE: "tripkart_onboarding_v1_done",
  COUNTRY: "tripkart_country_data",
  PREFERENCES: "tripkart_travel_preferences",
  EMERGENCY: "tripkart_emergency_contact",
  SECURITY_DONE: "onb_security_done",
  WALLET_SEEN: "onb_wallet_seen",
};

export const isFirstLaunch = async () => {
  try {
    const v = await AsyncStorage.getItem(KEYS.DONE);
    return v !== "true";
  } catch {
    return true;
  }
};

export const markOnboardingDone = async () => {
  try {
    await AsyncStorage.setItem(KEYS.DONE, "true");
  } catch {}
};

export const resetOnboarding = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.DONE);
  } catch {}
};

export const saveCountryData = async (data) => {
  try {
    await AsyncStorage.setItem(KEYS.COUNTRY, JSON.stringify(data));
  } catch {}
};

export const getCountryData = async () => {
  try {
    const v = await AsyncStorage.getItem(KEYS.COUNTRY);
    return v
      ? JSON.parse(v)
      : {
          country: "India",
          currency: "INR",
          symbol: "₹",
          timezone: "Asia/Kolkata",
        };
  } catch {
    return {
      country: "India",
      currency: "INR",
      symbol: "₹",
      timezone: "Asia/Kolkata",
    };
  }
};

export const savePreferences = async (prefs) => {
  try {
    await AsyncStorage.setItem(KEYS.PREFERENCES, JSON.stringify(prefs));
  } catch {}
};

export const getPreferences = async () => {
  try {
    const v = await AsyncStorage.getItem(KEYS.PREFERENCES);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
};

export const saveEmergencyContact = async (contact) => {
  try {
    await AsyncStorage.setItem(KEYS.EMERGENCY, JSON.stringify(contact));
  } catch {}
};

export const getEmergencyContact = async () => {
  try {
    const v = await AsyncStorage.getItem(KEYS.EMERGENCY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
};

export const markSecurityDone = async () => {
  try { await AsyncStorage.setItem(KEYS.SECURITY_DONE, "true"); } catch {}
};

export const markWalletSeen = async () => {
  try { await AsyncStorage.setItem(KEYS.WALLET_SEEN, "true"); } catch {}
};

// Returns completion info for all 5 profile steps
export const getProfileCompletion = async () => {
  try {
    const [token, prefs, security, emergency, wallet] = await Promise.all([
      AsyncStorage.getItem("token"),
      AsyncStorage.getItem(KEYS.PREFERENCES),
      AsyncStorage.getItem(KEYS.SECURITY_DONE),
      AsyncStorage.getItem(KEYS.EMERGENCY),
      AsyncStorage.getItem(KEYS.WALLET_SEEN),
    ]);

    const steps = [
      { key: "account",    label: "Sign In",           icon: "person-outline",           done: !!token,             route: "/onboarding/onboard-auth" },
      { key: "interests",  label: "Travel Interests",   icon: "heart-outline",            done: !!prefs,             route: "/onboarding/personalization" },
      { key: "security",   label: "Security",           icon: "shield-checkmark-outline", done: security === "true", route: "/onboarding/security" },
      { key: "emergency",  label: "Emergency Contact",  icon: "call-outline",             done: !!emergency,         route: "/onboarding/emergency" },
      { key: "wallet",     label: "Wallet Setup",       icon: "wallet-outline",           done: wallet === "true",   route: "/onboarding/wallet" },
    ];

    const completed = steps.filter((s) => s.done).length;
    const percentage = Math.round((completed / steps.length) * 100);
    const firstIncomplete = steps.find((s) => !s.done) || null;

    return { steps, completed, total: steps.length, percentage, firstIncomplete };
  } catch {
    return { steps: [], completed: 0, total: 5, percentage: 0, firstIncomplete: null };
  }
};
