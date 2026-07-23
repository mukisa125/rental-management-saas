import { AlertTriangle } from 'lucide-react';

export default function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5" />
        <div className="space-y-2">
          <h3 className="text-sm font-bold">Unable to load documents</h3>
          <p className="text-sm">{message}</p>
          {onRetry ? (
            <button onClick={onRetry} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">
              Retry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
