import type { ReactNode } from 'react';

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-pitch-900 p-8 text-center">
      <h3 className="text-lg font-black text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/60">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
