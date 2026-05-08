import { CheckCircle2, AlertTriangle } from 'lucide-react';

export function Toast({ message, type = 'success' }: { message: string; type?: 'success' | 'error' }) {
  const Icon = type === 'success' ? CheckCircle2 : AlertTriangle;
  return (
    <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/10 bg-pitch-900 px-4 py-3 text-sm font-bold text-white shadow-2xl">
      <Icon size={18} className={type === 'success' ? 'text-cup-green' : 'text-cup-red'} />
      {message}
    </div>
  );
}
