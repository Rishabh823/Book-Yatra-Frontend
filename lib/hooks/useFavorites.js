import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';

const CACHE_KEY = 'fav_ids_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useFavorites = ({ autoLoad = true } = {}) => {
  const [favIds,   setFavIds]   = useState(new Set());
  const [loading,  setLoading]  = useState(false);
  const lastFetch = useRef(0);

  const loadFromCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { ids, ts } = JSON.parse(cached);
        setFavIds(new Set(ids));
        return Date.now() - ts < CACHE_TTL; // true = cache still fresh
      }
    } catch {}
    return false;
  }, []);

  const loadIds = useCallback(async (force = false) => {
    // Rate-limit: don't refetch within 30s
    if (!force && Date.now() - lastFetch.current < 30_000) return;
    const cacheHit = await loadFromCache();
    if (cacheHit && !force) return;

    setLoading(true);
    try {
      const res = await api.get('/preferences/favorites/ids');
      const ids = res?.ids || [];
      setFavIds(new Set(ids));
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ids, ts: Date.now() }));
      lastFetch.current = Date.now();
    } catch {}
    setLoading(false);
  }, [loadFromCache]);

  useEffect(() => { if (autoLoad) loadIds(); }, [autoLoad, loadIds]);

  const toggle = useCallback(async (tourId) => {
    const id = String(tourId);
    const wasFav = favIds.has(id);

    // Optimistic update
    setFavIds(prev => {
      const next = new Set(prev);
      if (wasFav) next.delete(id); else next.add(id);
      return next;
    });

    try {
      if (wasFav) {
        await api.del(`/preferences/favorites/${id}`);
      } else {
        await api.post(`/preferences/favorites/${id}`, {});
      }
      // Bust cache
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch {
      // Revert on failure
      setFavIds(prev => {
        const next = new Set(prev);
        if (wasFav) next.add(id); else next.delete(id);
        return next;
      });
    }
  }, [favIds]);

  const isFav = useCallback((tourId) => favIds.has(String(tourId)), [favIds]);

  return { favIds, isFav, toggle, loading, reload: () => loadIds(true) };
};
