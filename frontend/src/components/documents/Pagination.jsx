const pageSizes = [10, 25, 50, 100];

export default function Pagination({ page, pages, total, limit, onPageChange, onLimitChange }) {
  const currentPage = page || 1;
  const totalPages = pages || 1;
  const currentLimit = limit || 25;
  const from = total > 0 ? ((currentPage - 1) * currentLimit) + 1 : 0;
  const to = total > 0 ? Math.min(currentPage * currentLimit, total) : 0;

  const pageWindow = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let index = start; index <= end; index += 1) pageWindow.push(index);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium text-slate-600">Showing {from} to {to} of {total || 0} documents</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
          Rows
          <select
            value={currentLimit}
            onChange={(event) => onLimitChange?.(Number(event.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
          >
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>

        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        {pageWindow.map((pageNumber) => (
          <button
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${pageNumber === currentPage ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
          >
            {pageNumber}
          </button>
        ))}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
