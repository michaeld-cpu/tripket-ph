"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import ShippingLineSwitcher from "./ShippingLineSwitcher";

type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

const sampleNotifications: Notification[] = [
  { id: "n1", title: "New booking confirmed",  body: "TKT-50019 · Marco Villanueva booked MV Palawan Breeze",   time: "2m ago",  unread: true  },
  { id: "n2", title: "Pending bookings", body: "3 bookings have been pending for more than 1 hour",       time: "18m ago", unread: true  },
  { id: "n3", title: "Vessel back in service", body: "MV Maligaya completed maintenance — now Active",          time: "1h ago",  unread: true  },
];

export default function Topbar() {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Click-outside / Esc for notifications popover
  useEffect(() => {
    if (!notifOpen) return;
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setNotifOpen(false); }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [notifOpen]);

  const unreadCount = sampleNotifications.filter(n => n.unread).length;

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-slate-200/70 bg-white px-6">
      <div className="flex items-center gap-3 text-sm">
        <ShippingLineSwitcher />
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-1" ref={notifRef}>
        <button
          aria-label="Notifications"
          onClick={() => setNotifOpen(o => !o)}
          className={`relative grid h-9 w-9 place-items-center rounded-full transition-[background-color,transform] duration-150 ease-out active:scale-90 ${
            notifOpen ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
            <path d="M10 19a2 2 0 0 0 4 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
          )}
        </button>

        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.8 }}
              style={{ transformOrigin: "top right" }}
              className="absolute right-6 top-14 z-40 mt-2 w-[360px] overflow-hidden rounded-xl bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.2)] ring-1 ring-slate-200/70"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button className="text-[11px] font-medium text-brand-700 transition-[opacity,transform] duration-150 ease-out hover:opacity-80 active:scale-95">
                  Mark all read
                </button>
              </div>

              {/* List */}
              <div className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto">
                {sampleNotifications.map(n => (
                  <button
                    key={n.id}
                    className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-[background-color] duration-150 ease-out hover:bg-slate-50"
                  >
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.unread ? "bg-brand-500" : "bg-transparent"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-[12px] font-medium text-slate-900">{n.title}</div>
                        <span className="shrink-0 text-[10px] text-slate-400 tabular-nums">{n.time}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] leading-snug text-slate-500 line-clamp-2">{n.body}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 px-4 py-2.5 text-center">
                <button className="text-[12px] font-medium text-slate-700 transition-colors duration-150 ease-out hover:text-slate-900">
                  View all notifications
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
