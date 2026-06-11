import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY   = 'recently_viewed_tours';
const LIMIT = 50;

export const useRecentlyViewed = () => {
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(raw => {
      if (raw) setRecent(JSON.parse(raw));
    }).catch(() => {});
  }, []);

  const addViewed = useCallback(async (tour) => {
    if (!tour?._id) return;
    const item = {
      _id:         String(tour._id),
      title:       tour.title,
      destination: tour.destination,
      source:      tour.source,
      price:       tour.price,
      tourType:    tour.tourType,
      images:      tour.images,
      startDate:   tour.startDate,
      endDate:     tour.endDate,
      viewedAt:    new Date().toISOString(),
    };

    setRecent(prev => {
      const filtered = prev.filter(r => r._id !== item._id);
      const next     = [item, ...filtered].slice(0, LIMIT);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearRecent = useCallback(async () => {
    await AsyncStorage.removeItem(KEY);
    setRecent([]);
  }, []);

  const removeOne = useCallback(async (id) => {
    setRecent(prev => {
      const next = prev.filter(r => r._id !== String(id));
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { recent, addViewed, clearRecent, removeOne };
};
