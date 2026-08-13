"use client";

/**
 * Pagination — the shared footer pager for table views.
 *
 * Anatomy:
 *  ┌──────────────────────────────────────────────────────────────────────────┐
 *  │  Showing 1–10 of 42 routes    Per page 10 ▾    ‹ Previous 1 2 … 5 Next › │
 *  └──────────────────────────────────────────────────────────────────────────┘
 *
 * The left side shows a "Showing N–M of T <noun>" summary in mono-tabular nums so
 * the digits stay aligned as the user moves through pages. The centre holds an
 * optional rows-per-page selector, the right Previous / numbered page chips
 * (with ellipses for long ranges) / Next.
 *
 * Usage:
 *   <Pagination
 *     page={page}
 *     pageSize={pageSize}
 *     total={filtered.length}
 *     onPageChange={setPage}
 *     onPageSizeChange={setPageSize}
 *     noun="routes"
 *   />
 *
 * Visual language matches the rest of the page — bordered slate-200 chips, brand
 * orange for the active page, hairline-divided footer. This footer carries the
 * only running count on a table view, so it always renders; only the paging
 * controls collapse when everything fits on one page.
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  noun = "items",
  className = "",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
  /** Supply to render the "Per page" selector. Omit to keep the pager as-is. */
  onPageSizeChange?: (next: number) => void;
  /** Singular/plural noun rendered after the count — e.g. "routes", "vessels". */
  noun?: string;
  /** Extra classes (e.g. to override the default rounded-b-2xl border-t). */
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // The footer now carries the only running count on the page, so it renders
  // even at one page — hiding it would drop the count entirely. The paging
  // controls still collapse, since there is nowhere to navigate.
  const showPager = totalPages > 1;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const go = (n: number) => {
    const clamped = Math.min(totalPages, Math.max(1, n));
    if (clamped !== page) onPageChange(clamped);
  };

  return (
    <div
      className={
        "flex items-center justify-between rounded-b-2xl border-t border-slate-100 px-5 py-3 " +
        className
      }
    >
      {/* Left — running count */}
      <span className="text-[12px] text-slate-500">
        Showing{" "}
        <span className="font-mono tabular-nums text-slate-700">{from}</span>
        <span className="mx-0.5">–</span>
        <span className="font-mono tabular-nums text-slate-700">{to}</span>{" "}
        of <span className="font-mono tabular-nums text-slate-700">{total}</span> {noun}
      </span>

      {/* Centre — rows per page */}
      {onPageSizeChange && (
        <label className="flex items-center gap-2 text-[12px] text-slate-500">
          <span>Per page</span>
          <select
            value={pageSize}
            onChange={(e) => {
              // Jump back to page 1 — the current page may not exist at the
              // new size, and the first rows are what the user expects to see.
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="h-7 rounded-lg border border-slate-200 bg-white px-2 font-mono text-[12px] tabular-nums text-slate-700 transition-colors hover:bg-slate-50 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      )}

      {/* Right — paging controls */}
      {showPager && (
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <PageButton
          onClick={() => go(page - 1)}
          disabled={page === 1}
          ariaLabel="Previous page"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span>Previous</span>
        </PageButton>

        {/* Numbered page chips with smart truncation */}
        <ul className="mx-1 flex items-center gap-1">
          {buildPageList(page, totalPages).map((token, i) =>
            token === "…" ? (
              <li key={`gap-${i}`} className="px-1 text-[12px] text-slate-400">…</li>
            ) : (
              <li key={token}>
                <button
                  type="button"
                  onClick={() => go(token)}
                  aria-label={`Go to page ${token}`}
                  aria-current={token === page ? "page" : undefined}
                  className={
                    "grid h-7 min-w-[28px] place-items-center rounded-lg px-2 font-mono text-[12px] tabular-nums " +
                    "transition-colors duration-150 ease-out " +
                    (token === page
                      ? "bg-brand-500 text-white shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
                  }
                >
                  {token}
                </button>
              </li>
            ),
          )}
        </ul>

        <PageButton
          onClick={() => go(page + 1)}
          disabled={page === totalPages}
          ariaLabel="Next page"
        >
          <span>Next</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </PageButton>
      </nav>
      )}
    </div>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={
        "inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 " +
        "transition-colors duration-150 ease-out hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      }
    >
      {children}
    </button>
  );
}

/**
 * Build the visible page tokens for the numbered chips, e.g.
 *   total=12, page=1  → [1, 2, 3, 4, 5, "…", 12]
 *   total=12, page=6  → [1, "…", 5, 6, 7, "…", 12]
 *   total=12, page=12 → [1, "…", 8, 9, 10, 11, 12]
 *   total=5,  page=3  → [1, 2, 3, 4, 5]
 * Always shows first + last; uses "…" sentinels to keep the strip compact.
 */
function buildPageList(page: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: Array<number | "…"> = [1];
  const left = Math.max(2, page - 1);
  const right = Math.min(total - 1, page + 1);
  if (left > 2) out.push("…");
  for (let i = left; i <= right; i++) out.push(i);
  if (right < total - 1) out.push("…");
  out.push(total);
  return out;
}
