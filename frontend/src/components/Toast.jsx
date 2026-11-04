import { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export default function Toast({ type = 'success', message, onClose, duration = 3500 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;

  const Icon = type === 'success' ? CheckCircle2 : XCircle;
  const color = type === 'success'
    ? 'bg-green-50 text-green-800 border-green-200'
    : 'bg-red-50 text-red-800 border-red-200';

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-start gap-2 border rounded-lg shadow-lg px-4 py-3 max-w-sm ${color}`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}