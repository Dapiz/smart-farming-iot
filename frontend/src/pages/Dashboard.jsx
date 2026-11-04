import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Cpu, Wifi, WifiOff, Droplets, Thermometer, Plus, RefreshCw, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { deviceService } from '../services/deviceService';
import { monitoringService } from '../services/monitoringService';
import { useDeviceSocket } from '../hooks/useDeviceSocket';
import StatCard from '../components/StatCard';

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
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useDeviceSocket({
    'device:update': (payload) => {
      setDevices(prev => prev.map(d => d.id === payload.device_id
        ? {
            ...d, status: 'online', last_seen: payload.last_seen,
            last_temperature: payload.temperature,
            last_humidity: payload.humidity,
            last_soil_moisture: payload.soil_moisture,
            last_soil_adc: payload.soil_adc,
            last_pump_status: payload.pump_status,
            last_mode: payload.mode,
          }
        : d));
    },
    'device:offline': (p) => setDevices(prev =>
      prev.map(d => d.id === p.device_id ? { ...d, status: 'offline' } : d)),
    'pump:ack': (p) => setDevices(prev =>
      prev.map(d => d.id === p.device_id ? { ...d, last_pump_status: p.pump_status } : d)),
  });

  const total   = devices.length;
  const online  = devices.filter(d => d.status === 'online').length;
  const offline = total - online;
  const pumpOn  = devices.filter(d => d.last_pump_status).length;

  const avgOf = (key) => {
    const vals = devices.map(d => Number(d[key])).filter(v => !Number.isNaN(v) && v !== 0);
    if (!vals.length) return '--';
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };

  const avgTemp = summary?.avg_temperature ?? avgOf('last_temperature');
  const avgHum  = summary?.avg_humidity    ?? avgOf('last_humidity');
  const avgSoil = summary?.avg_soil_moisture ?? avgOf('last_soil_moisture');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Selamat datang kembali, <span className="font-semibold text-primary-600">{user?.name}</span> 👋
          </p>
        </div>
        <button onClick={load} className="btn-secondary text-sm w-fit">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Total Perangkat" value={total}   icon={Cpu}      color="primary" />
        <StatCard label="Online"          value={online}  icon={Wifi}     color="green"  trend={online > 0 ? `${Math.round((online/total)*100)}%` : null} />
        <StatCard label="Offline"         value={offline} icon={WifiOff}  color="gray" />
        <StatCard label="Pompa Menyala"   value={pumpOn}  icon={Droplets} color="teal" />
      </div>

      {/* Averages — strip gradient */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="card-gradient">
          <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
            <Thermometer className="w-4 h-4" /> RATA-RATA SUHU
          </div>
          <div className="mt-2 text-3xl font-bold text-white">{avgTemp}<span className="text-lg font-medium text-white/80">°C</span></div>
        </div>
        <div className="card-gradient">
          <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
            <Droplets className="w-4 h-4" /> KELEMBAPAN UDARA
          </div>
          <div className="mt-2 text-3xl font-bold text-white">{avgHum}<span className="text-lg font-medium text-white/80">%</span></div>
        </div>
        <div className="card-gradient">
          <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
            <Droplets className="w-4 h-4" /> KELEMBAPAN TANAH
          </div>
          <div className="mt-2 text-3xl font-bold text-white">{avgSoil}<span className="text-lg font-medium text-white/80">%</span></div>
        </div>
      </div>

      {/* Devices list */}
      <div className="card animate-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-lg">Perangkat Saya</h2>
          <Link to="/devices/new" className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" /> Tambah
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-10">
            <Cpu className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-sm text-gray-500 mt-3">Belum ada perangkat.</p>
            <Link to="/devices/new" className="btn-primary mt-4 inline-flex text-sm">
              <Plus className="w-4 h-4" /> Tambah Perangkat
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {devices.map(d => {
              const isOn = d.status === 'online';
              const soil = Number(d.last_soil_moisture) || 0;
              const soilColor = soil < 40 ? 'text-red-600' : soil < 45 ? 'text-yellow-600' : 'text-green-600';
              return (
                <Link
                  key={d.id}
                  to={`/devices/${d.id}`}
                  className="group p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-gradient-primary-soft transition-all hover:shadow-soft"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate group-hover:text-primary-700">
                        {d.device_name}
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {d.location || 'Tanpa lokasi'}
                      </div>
                    </div>
                    <span className={`badge ${isOn ? 'badge-success' : 'badge-gray'} ml-2 whitespace-nowrap`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOn ? 'bg-green-500 animate-pulse-slow' : 'bg-gray-400'}`} />
                      {isOn ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div>
                      <div className="text-xs text-gray-500">Suhu</div>
                      <div className="text-sm font-bold text-orange-600">
                        {d.last_temperature ? `${Number(d.last_temperature).toFixed(1)}°` : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Udara</div>
                      <div className="text-sm font-bold text-blue-600">
                        {d.last_humidity ? `${Number(d.last_humidity).toFixed(0)}%` : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Tanah</div>
                      <div className={`text-sm font-bold ${soilColor}`}>
                        {d.last_soil_moisture != null ? `${Number(d.last_soil_moisture).toFixed(0)}%` : '--'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end text-xs text-primary-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    Lihat detail <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}