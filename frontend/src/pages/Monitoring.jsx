import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import {
  ArrowLeft, Thermometer, Droplets, Activity, Wifi, WifiOff, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { deviceService } from '../services/deviceService';
import { monitoringService } from '../services/monitoringService';
import SensorChart from '../components/SensorChart';
import { useDeviceSocket } from '../hooks/useDeviceSocket';

const RANGES = [
  { key: '1h',  label: '1 Jam' },
  { key: '24h', label: '24 Jam' },
  { key: '7d',  label: '7 Hari' },
  { key: '30d', label: '30 Hari' },
];

export default function Monitoring() {
  const { id } = useParams();
  const [device, setDevice]   = useState(null);
  const [range, setRange]     = useState('24h');
  const [points, setPoints]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError]     = useState('');

  if (!id) return <Navigate to="/devices" replace />;

  const loadDevice = useCallback(async () => {
    try {
      const d = await deviceService.detail(id);
      setDevice(d);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat perangkat');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadChart = useCallback(async (r) => {
    setLoadingChart(true);
    try {
      const data = await monitoringService.history(id, r);
      setPoints(data.points || []);
    } catch {
      setPoints([]);
    } finally {
      setLoadingChart(false);
    }
  }, [id]);

  useEffect(() => { loadDevice(); }, [loadDevice]);
  useEffect(() => { loadChart(range); }, [range, loadChart]);

  // Realtime: update latest & append ke chart
  useDeviceSocket({
    'device:update': (payload) => {
      if (payload.device_id !== Number(id)) return;

      setDevice(prev => prev ? {
        ...prev,
        status: 'online',
        last_seen: payload.last_seen,
        latest: {
          temperature: payload.temperature,
          humidity: payload.humidity,
          soil_moisture: payload.soil_moisture,
          soil_adc: payload.soil_adc,
          pump_status: payload.pump_status,
          mode: payload.mode,
          recorded_at: payload.recorded_at,
        },
      } : prev);

      // Untuk range pendek (1h / 24h) append langsung ke grafik
      if (range === '1h' || range === '24h') {
        setPoints(prev => [...prev, {
          time: payload.recorded_at.replace('T', ' ').slice(0, 19),
          temperature: payload.temperature,
          humidity: payload.humidity,
          soil_moisture: payload.soil_moisture,
          soil_adc: payload.soil_adc,
          pump_status: payload.pump_status,
        }].slice(-200));
      }
    },
    'device:offline': (payload) => {
      if (payload.device_id === Number(id)) {
        setDevice(prev => prev ? { ...prev, status: 'offline' } : prev);
      }
    },
  }, [id, range]);

  if (loading) {
    return <div className="card animate-pulse h-40 bg-gray-100 max-w-3xl mx-auto" />;
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" /> {error}
        </div>
        <Link to="/devices" className="btn-secondary inline-flex items-center gap-1 mt-3 text-sm">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
      </div>
    );
  }

  const online = device.status === 'online';
  const latest = device.latest;

  const soil = latest ? Number(latest.soil_moisture) : null;
  const soilStatus = soil === null ? '--'
    : soil < device.minimum_soil_moisture ? 'Kering'
    : soil >= device.maximum_soil_moisture ? 'Basah' : 'Cukup';
  const soilColor = soil === null ? 'text-gray-500'
    : soil < device.minimum_soil_moisture ? 'text-red-600'
    : soil >= device.maximum_soil_moisture ? 'text-green-600' : 'text-yellow-600';

  const labels = points.map(p => {
    const d = new Date(p.time.replace(' ', 'T'));
    return range === '1h' || range === '24h'
      ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit' });
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Link to="/devices" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Kembali ke My Devices
      </Link>

      <div className="card flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{device.device_name}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{device.location || 'Tanpa lokasi'} · {device.device_uid}</p>
        </div>
        <div className="flex items-center gap-2">
          {online
            ? <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-50 text-green-700"><Wifi className="w-3 h-3" /> Online</span>
            : <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600"><WifiOff className="w-3 h-3" /> Offline</span>}
          <button onClick={() => { loadDevice(); loadChart(range); }}
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <Thermometer className="w-6 h-6 mx-auto text-orange-500" />
          <div className="text-2xl font-bold mt-1">
            {latest ? Number(latest.temperature).toFixed(1) : '--'}<span className="text-sm text-gray-500">°C</span>
          </div>
          <div className="text-xs text-gray-500">Suhu Udara</div>
        </div>
        <div className="card text-center">
          <Droplets className="w-6 h-6 mx-auto text-blue-500" />
          <div className="text-2xl font-bold mt-1">
            {latest ? Number(latest.humidity).toFixed(0) : '--'}<span className="text-sm text-gray-500">%</span>
          </div>
          <div className="text-xs text-gray-500">Kelembapan Udara</div>
        </div>
        <div className="card text-center">
          <Activity className="w-6 h-6 mx-auto text-green-600" />
          <div className={`text-2xl font-bold mt-1 ${soilColor}`}>
            {soil !== null ? soil.toFixed(0) : '--'}<span className="text-sm text-gray-500">%</span>
          </div>
          <div className="text-xs text-gray-500">Tanah ({soilStatus})</div>
        </div>
      </div>

      <div className="flex gap-2">
        {RANGES.map(r => (
          <button key={r.key} onClick={() => setRange(r.key)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              range === r.key ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      {loadingChart ? (
        <div className="card h-64 animate-pulse bg-gray-100" />
      ) : points.length === 0 ? (
        <div className="card text-center text-sm text-gray-500 py-12">
          Belum ada data sensor pada rentang waktu ini.
        </div>
      ) : (
        <>
          <SensorChart
            title="Suhu Udara" labels={labels} unit="°C"
            datasets={[{ label: 'Suhu', data: points.map(p => p.temperature), borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.08)' }]}
          />
          <SensorChart
            title="Kelembapan Udara" labels={labels} unit="%"
            datasets={[{ label: 'Kelembapan', data: points.map(p => p.humidity), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)' }]}
          />
          <SensorChart
            title="Kelembapan Tanah" labels={labels} unit="%"
            datasets={[{ label: 'Tanah', data: points.map(p => p.soil_moisture), borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.08)' }]}
          />
        </>
      )}
    </div>
  );
}