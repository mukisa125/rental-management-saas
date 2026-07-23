import { ArrowUpRight } from 'lucide-react';
import EmptyState from '../EmptyState';
import Pagination from '../Pagination';

export default function ReportTable({ columns, rows, page, limit, onPageChange, onRowAction }) {
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeRows = Array.isArray(rows) ? rows : [];

  const total = safeRows.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const offset = (currentPage - 1) * limit;
  const pageRows = safeRows.slice(offset, offset + limit);

  if (!total) {
    return <EmptyState title="No records found" description="No records match the selected report filters." />;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              {safeColumns.map((column) => {
                const isActionColumn = column.key === 'actions';
                return (
                  <th
                    key={column.key}
                    className={`whitespace-nowrap px-4 py-3 ${
                      isActionColumn
                        ? 'sticky right-0 z-10 min-w-[180px] bg-slate-50 text-right shadow-[-14px_0_20px_-22px_rgba(15,23,42,0.9)]'
                        : column.align === 'right'
                          ? 'text-right'
                          : 'text-left'
                    }`}
                  >
                    {column.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, rowIndex) => (
              <tr key={row.id || `${rowIndex}-${row.reference || 'row'}`} className="border-t border-slate-100">
                {safeColumns.map((column) => {
                  const isActionColumn = column.key === 'actions';
                  return (
                    <td
                      key={`${row.id || rowIndex}-${column.key}`}
                      className={`px-4 py-3 text-slate-700 ${
                        isActionColumn
                          ? 'sticky right-0 z-[1] min-w-[180px] bg-white text-right shadow-[-14px_0_20px_-22px_rgba(15,23,42,0.9)]'
                          : column.align === 'right'
                            ? 'text-right'
                            : 'text-left'
                      }`}
                    >
                      {isActionColumn ? (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => onRowAction?.(row, column.actionLabel || 'View')}
                            className="inline-flex min-w-[118px] items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            aria-label={`${column.actionLabel || 'View'} report row details`}
                          >
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                            <span>{column.actionLabel || 'View'}</span>
                          </button>
                        </div>
                      ) : typeof column.render === 'function' ? column.render(row) : (row[column.key] ?? '-')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="border-t border-slate-100 px-4 py-3">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPage={onPageChange}
          />
        </div>
      )}
    </section>
  );
}
