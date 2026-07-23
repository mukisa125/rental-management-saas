import { Download, FileDown, Printer } from 'lucide-react';

export default function ExportButtons({ onExportPdf, onExportExcel, onPrint }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onExportPdf}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <FileDown className="h-4 w-4" />
        Export PDF
      </button>
      <button
        type="button"
        onClick={onExportExcel}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Download className="h-4 w-4" />
        Export Excel
      </button>
      <button
        type="button"
        onClick={onPrint}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Printer className="h-4 w-4" />
        Print
      </button>
    </div>
  );
}
