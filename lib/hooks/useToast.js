import { useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast(t => ({ ...t, visible: false }));
  return { toast, showToast, hideToast };
}
