import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Cpu, Wifi, WifiOff, Droplets, Thermometer, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { deviceService } from '../services/deviceService';

function DeviceCard({ device }) {
  const online = device.status === 'online';
  const soilColor =
    Number(device.last_soil_moisture) < 40 ? 'text-red-600'
    : Number(device.last_soil_moisture) < 45 ? 'text-yellow-600'
    : 'text-green-600';

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-800 truncate">{device.device_name}</h3>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{device.location || 'Tanpa lokasi'} · {device.device_uid}</p>
        </div>
        <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${online ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {online ? 'Online' : 'Offline'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <Thermometer className="w-4 h-4 mx-auto text-orange-500" />
          <div className="text-sm font-semibold mt-1">
            {device.last_temperature !== null && device.last_temperature !== undefined
              ? `${Number(device.last_temperature).toFixed(1)}°` : '--'}
          </div>
          <div className="text-[10px] text-gray-500">Suhu</div>
        </div>
        <div>
          <Droplets className="w-4 h-4 mx-auto text-blue-500" />
          <div className="text-sm font-semibold mt-1">
            {device.last_humidity !== null && device.last_humidity !== undefined
              ? `${Number(device.last_humidity).toFixed(0)}%` : '--'}
          </div>
          <div className="text-[10px] text-gray-500">Udara</div>
        </div>
        <div>
          <Droplets className="w-4 h-4 mx-auto text-green-600" />
          <div className={`text-sm font-semibold mt-1 ${soilColor}`}>
            {device.last_soil_moisture !== null && device.last_soil_moisture !== undefined
              ? `${Number(device.last_soil_moisture).toFixed(0)}%` : '--'}
          </div>
          <div className="text-[10px] text-gray-500">Tanah</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${device.last_pump_status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          Pompa: {device.last_pump_status ? 'ON' : 'OFF'}
        </span>
        <Link to={`/devices/${device.id}`} className="text-sm font-medium text-primary-600 hover:underline">
          Detail →
        </Link>
      </div>
    </div>
  );
}

export default function MyDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = await deviceService.list();
      setDevices(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat perangkat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">My Devices</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola semua perangkat ESP32 Anda</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link to="/devices/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Tambah
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl border border-red-100 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card h-44 animate-pulse bg-gray-100" />)}
        </div>
      ) : devices.length === 0 ? (
        <div className="card text-center py-16 animate-in">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-primary-soft flex items-center justify-center mb-4">
            <Cpu className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg">Belum ada perangkat</h3>
          <p className="text-sm text-gray-500 mt-1 mb-5">Tambahkan perangkat ESP32 pertama Anda untuk mulai memantau.</p>
          <Link to="/devices/new" className="btn-primary inline-flex text-sm">
            <Plus className="w-4 h-4" /> Tambah Perangkat
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map(d => <DeviceCard key={d.id} device={d} />)}
        </div>
      )}
    </div>
  );
}