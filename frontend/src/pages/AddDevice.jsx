import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Cpu, Copy, Check, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { deviceService } from '../services/deviceService';
import Toast from '../components/Toast';

export default function AddDevice() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ device_name: '', description: '', location: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [paired, setPaired]   = useState(null); // { device, device_token, warning }
  const [copied, setCopied]   = useState(false);
  const [toast, setToast]     = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await deviceService.create(form);
      setPaired(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menambah perangkat');
    } finally {
      setLoading(false);
    }
  };

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(paired.device_token);
      setCopied(true);
      setToast({ type: 'success', message: 'Token berhasil di-copy' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast({ type: 'error', message: 'Gagal copy, salin manual' });
    }
  };

  // ============ TAMPILAN SETELAH PAIRING ============
  if (paired) {
    const { device, device_token } = paired;
    return (
      <div className="max-w-2xl mx-auto">
        <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />

        <Link to="/devices" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Kembali ke My Devices
        </Link>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Perangkat berhasil dibuat!</h2>
              <p className="text-sm text-gray-500">Simpan token di bawah untuk firmware ESP32.</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 flex gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>
              <b>Perhatian:</b> Token hanya ditampilkan <b>SEKALI</b>. Salin dan simpan sekarang.
              Jika hilang, gunakan fitur <i>Regenerate Token</i> di halaman detail perangkat.
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Nama Perangkat</label>
              <div className="font-medium text-gray-800">{device.device_name}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Device UID</label>
              <div className="font-mono text-sm text-gray-800 bg-gray-50 rounded px-3 py-2 border border-gray-100">
                {device.device_uid}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Device Token (rahasia)</label>
              <div className="flex gap-2 mt-1">
                <textarea
                  readOnly
                  value={device_token}
                  rows={3}
                  className="flex-1 font-mono text-xs bg-gray-50 rounded px-3 py-2 border border-gray-100 resize-none"
                />
                <button onClick={copyToken} className="btn-secondary self-start flex items-center gap-1 text-sm">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => navigate('/devices')} className="btn-secondary text-sm">
              Selesai
            </button>
            <button onClick={() => setPaired(null)} className="btn-primary text-sm">
              Tambah Perangkat Lain
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ FORM TAMBAH ============
  return (
    <div className="max-w-2xl mx-auto">
      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />

      <Link to="/devices" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Kembali ke My Devices
      </Link>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Tambah Perangkat ESP32</h2>
            <p className="text-sm text-gray-500">Isi data perangkat, lalu salin token untuk firmware.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Perangkat <span className="text-red-500">*</span>
            </label>
            <input
              type="text" name="device_name" required maxLength={100}
              value={form.device_name} onChange={handleChange}
              placeholder="Contoh: Kebun Cabai"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea
              name="description" rows={3} maxLength={500}
              value={form.description} onChange={handleChange}
              placeholder="Deskripsi perangkat (opsional)"
              className="input-field resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
            <input
              type="text" name="location" maxLength={150}
              value={form.location} onChange={handleChange}
              placeholder="Contoh: Kebun belakang rumah, Bandung"
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Link to="/devices" className="btn-secondary text-sm">Batal</Link>
            <button type="submit" disabled={loading} className="btn-primary text-sm flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Membuat...' : 'Buat Perangkat & Pairing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}