import * as SecureStore from "expo-secure-store";

const PREFIX = "tripkart_";

export const secureStorage = {
  async set(key, value) {
    try {
      const str = typeof value === "string" ? value : JSON.stringify(value);
      await SecureStore.setItemAsync(PREFIX + key, str);
      return true;
    } catch {
      return false;
    }
  },

  async get(key) {
    try {
      const val = await SecureStore.getItemAsync(PREFIX + key);
      if (val === null) return null;
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    } catch {
      return null;
    }
  },

  async remove(key) {
    try {
      await SecureStore.deleteItemAsync(PREFIX + key);
      return true;
    } catch {
      return false;
    }
  },

  async clearAll(keys) {
    await Promise.allSettled(
      keys.map((k) => SecureStore.deleteItemAsync(PREFIX + k)),
    );
  },
};

// ─── PIN helpers (hash lives only on device, keyed per user) ─────────────────

import * as Crypto from "expo-crypto";

export const pinStorage = {
  // userId is set by appLockContext after login so PIN is per-account
  _userId: null,

  setUserId(id) {
    this._userId = id || null;
  },

  // Keys are scoped to the current user so User A's PIN never applies to User B
  get KEY() {
    return this._userId ? `pin_hash_${this._userId}` : "pin_hash";
  },
  get PIN_LENGTH_KEY() {
    return this._userId ? `pin_length_${this._userId}` : "pin_length";
  },
  get ATTEMPTS_KEY() {
    return this._userId
      ? `pin_attempts_${this._userId}`
      : "pin_failed_attempts";
  },
  get LOCKED_KEY() {
    return this._userId ? `pin_locked_${this._userId}` : "pin_locked_until";
  },
  get BIO_KEY() {
    return this._userId ? `bio_enabled_${this._userId}` : "biometric_enabled";
  },

  async hashPin(pin) {
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
  },

  async savePin(pin) {
    const hash = await this.hashPin(pin);
    await secureStorage.set(this.KEY, hash);
    await secureStorage.set(this.PIN_LENGTH_KEY, pin.length);
    await secureStorage.set(this.ATTEMPTS_KEY, 0);
    await secureStorage.remove(this.LOCKED_KEY);
    return hash;
  },

  async getPinLength() {
    const len = await secureStorage.get(this.PIN_LENGTH_KEY);
    if (typeof len === "number" && len >= 4 && len <= 8) return len;
    return 6;
  },

  async verifyPin(pin) {
    const stored = await secureStorage.get(this.KEY);
    if (!stored) return { valid: false, reason: "no_pin" };

    const lockedUntil = await secureStorage.get(this.LOCKED_KEY);
    if (lockedUntil && new Date(lockedUntil) > new Date()) {
      return { valid: false, reason: "locked", lockedUntil };
    }

    const hash = await this.hashPin(pin);
    const match = hash === stored;

    if (!match) {
      let attempts = (await secureStorage.get(this.ATTEMPTS_KEY)) || 0;
      attempts += 1;
      await secureStorage.set(this.ATTEMPTS_KEY, attempts);
      if (attempts >= 5) {
        const lockTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await secureStorage.set(this.LOCKED_KEY, lockTime);
        return { valid: false, reason: "locked", lockedUntil: lockTime };
      }
      return { valid: false, reason: "wrong_pin", attemptsLeft: 5 - attempts };
    }

    await secureStorage.set(this.ATTEMPTS_KEY, 0);
    await secureStorage.remove(this.LOCKED_KEY);
    return { valid: true };
  },

  async hasPin() {
    const h = await secureStorage.get(this.KEY);
    return !!h;
  },

  async clearPin() {
    await secureStorage.remove(this.KEY);
    await secureStorage.remove(this.PIN_LENGTH_KEY);
    await secureStorage.remove(this.ATTEMPTS_KEY);
    await secureStorage.remove(this.LOCKED_KEY);
  },

  async getBiometricEnabled() {
    const flag = await secureStorage.get(this.BIO_KEY);
    return flag?.enabled === true;
  },

  async setBiometricEnabled(val, type) {
    await secureStorage.set(this.BIO_KEY, {
      enabled: !!val,
      type: type || null,
    });
  },
};
