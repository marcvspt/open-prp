import { useEffect, useRef } from "react";

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function FormModal({ open, onClose, title, children }: FormModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={overlayRef} class="fixed inset-0 z-50 flex items-center justify-center bg-overlay" onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div class="bg-panel rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 class="text-lg font-semibold text-text">{title}</h2>
          <button onClick={onClose} class="text-text-muted hover:text-text text-xl leading-none">&times;</button>
        </div>
        <div class="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
