import { useEffect, useRef, useCallback } from 'react';
import { AppState, PanResponder } from 'react-native';

export const useAutoLogout = ({ timeoutMinutes = 30, onLogout, enabled = true }) => {
  const timerRef    = useRef(null);
  const lastActive  = useRef(Date.now());
  const timeoutMs   = timeoutMinutes * 60 * 1000;

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    lastActive.current = Date.now();
    clearTimer();
    if (enabled && timeoutMinutes > 0) {
      timerRef.current = setTimeout(() => {
        onLogout?.();
      }, timeoutMs);
    }
  }, [enabled, timeoutMinutes, timeoutMs, onLogout, clearTimer]);

  // Watch AppState for background → foreground transitions
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const away = Date.now() - lastActive.current;
        if (away >= timeoutMs) {
          clearTimer();
          onLogout?.();
        } else {
          resetTimer();
        }
      } else {
        lastActive.current = Date.now();
        clearTimer();
      }
    });
    resetTimer();
    return () => { sub.remove(); clearTimer(); };
  }, [enabled, timeoutMs, onLogout, resetTimer, clearTimer]);

  // PanResponder intercepts all touches to reset timer
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        resetTimer();
        return false;
      },
    })
  ).current;

  return { resetTimer, panHandlers: panResponder.panHandlers };
};
