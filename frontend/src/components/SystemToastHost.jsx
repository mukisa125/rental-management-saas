import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { toastEventName } from '../utils/toast';

export default function SystemToastHost() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      const payload = event?.detail || {};
      setToast({
        message: payload.message || 'Settings saved successfully',
        type: payload.type === 'error' ? 'error' : 'success'
      });
    };
    window.addEventListener(toastEventName, handler);
    return () => window.removeEventListener(toastEventName, handler);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const error = toast.type === 'error';
  return (
    <div
      role="alert"
      className={`fixed left-1/2 top-5 z-[80] w-[min(92vw,680px)] -translate-x-1/2 rounded-xl border-2 px-5 py-4 text-base font-bold shadow-lg ${error ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-emerald-300 bg-emerald-50 text-emerald-700'}`}
    >
      <span className="inline-flex items-center gap-2">
        {error ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
        {toast.message}
      </span>
    </div>
  );
}
