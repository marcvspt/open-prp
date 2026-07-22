interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function FormModal({ open, onClose, title, children }: FormModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay">
      <div className="bg-panel rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
