import { useState, useEffect, useCallback } from "react";
import { feedback as feedbackApi } from "../api";

export function usePublicFeedback({ limit = 10, showAll = false } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await feedbackApi.public(limit, showAll);
      setData(res?.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [limit, showAll]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
