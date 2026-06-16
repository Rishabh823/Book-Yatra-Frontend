import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { secureStorage, pinStorage } from './secureStorage';

const AppLockContext = createContext(null);

export const AppLockProvider = ({ children }) => {
  const [isLocked,         setIsLocked]         = useState(false);
  const [lockReason,       setLockReason]       = useState(null); // 'pin' | 'biometric' | 'inactivity'
  const [pinEnabled,       setPinEnabled]       = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoTimeout,      setAutoTimeout]      = useState(15);  // minutes
  const [initialized,      setInitialized]      = useState(false);

  const appStateRef      = useRef(AppState.currentState);
  const backgroundTime   = useRef(null);
  const inactivityTimer  = useRef(null);

  const loadSettings = useCallback(async () => {
    try {
      const hasPinLocally = await pinStorage.hasPin();
      setPinEnabled(hasPinLocally);

      const bioFlag = await secureStorage.get('biometric_enabled');
      setBiometricEnabled(bioFlag?.enabled === true);

      const settings = await secureStorage.get('security_settings');
      if (settings?.autoLockTimeout !== undefined) {
        setAutoTimeout(settings.autoLockTimeout);
      }
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

  // App is secured when PIN or biometric is enabled
  const isSecured = pinEnabled || biometricEnabled;

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    // For biometric-only mode (no PIN), don't lock on in-app inactivity —
    // only lock when the user returns from background (AppState change).
    const isBioOnly = biometricEnabled && !pinEnabled;
    if (autoTimeout > 0 && isSecured && !isBioOnly) {
      inactivityTimer.current = setTimeout(() => {
        lock('inactivity');
      }, autoTimeout * 60 * 1000);
    }
  }, [autoTimeout, isSecured, biometricEnabled, pinEnabled, lock]);

  // Re-arm timer whenever settings change
  useEffect(() => {
    if (initialized && !isLocked) resetInactivityTimer();
    return () => { if (inactivityTimer.current) clearTimeout(inactivityTimer.current); };
  }, [initialized, isLocked, resetInactivityTimer]);

  // AppState: lock when app comes to foreground after being away
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (prev === 'active' && nextState !== 'active') {
        backgroundTime.current = Date.now();
      }

      if (nextState === 'active' && backgroundTime.current) {
        const away = (Date.now() - backgroundTime.current) / 1000 / 60; // minutes
        backgroundTime.current = null;
        // Lock on return after configured auto-timeout (applies to both PIN and biometric)
        if (isSecured && autoTimeout > 0 && away >= autoTimeout) {
          lock(biometricEnabled ? 'biometric' : 'inactivity');
        }
      }
    });
    return () => sub.remove();
  }, [isSecured, biometricEnabled, pinEnabled, autoTimeout, lock]);

  const syncSettings = useCallback(async (settings) => {
    if (settings.autoLockTimeout !== undefined) setAutoTimeout(settings.autoLockTimeout);
    await secureStorage.set('security_settings', settings);
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
