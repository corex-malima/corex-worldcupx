import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface InfoButtonProps {
  /** Título corto del popover (ej: "Cómo funciona el ranking"). */
  title: string;
  /** Contenido del popover. Acepta string, JSX o array de bloques. */
  children: ReactNode;
  /** Tamaño del botón. Default 14px. */
  size?: number;
  /** Label accesible. Default "Más información". */
  ariaLabel?: string;
  /** Clase opcional para reposicionar el botón inline. */
  className?: string;
}

/**
 * Botón circular "i" discreto que abre un popover/modal flotante con
 * instrucciones contextuales del módulo. Usado junto a títulos y secciones
 * para que el colaborador o admin pueda recordar cómo funciona algo sin
 * salir de la pantalla y sin abrir el manual.
 *
 * Diseño: 18×18px, rosa Loriva, hover suave. Cierre con click afuera,
 * tecla Escape o botón ×. En mobile cae al centro de la pantalla como
 * modal, en desktop flota cerca del botón.
 */
export function InfoButton({ title, children, size = 14, ariaLabel = 'Más información', className = '' }: InfoButtonProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Cierre con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Click fuera
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!popoverRef.current || !buttonRef.current) return;
      if (popoverRef.current.contains(e.target as Node)) return;
      if (buttonRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    // Defer para que el click que abrió no lo cierre
    const t = window.setTimeout(() => window.addEventListener('mousedown', onClick), 10);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <span className={`relative inline-flex items-center align-middle ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-full border border-corex-signal/30 bg-corex-signalFog/60 text-corex-signal transition hover:border-corex-signal hover:bg-corex-signalMist hover:text-corex-signal focus:outline-none focus:ring-2 focus:ring-corex-signal/40"
        style={{ width: size + 4, height: size + 4 }}
      >
        <span className="font-serif italic font-bold leading-none" style={{ fontSize: size - 2 }}>i</span>
      </button>

      {open && (
        <>
          {/* Backdrop solo móvil */}
          <div className="fixed inset-0 z-40 bg-corex-ink/30 backdrop-blur-sm sm:hidden" aria-hidden="true" />

          {/* Popover */}
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={title}
            className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-corex-ink/10 bg-corex-white p-4 shadow-xl sm:absolute sm:left-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[340px] sm:translate-x-0 sm:translate-y-0"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h4 className="text-sm font-bold text-corex-ink">{title}</h4>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
                className="rounded-full p-0.5 text-corex-slate transition hover:bg-corex-paper hover:text-corex-ink"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-2 text-[13px] leading-relaxed text-corex-slate [&_strong]:font-semibold [&_strong]:text-corex-ink [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-1 [&_a]:text-corex-signal [&_a]:underline">
              {children}
            </div>
          </div>
        </>
      )}
    </span>
  );
}
