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

  const appStateRef     = useRef(AppState.currentState);
  const backgroundTime  = useRef(null);
  const inactivityTimer = useRef(null);
  const startupLockDone = useRef(false); // ensures we only lock once on cold start

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

  const isSecured = pinEnabled || biometricEnabled;

  // ── Startup lock ────────────────────────────────────────────────────────────
  // When the app is killed and reopened, all state resets — backgroundTime is
  // null so the AppState listener never fires. We lock immediately after the
  // first loadSettings() completes if any security method is active.
  useEffect(() => {
    if (!initialized) return;
    if (startupLockDone.current) return;
    startupLockDone.current = true;

    if (pinEnabled || biometricEnabled) {
      setIsLocked(true);
      setLockReason(biometricEnabled && !pinEnabled ? 'biometric' : 'pin');
    }
  }, [initialized, pinEnabled, biometricEnabled]);

  // ── Inactivity timer (PIN mode only) ────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    // Biometric-only: no inactivity lock — the AppState handler does it on background.
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

  // ── AppState: background → foreground lock ───────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      // Record when app goes to background
      if (prev === 'active' && nextState !== 'active') {
        backgroundTime.current = Date.now();
      }

      // Check on return to foreground
      if (nextState === 'active' && backgroundTime.current) {
        const awayMs = Date.now() - backgroundTime.current;
        const awayMin = awayMs / 1000 / 60;
        backgroundTime.current = null;

        if (!isSecured) return;

        if (biometricEnabled && !pinEnabled) {
          // Biometric-only: lock immediately whenever coming back from background
          lock('biometric');
        } else if (autoTimeout > 0 && awayMin >= autoTimeout) {
          // PIN (or PIN+bio): lock after configured timeout
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
