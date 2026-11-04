import { AlertTriangle, LogOut, X } from 'lucide-react';

export default function ConfirmModal({
  open,
  title = 'Konfirmasi',
  message = 'Apakah Anda yakin?',
  confirmText = 'Ya',
  cancelText = 'Batal',
  danger = false,
  loading = false,
  icon: Icon = AlertTriangle,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              danger
                ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-glow'
                : 'bg-gradient-to-br from-primary-500 to-accent-500 shadow-glow'
            }`}
          >
            <Icon className="w-6 h-6 text-white" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors -mt-1 -mr-1 p-1"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary text-sm"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`text-sm font-semibold px-4 py-2.5 rounded-xl text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
              danger
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-soft hover:shadow-lg'
                : 'bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 shadow-soft hover:shadow-glow'
            }`}
          >
            {loading ? 'Memproses...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}