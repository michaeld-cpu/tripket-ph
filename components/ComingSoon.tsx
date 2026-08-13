"use client";

/**
 * ComingSoon — placeholder for a route that's navigable but not built yet.
 *
 * Deliberately quiet: a single centred mark, a heading, and one line of copy.
 * No skeleton rows or fake chrome, which would read as "still loading" and
 * leave an operator waiting for something that isn't coming.
 */
export default function ComingSoon({
  title = "Coming Soon",
  message = "This feature is coming soon. Stay tuned!",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6 py-16">
      <div className="flex flex-col items-center text-center">
        <span
          aria-hidden
          className="grid h-[72px] w-[72px] place-items-center rounded-full bg-brand-50 text-brand-500"
        >
          {/* Clock with a dashed arc — reads as "in progress" rather than an
              error or an empty state. */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-9 w-9"
          >
            <path d="M12 7v5l3 2" />
            <path d="M21 12a9 9 0 1 1-6.2-8.6" strokeDasharray="2.5 3" />
            <path d="M21 12a9 9 0 0 0-3.5-7.1" />
          </svg>
        </span>

        <h2 className="mt-5 text-[26px] font-semibold tracking-tight text-slate-600">
          {title}
        </h2>
        <p className="mt-1.5 text-[17px] text-slate-400">{message}</p>
      </div>
    </div>
  );
}
