import type { ReactNode } from 'react';

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-corex-ink/15 bg-pitch-900 p-8 text-center">
      <h3 className="text-lg font-semibold text-corex-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-corex-ink/60">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
