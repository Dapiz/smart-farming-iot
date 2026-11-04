import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { History as HistoryIcon, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { deviceService } from '../services/deviceService';
import { monitoringService } from '../services/monitoringService';

const PAGE_SIZE = 20;

export default function History() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(searchParams.get('device') || '');
  const [range, setRange] = useState(searchParams.get('range') || '24h');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  // Load daftar device
  useEffect(() => {
    deviceService.list().then(list => {
      setDevices(list);
      if (!deviceId && list.length > 0) setDeviceId(String(list[0].id));
    });
  }, []);

  // Load history
  const load = async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const data = await monitoringService.history(deviceId, range);
      setRows(data.points || []);
      setPage(0);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [deviceId, range]);

  // Update URL
  useEffect(() => {
    setSearchParams({ device: deviceId, range });
  }, [deviceId, range]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paged = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const currentDevice = devices.find(d => String(d.id) === String(deviceId));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">History</h1>
          <p className="text-sm text-gray-500">Riwayat pembacaan sensor</p>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[200px]">
            <label className="text-xs font-medium text-gray-500">Perangkat</label>
            <select value={deviceId} onChange={e => setDeviceId(e.target.value)} className="input-field mt-1">
              {devices.length === 0 && <option value="">Belum ada device</option>}
              {devices.map(d => <option key={d.id} value={d.id}>{d.device_name}</option>)}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="text-xs font-medium text-gray-500">Range</label>
            <select value={range} onChange={e => setRange(e.target.value)} className="input-field mt-1">
              <option value="1h">1 Jam</option>
              <option value="24h">24 Jam</option>
              <option value="7d">7 Hari</option>
              <option value="30d">30 Hari</option>
            </select>
          </div>
          <button onClick={load} className="btn-secondary text-sm flex items-center gap-1">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {currentDevice && (
            <Link to={`/devices/${deviceId}`} className="text-sm text-primary-600 hover:underline ml-auto">
              Detail device →
            </Link>
          )}
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500">Memuat...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <HistoryIcon className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Belum ada data</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Waktu</th>
                  <th className="px-4 py-2 text-right font-medium">Suhu (°C)</th>
                  <th className="px-4 py-2 text-right font-medium">Kelembapan (%)</th>
                  <th className="px-4 py-2 text-right font-medium">Tanah (%)</th>
                  <th className="px-4 py-2 text-right font-medium">ADC</th>
                  <th className="px-4 py-2 text-center font-medium">Pompa</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{new Date(r.time.replace(' ', 'T')).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-2 text-right">{r.temperature !== null ? r.temperature.toFixed(1) : '-'}</td>
                    <td className="px-4 py-2 text-right">{r.humidity !== null ? r.humidity.toFixed(0) : '-'}</td>
                    <td className="px-4 py-2 text-right">{r.soil_moisture !== null ? r.soil_moisture.toFixed(0) : '-'}</td>
                    <td className="px-4 py-2 text-right">{r.soil_adc !== null ? Math.round(r.soil_adc) : '-'}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${r.pump_status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {r.pump_status ? 'ON' : 'OFF'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
              <span>Menampilkan {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} dari {rows.length}</span>
              <div className="flex gap-1">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 py-1">Hal {page + 1}/{totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}