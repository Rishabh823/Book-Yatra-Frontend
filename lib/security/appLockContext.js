import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pinStorage } from './secureStorage';

const AppLockContext = createContext(null);

export const AppLockProvider = ({ children }) => {
  const [isLocked,         setIsLocked]         = useState(false);
  const [lockReason,       setLockReason]       = useState(null);
  const [pinEnabled,       setPinEnabled]       = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoTimeout,      setAutoTimeout]      = useState(15);
  const [initialized,      setInitialized]      = useState(false);

  const appStateRef     = useRef(AppState.currentState);
  const backgroundTime  = useRef(null);
  const inactivityTimer = useRef(null);
  const startupLockDone = useRef(false);

  const loadSettings = useCallback(async () => {
    try {
      // Key all security data by logged-in user so User A's PIN never affects User B
      let userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        try {
          const u = JSON.parse(await AsyncStorage.getItem('user') || '{}');
          userId = u._id || null;
        } catch {}
      }
      pinStorage.setUserId(userId);

      const hasPinLocally = await pinStorage.hasPin();
      setPinEnabled(hasPinLocally);

      const bioEnabled = await pinStorage.getBiometricEnabled();
      setBiometricEnabled(bioEnabled);
    } catch {}
    setInitialized(true);
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const lock = useCallback((reason = 'pin') => {
    setIsLocked(true);
    setLockReason(reason);
  }, []);

  const unlock = useCallback(() => {
    setIsLocked(false);
    setLockReason(null);
    resetInactivityTimer();
  }, []);

  const isSecured = pinEnabled || biometricEnabled;

  // ── Startup lock ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialized) return;
    if (startupLockDone.current) return;
    startupLockDone.current = true;

    if (pinEnabled || biometricEnabled) {
      setIsLocked(true);
      setLockReason(biometricEnabled && !pinEnabled ? 'biometric' : 'pin');
    }
  }, [initialized, pinEnabled, biometricEnabled]);

  // ── Inactivity timer ────────────────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    const isBioOnly = biometricEnabled && !pinEnabled;
    if (autoTimeout > 0 && isSecured && !isBioOnly) {
      inactivityTimer.current = setTimeout(() => {
        lock('inactivity');
      }, autoTimeout * 60 * 1000);
    }
  }, [autoTimeout, isSecured, biometricEnabled, pinEnabled, lock]);

  useEffect(() => {
    if (initialized && !isLocked) resetInactivityTimer();
    return () => { if (inactivityTimer.current) clearTimeout(inactivityTimer.current); };
  }, [initialized, isLocked, resetInactivityTimer]);

  // ── AppState: background → foreground lock ───────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (prev === 'active' && nextState !== 'active') {
        backgroundTime.current = Date.now();
      }

      if (nextState === 'active' && backgroundTime.current) {
        const awayMs = Date.now() - backgroundTime.current;
        const awayMin = awayMs / 1000 / 60;
        backgroundTime.current = null;

        if (!isSecured) return;

        if (biometricEnabled && !pinEnabled) {
          lock('biometric');
        } else if (autoTimeout > 0 && awayMin >= autoTimeout) {
          lock(biometricEnabled ? 'biometric' : 'inactivity');
        }
      }
    });
    return () => sub.remove();
  }, [isSecured, biometricEnabled, pinEnabled, autoTimeout, lock]);

  const syncSettings = useCallback(async (settings) => {
    if (settings.autoLockTimeout !== undefined) setAutoTimeout(settings.autoLockTimeout);
  }, []);

  return (
    <AppLockContext.Provider value={{ isLocked, lockReason, pinEnabled, biometricEnabled, autoTimeout, lock, unlock, syncSettings, loadSettings, resetInactivityTimer }}>
      {children}
    </AppLockContext.Provider>
  );
};

export const useAppLock = () => {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
};
