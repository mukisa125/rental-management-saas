import { CheckCircle2 } from 'lucide-react';

export default function SuccessToast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 right-4 z-40 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm">
      <span className="inline-flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" />
        {message}
      </span>
    </div>
  );
}
