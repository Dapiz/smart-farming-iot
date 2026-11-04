import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Cpu, Wifi, WifiOff, Droplets, Thermometer, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { deviceService } from '../services/deviceService';
import { monitoringService } from '../services/monitoringService';
import { useDeviceSocket } from '../hooks/useDeviceSocket';

export default function Dashboard() {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [list, sum] = await Promise.all([
        deviceService.list(),
        monitoringService.summary(),
      ]);
      setDevices(list || []);
      setSummary(sum);
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime update
  useDeviceSocket({
    'device:update': (payload) => {
      setDevices(prev => prev.map(d => d.id === payload.device_id
        ? {
            ...d,
            status: 'online',
            last_seen: payload.last_seen,
            last_temperature: payload.temperature,
            last_humidity: payload.humidity,
            last_soil_moisture: payload.soil_moisture,
            last_soil_adc: payload.soil_adc,
            last_pump_status: payload.pump_status,
            last_mode: payload.mode,
          }
        : d));
    },
    'device:offline': (payload) => {
      setDevices(prev => prev.map(d => d.id === payload.device_id
        ? { ...d, status: 'offline' } : d));
    },
    'pump:ack': (payload) => {
      setDevices(prev => prev.map(d => d.id === payload.device_id
        ? { ...d, last_pump_status: payload.pump_status } : d));
    },
  });

  const total   = devices.length;
  const online  = devices.filter(d => d.status === 'online').length;
  const offline = total - online;
  const pumpOn  = devices.filter(d => d.last_pump_status).length;

  const avgOf = (list, key) => {
    const vals = list.map(d => Number(d[key])).filter(v => !Number.isNaN(v) && v !== 0);
    if (!vals.length) return '--';
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };

  const avgTemp = summary?.avg_temperature    ?? avgOf(devices, 'last_temperature');
  const avgHum  = summary?.avg_humidity       ?? avgOf(devices, 'last_humidity');
  const avgSoil = summary?.avg_soil_moisture  ?? avgOf(devices, 'last_soil_moisture');

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500">Selamat datang, {user?.name} 👋</p>
        </div>
        <button onClick={load} className="btn-secondary text-sm flex items-center gap-1">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Perangkat" value={total}   icon={Cpu}      color="primary" />
        <StatCard label="Online"          value={online}  icon={Wifi}     color="green" />
        <StatCard label="Offline"         value={offline} icon={WifiOff}  color="gray" />
        <StatCard label="Pompa Menyala"   value={pumpOn}  icon={Droplets} color="blue" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <MiniStat icon={Thermometer} label="Rata² Suhu"       value={`${avgTemp}°C`} color="text-orange-600" />
        <MiniStat icon={Droplets}    label="Rata² Kelembapan" value={`${avgHum}%`}   color="text-blue-600" />
        <MiniStat icon={Droplets}    label="Rata² Tanah"      value={`${avgSoil}%`}  color="text-green-600" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Daftar Perangkat</h2>
          <Link to="/devices/new" className="btn-primary text-xs flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Tambah
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 rounded bg-gray-100 animate-pulse" />)}</div>
        ) : devices.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada perangkat. Klik <b>Tambah</b> untuk memulai.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {devices.map(d => (
              <Link key={d.id} to={`/devices/${d.id}`} className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{d.device_name}</div>
                  <div className="text-xs text-gray-500 truncate">{d.location || 'Tanpa lokasi'}</div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span>{d.last_temperature ? `${Number(d.last_temperature).toFixed(1)}°C` : '--'}</span>
                  <span>{d.last_soil_moisture ? `${Number(d.last_soil_moisture).toFixed(0)}%` : '--'}</span>
                  <span className={d.status === 'online' ? 'text-green-600' : 'text-gray-400'}>●</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    green:   'bg-green-50 text-green-600',
    gray:    'bg-gray-100 text-gray-500',
    blue:    'bg-blue-50 text-blue-600',
  };
  return (
    <div className="card">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-gray-800 mt-3">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }) {
  return (
    <div className="card text-center">
      <Icon className={`w-5 h-5 mx-auto ${color}`} />
      <div className="text-lg font-bold text-gray-800 mt-1">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}