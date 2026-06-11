import { useState, useEffect, useCallback } from 'react';
import { members as membersApi } from '../api';

export function useMembers(status = 'approved') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await membersApi.list(status);
      setData(Array.isArray(res) ? res : (res?.data || []));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refetch: load };
}
