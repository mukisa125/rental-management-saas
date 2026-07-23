import { Eye, Download, Printer, RefreshCcw, Trash2, FileText, FileImage, FileType2 } from 'lucide-react';
import DocumentStatusBadge from './DocumentStatusBadge';
import DocumentCategoryBadge from './DocumentCategoryBadge';
import EmptyState from './EmptyState';
import Pagination from './Pagination';
import {
  formatDate,
  getDocumentName,
  getDocumentStatus,
  getFileSize,
  getFileType,
  getOriginalFileName,
  getPropertyUnitText,
  getRelatedText,
  getTenantName,
  inferFileKind
} from './documentUtils';

const fileTypeBadgeClass = {
  PDF: 'bg-rose-50 text-rose-700 border-rose-200',
  JPG: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PNG: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WEBP: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DOCX: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DOC: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  FILE: 'bg-slate-100 text-slate-700 border-slate-200'
};

const TypeIcon = ({ kind }) => {
  if (kind === 'image') return <FileImage className="h-4 w-4" />;
  if (kind === 'word') return <FileType2 className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
};

const ActionButton = ({ title, onClick, tone = 'blue', children }) => (
  <button
    title={title}
    onClick={onClick}
    className={`inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 ${tone === 'red' ? 'text-red-600 hover:bg-red-50' : 'text-blue-600 hover:bg-slate-50'}`}
  >
    {children}
  </button>
);

export default function DocumentTable({
  documents,
  selectedId,
  onSelect,
  onPreview,
  onDownload,
  onPrint,
  onReplace,
  onDelete,
  pagination,
  onPageChange,
  onLimitChange,
  onOpenUpload
}) {
  const rows = documents || [];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden md:block">
        <div className="max-h-[68vh] overflow-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Document</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Category</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Related To</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Property / Unit</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Tenant</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">File</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Created</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((document) => {
              const active = selectedId === document._id;
              const fileType = getFileType(document);
              const fileKind = inferFileKind(document);
              const created = formatDate(document?.createdAt);
              const propertyUnit = getPropertyUnitText(document);
              const showPrint = fileType === 'PDF';

              return (
                <tr
                  key={document._id}
                  onClick={() => onSelect(document)}
                  className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${active ? 'bg-blue-50' : ''}`}
                >
                  <td className={`px-4 py-3 ${active ? 'border-l-4 border-blue-600 pl-3' : ''}`}>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 rounded-md bg-slate-100 p-1.5 text-slate-600"><TypeIcon kind={fileKind} /></span>
                      <div>
                        <p className="font-semibold text-slate-900">{getDocumentName(document)}</p>
                        <p className="text-xs text-slate-500">{getOriginalFileName(document)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><DocumentCategoryBadge category={document.category} /></td>
                  <td className="px-4 py-3 text-slate-700">{getRelatedText(document)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <p className="font-medium text-slate-800">{propertyUnit.propertyName}</p>
                    <p className="text-xs text-slate-500">{propertyUnit.unitLabel}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{getTenantName(document)}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${fileTypeBadgeClass[fileType] || fileTypeBadgeClass.FILE}`}>{fileType}</span>
                      <p className="text-xs text-slate-500">{getFileSize(document)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <p className="font-medium">{created.date}</p>
                    <p className="text-xs text-slate-500">{created.time}</p>
                  </td>
                  <td className="px-4 py-3"><DocumentStatusBadge status={getDocumentStatus(document)} /></td>
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    <div className="flex flex-wrap gap-1">
                      <ActionButton title="Preview" onClick={() => onPreview(document)}><Eye className="h-4 w-4" /></ActionButton>
                      <ActionButton title="Download" onClick={() => onDownload(document)}><Download className="h-4 w-4" /></ActionButton>
                      {showPrint ? <ActionButton title="Print" onClick={() => onPrint(document)}><Printer className="h-4 w-4" /></ActionButton> : null}
                      <ActionButton title="Replace" onClick={() => onReplace(document)}><RefreshCcw className="h-4 w-4" /></ActionButton>
                      <ActionButton title="Delete" tone="red" onClick={() => onDelete(document)}><Trash2 className="h-4 w-4" /></ActionButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
        {rows.map((document) => {
          const fileType = getFileType(document);
          const created = formatDate(document.createdAt);
          const propertyUnit = getPropertyUnitText(document);
          const active = selectedId === document._id;

          return (
            <button
              key={document._id}
              onClick={() => onSelect(document)}
              className={`rounded-xl border p-3 text-left ${active ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{getDocumentName(document)}</p>
                  <p className="text-xs text-slate-500">{getOriginalFileName(document)}</p>
                </div>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${fileTypeBadgeClass[fileType] || fileTypeBadgeClass.FILE}`}>{fileType}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <p>{propertyUnit.propertyName}</p>
                <p>{getTenantName(document)}</p>
                <p>{created.date}</p>
                <p>{getFileSize(document)}</p>
              </div>
            </button>
          );
        })}
      </div>

      {!rows.length ? <EmptyState onUpload={onOpenUpload} /> : null}
      {rows.length ? (
        <Pagination
          page={pagination?.page || 1}
          pages={pagination?.pages || 1}
          total={pagination?.total || 0}
          limit={pagination?.limit || 25}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
        />
      ) : null}
    </div>
  );
}
