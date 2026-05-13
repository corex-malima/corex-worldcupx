import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-pitch-950/80 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-white/10 bg-pitch-900 p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-xl font-black text-white">{title}</h3>
          <Button variant="ghost" onClick={onClose} aria-label="Cerrar" icon={<X size={18} />} />
        </div>
        {children}
      </div>
    </div>
  );
}
