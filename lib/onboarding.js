import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  DONE: "tripkart_onboarding_v1_done",
  COUNTRY: "tripkart_country_data",
  PREFERENCES: "tripkart_travel_preferences",
  EMERGENCY: "tripkart_emergency_contact",
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
