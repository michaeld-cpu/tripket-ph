"use client";
import { useEffect } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  /** Stacking layer. Bump for a modal that opens on top of another modal so
   *  its backdrop fully covers the one beneath. */
  layer?: "base" | "top";
};

export default function Modal({ open, onClose, children, maxWidth = "max-w-xl", layer = "base" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={`fixed inset-0 ${layer === "top" ? "z-[90]" : "z-[80]"} flex items-center justify-center p-4`}>
      <div
        className={`absolute inset-0 animate-backdrop ${layer === "top" ? "bg-black/40" : "bg-black/30"}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`animate-modal relative w-full ${maxWidth} max-h-[90vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.18)]`}
      >
        {children}
      </div>
    </div>
  );
}
