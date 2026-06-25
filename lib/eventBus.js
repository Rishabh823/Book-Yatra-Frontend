// Cross-platform event bus — works on React Native AND web (unlike DeviceEventEmitter)
const _listeners = {};

export const eventBus = {
  emit(event, data) {
    (_listeners[event] || []).forEach((fn) => {
      try {
        fn(data);
      } catch {}
    });
  },
  /** Returns an unsubscribe function */
  on(event, fn) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(fn);
    return () => {
      _listeners[event] = (_listeners[event] || []).filter((l) => l !== fn);
    };
  },
};
