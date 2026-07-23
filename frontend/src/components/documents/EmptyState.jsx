import { FolderOpen, Upload } from 'lucide-react';

export default function EmptyState({ onUpload }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <FolderOpen className="h-7 w-7" />
      </span>
      <h3 className="text-lg font-black text-slate-900">No documents found</h3>
      <p className="max-w-xl text-sm text-slate-500">
        Generated and uploaded documents will appear here. Documents are also created automatically from payments, tenants, properties, units, maintenance, and reports.
      </p>
      <button onClick={onUpload} className="mt-1 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
        <Upload className="h-4 w-4" />
        Upload Document
      </button>
    </div>
  );
}
