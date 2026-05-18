import { APP_VERSION, BRAND, COMPANY, SIGNATURE } from '../../lib/constants';
import { CoreXSymbol } from '../brand/WorldCupXMark';

export function Footer() {
  return (
    <footer className="border-t border-corex-ink/5 bg-corex-paper/95">
      <div className="mx-auto flex w-full max-w-[1720px] flex-wrap items-center justify-between gap-2 px-3 py-3 text-[11px] uppercase tracking-[0.22em] text-corex-ink/35 sm:px-4 lg:px-6 xl:px-8">
        <span className="flex items-center gap-2">
          <CoreXSymbol size={14} className="text-corex-ink/45" />
          <span className="font-black text-corex-ink/55">{BRAND}</span>
          <span aria-hidden>·</span>
          <span>{SIGNATURE}</span>
          <span aria-hidden>·</span>
          <span>{COMPANY}</span>
        </span>
        <span className="font-mono normal-case tracking-normal">v{APP_VERSION}</span>
      </div>
    </footer>
  );
}
