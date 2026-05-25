import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

interface PopoverPos {
  top: number;
  left: number;
  width: number;
}

const POPOVER_WIDTH = 340;
const POPOVER_GAP = 8;
const VIEWPORT_PADDING = 12;

/**
 * Botón circular "i" discreto que abre un popover/modal flotante con
 * instrucciones contextuales del módulo. Usado junto a títulos y secciones
 * para que el colaborador o admin pueda recordar cómo funciona algo sin
 * salir de la pantalla y sin abrir el manual.
 *
 * Diseño: 18×18px, rosa Loriva, hover suave. Cierre con click afuera,
 * tecla Escape o botón ×. El popover se renderiza vía portal a document.body
 * con position:fixed para evitar clipping por overflow:hidden/auto de
 * contenedores ancestros (típico en barras de tabs).
 *
 * En mobile (<640px) cae al centro de la pantalla como modal con backdrop.
 */
export function InfoButton({ title, children, size = 14, ariaLabel = 'Más información', className = '' }: InfoButtonProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 639px)').matches;
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDialogElement>(null);

  // Detecta viewport para alternar entre modal centrado (móvil) y popover anclado (desktop).
  // La inicialización de isMobile ya ocurre en el useState lazy initializer arriba;
  // este effect solo suscribe al listener de cambios de viewport.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Calcula la posición del popover desde el rect del botón cada vez que se abre,
  // o si el usuario hace scroll/resize mientras está abierto.
  useLayoutEffect(() => {
    if (!open || isMobile) return;
    let raf = 0;
    function compute() {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.min(POPOVER_WIDTH, vw - VIEWPORT_PADDING * 2);
      // Alineación horizontal: por defecto el borde derecho del popover se
      // alinea con el borde derecho del botón; si se sale por la izquierda
      // del viewport, lo desplazamos hacia adentro.
      let left = rect.right - width;
      if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;
      if (left + width > vw - VIEWPORT_PADDING) left = vw - VIEWPORT_PADDING - width;

      // Verticalmente debajo del botón; si no cabe abajo, lo ponemos arriba.
      let top = rect.bottom + POPOVER_GAP;
      const popH = popoverRef.current?.offsetHeight ?? 220;
      if (top + popH > vh - VIEWPORT_PADDING) {
        const above = rect.top - POPOVER_GAP - popH;
        top = above > VIEWPORT_PADDING ? above : VIEWPORT_PADDING;
      }
      setPos({ top, left, width });
    }
    // Doble cálculo: inmediato + después del primer paint con rAF para que
    // popH sea el real (después de medir el DOM ya renderizado).
    compute();
    raf = window.requestAnimationFrame(compute);
    const onScrollResize = () => compute();
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
    };
  }, [open, isMobile]);

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
    const t = window.setTimeout(() => window.addEventListener('mousedown', onClick), 10);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const popover = open && (
    <>
      {isMobile && <div className="fixed inset-0 z-[9998] bg-corex-ink/30 backdrop-blur-sm" aria-hidden="true" />}
      <dialog
        ref={popoverRef}
        open
        aria-label={title}
        className={
          isMobile
            ? 'fixed left-1/2 top-1/2 z-[9999] m-0 w-[min(92vw,360px)] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-corex-ink/10 bg-corex-white p-4 shadow-xl'
            : 'fixed z-[9999] m-0 max-h-none max-w-none rounded-2xl border border-corex-ink/10 bg-corex-white p-4 shadow-xl'
        }
        style={isMobile ? undefined : (pos ? { top: pos.top, left: pos.left, width: pos.width } : { visibility: 'hidden' })}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-corex-ink">{title}</h4>
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
      </dialog>
    </>
  );

  return (
    <span className={`inline-flex items-center align-middle ${className}`}>
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
      {popover && createPortal(popover, document.body)}
    </span>
  );
}
