import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Cpu, Wifi, WifiOff, Thermometer, Droplets,
  Edit3, Trash2, RefreshCw, KeyRound, AlertTriangle, Copy, Check, Loader2, Save, X,
} from 'lucide-react';
import { deviceService } from '../services/deviceService';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

export default function DeviceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [device, setDevice]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState(null);

  // edit inline
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ device_name: '', description: '', location: '' });
  const [saving, setSaving]   = useState(false);

  // delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // regenerate token
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [newToken, setNewToken] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = await deviceService.detail(id);
      setDevice(data);
      setEditForm({
        device_name: data.device_name || '',
        description: data.description || '',
        location: data.location || '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat detail perangkat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  // =============== EDIT ===============
  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await deviceService.update(id, editForm);
      setDevice(prev => ({ ...prev, ...updated }));
      setEditing(false);
      setToast({ type: 'success', message: 'Perangkat diperbarui' });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Gagal menyimpan' });
    } finally {
      setSaving(false);
    }
  };

  // =============== DELETE ===============
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deviceService.remove(id);
      navigate('/devices', { replace: true });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Gagal menghapus' });
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  // =============== REGENERATE TOKEN ===============
  const handleRegen = async () => {
    setRegenLoading(true);
    try {
      const data = await deviceService.regenerateToken(id);
      setNewToken(data.device_token);
      setConfirmRegen(false);
      setToast({ type: 'success', message: 'Token baru berhasil dibuat' });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Gagal regenerate token' });
    } finally {
      setRegenLoading(false);
    }
  };

  const copyNewToken = async () => {
    try {
      await navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast({ type: 'error', message: 'Gagal copy, salin manual' });
    }
  };

  // =============== RENDER ===============
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card animate-pulse h-40 bg-gray-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 text-red-700 text-sm p-4 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" /> {error}
        </div>
        <Link to="/devices" className="btn-secondary inline-flex items-center gap-1 mt-4 text-sm">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
      </div>
    );
  }

  const online = device.status === 'online';
  const latest = device.latest;

  const soilStatus = latest
    ? (Number(latest.soil_moisture) < device.minimum_soil_moisture ? 'Kering'
       : Number(latest.soil_moisture) >= device.maximum_soil_moisture ? 'Basah'
       : 'Cukup')
    : '--';

  return (
    <div className="max-w-3xl mx-auto">
      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />

      <Link to="/devices" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Kembali ke My Devices
      </Link>

      {/* ====== HEADER ====== */}
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Cpu className="w-5 h-5 text-primary-600" />
            </div>
            <div className="min-w-0">
              {editing ? (
                <input
                  type="text"
                  value={editForm.device_name}
                  onChange={(e) => setEditForm({ ...editForm, device_name: e.target.value })}
                  className="input-field text-lg font-semibold"
                />
              ) : (
                <h1 className="text-xl font-bold text-gray-800 truncate">{device.device_name}</h1>
              )}
              <p className="text-xs text-gray-500 mt-0.5 font-mono">{device.device_uid}</p>
            </div>
          </div>

          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full whitespace-nowrap ${online ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {online ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Edit form */}
        {editing ? (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Deskripsi</label>
              <textarea
                rows={2}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="input-field resize-none mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Lokasi</label>
              <input
                type="text"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                className="input-field mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditing(false);
                  setEditForm({
                    device_name: device.device_name,
                    description: device.description || '',
                    location: device.location || '',
                  });
                }}
                className="btn-secondary text-sm flex items-center gap-1"
              >
                <X className="w-4 h-4" /> Batal
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-3 text-sm text-gray-600 space-y-1">
              <div><span className="text-gray-400">Deskripsi: </span>{device.description || '-'}</div>
              <div><span className="text-gray-400">Lokasi: </span>{device.location || '-'}</div>
              <div><span className="text-gray-400">Paired: </span>{device.paired_at ? new Date(device.paired_at).toLocaleString('id-ID') : '-'}</div>
              <div><span className="text-gray-400">Last seen: </span>{device.last_seen ? new Date(device.last_seen).toLocaleString('id-ID') : 'Belum pernah'}</div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/monitoring/${device.id}`} className="btn-primary text-sm flex items-center gap-1">
                <Activity className="w-4 h-4" /> Monitoring
              </Link>
              <button onClick={() => setEditing(true)} className="btn-secondary text-sm flex items-center gap-1">
                <Edit3 className="w-4 h-4" /> Edit
              </button>
              <button onClick={() => setConfirmRegen(true)} className="btn-secondary text-sm flex items-center gap-1">
                <KeyRound className="w-4 h-4" /> Regenerate Token
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium"
              >
                <Trash2 className="w-4 h-4" /> Hapus
              </button>
            </div>
          </>
        )}
      </div>

      {/* ====== LATEST READING ====== */}
      <div className="card mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Pembacaan Terakhir</h2>
          <button onClick={load} className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {!latest ? (
          <p className="text-sm text-gray-500">Belum ada data sensor. Firmware ESP32 belum mengirim telemetry.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <Thermometer className="w-5 h-5 mx-auto text-orange-500" />
              <div className="text-lg font-bold mt-1">{Number(latest.temperature).toFixed(1)}°C</div>
              <div className="text-xs text-gray-500">Suhu</div>
            </div>
            <div>
              <Droplets className="w-5 h-5 mx-auto text-blue-500" />
              <div className="text-lg font-bold mt-1">{Number(latest.humidity).toFixed(0)}%</div>
              <div className="text-xs text-gray-500">Kelembapan Udara</div>
            </div>
            <div>
              <Droplets className="w-5 h-5 mx-auto text-green-600" />
              <div className="text-lg font-bold mt-1">{Number(latest.soil_moisture).toFixed(0)}%</div>
              <div className="text-xs text-gray-500">Tanah ({soilStatus})</div>
            </div>
          </div>
        )}
      </div>

      {/* ====== NEW TOKEN MODAL ====== */}
      {newToken && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-gray-800">Token Baru</h3>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 mb-3">
              ⚠️ Token hanya tampil SEKALI. Segera update firmware ESP32 Anda.
            </div>
            <textarea
              readOnly
              value={newToken}
              rows={3}
              className="w-full font-mono text-xs bg-gray-50 rounded px-3 py-2 border border-gray-100 resize-none"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={copyNewToken} className="btn-secondary text-sm flex items-center gap-1">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={() => setNewToken(null)} className="btn-primary text-sm">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== CONFIRM DELETE ====== */}
      <ConfirmModal
        open={confirmDelete}
        danger
        title="Hapus Perangkat?"
        message={`Perangkat "${device.device_name}" beserta seluruh data histori dan pengaturannya akan dihapus permanen.`}
        confirmText="Ya, Hapus"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* ====== CONFIRM REGENERATE ====== */}
      <ConfirmModal
        open={confirmRegen}
        title="Regenerate Token?"
        message="Token lama akan langsung tidak berlaku. ESP32 yang masih memakai token lama tidak bisa mengirim telemetry sampai firmware diperbarui dengan token baru."
        confirmText="Ya, Regenerate"
        loading={regenLoading}
        onConfirm={handleRegen}
        onCancel={() => setConfirmRegen(false)}
      />
    </div>
  );
}