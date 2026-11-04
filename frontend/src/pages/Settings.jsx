import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, Loader2, Settings as Cog, Info } from 'lucide-react';
import { deviceService } from '../services/deviceService';
import { monitoringService } from '../services/monitoringService';
import Toast from '../components/Toast';

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(searchParams.get('device') || '');
  const [form, setForm] = useState({ minimum_soil_moisture: 40, maximum_soil_moisture: 45, operating_mode: 'AUTO' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Load device list
  useEffect(() => {
    deviceService.list().then(list => {
      setDevices(list);
      if (!deviceId && list.length > 0) setDeviceId(String(list[0].id));
    });
  }, []);

  // Load settings dari device detail
  useEffect(() => {
    if (!deviceId) return;
    setLoading(true);
    deviceService.detail(deviceId)
      .then(d => setForm({
        minimum_soil_moisture: Number(d.minimum_soil_moisture) ?? 40,
        maximum_soil_moisture: Number(d.maximum_soil_moisture) ?? 45,
        operating_mode: d.operating_mode || 'AUTO',
      }))
      .finally(() => setLoading(false));
    setSearchParams({ device: deviceId });
  }, [deviceId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await monitoringService.updateSettings(deviceId, {
        minimum_soil_moisture: Number(form.minimum_soil_moisture),
        maximum_soil_moisture: Number(form.maximum_soil_moisture),
        operating_mode: form.operating_mode,
      });
      setToast({ type: 'success', message: 'Pengaturan disimpan' });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Gagal menyimpan' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-sm text-gray-500">Konfigurasi penyiraman otomatis per perangkat</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Cog className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-gray-800">Pengaturan Perangkat</h2>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500">Perangkat</label>
          <select value={deviceId} onChange={e => setDeviceId(e.target.value)} className="input-field mt-1">
            {devices.length === 0 && <option value="">Belum ada device</option>}
            {devices.map(d => <option key={d.id} value={d.id}>{d.device_name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="h-40 animate-pulse bg-gray-100 rounded" />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 flex gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                Hysteresis: pompa menyala ketika kelembapan tanah <b>&lt; minimum</b>, dan mati ketika <b>≥ maximum</b>. Pastikan <b>minimum &lt; maximum</b>.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Minimum Kelembapan Tanah (%)</label>
                <input type="number" min={0} max={100}
                  value={form.minimum_soil_moisture}
                  onChange={e => setForm({ ...form, minimum_soil_moisture: e.target.value })}
                  className="input-field mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Maximum Kelembapan Tanah (%)</label>
                <input type="number" min={0} max={100}
                  value={form.maximum_soil_moisture}
                  onChange={e => setForm({ ...form, maximum_soil_moisture: e.target.value })}
                  className="input-field mt-1" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500">Mode Operasi</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {['AUTO', 'MANUAL'].map(m => (
                  <button type="button" key={m}
                    onClick={() => setForm({ ...form, operating_mode: m })}
                    className={`text-sm px-3 py-2 rounded-lg border font-medium ${form.operating_mode === m
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {m}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {form.operating_mode === 'AUTO'
                  ? 'Pompa dikontrol otomatis berdasarkan batas kelembapan.'
                  : 'Pompa hanya dikontrol manual dari dashboard.'}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={saving} className="btn-primary text-sm flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}