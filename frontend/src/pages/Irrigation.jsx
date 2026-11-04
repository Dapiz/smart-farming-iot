import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Droplets, Power, Clock, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Timer, RefreshCw,
} from 'lucide-react';
import { deviceService } from '../services/deviceService';
import api from '../services/api';
import { useDeviceSocket } from '../hooks/useDeviceSocket';
import Toast from '../components/Toast';

const COMMAND_TIMEOUT = 5 * 60; // detik (sama dengan backend)

export default function Irrigation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(searchParams.get('device') || '');
  const [device, setDevice] = useState(null);
  const [latestCmd, setLatestCmd] = useState(null);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [toast, setToast] = useState(null);
  const [offlineReason, setOfflineReason] = useState('');
  const countdownTimerRef = useRef(null);

  // ============ Load devices ============
  useEffect(() => {
    deviceService.list().then(list => {
      setDevices(list);
      if (!deviceId && list.length > 0) setDeviceId(String(list[0].id));
    });
  }, []);

  const loadDevice = useCallback(async () => {
    if (!deviceId) return;
    try {
      const d = await deviceService.detail(deviceId);
      setDevice(d);
      setLatestCmd(d.last_command || null);
      setOfflineReason('');
      setSearchParams({ device: deviceId });
    } catch {
      setDevice(null);
    }
  }, [deviceId, setSearchParams]);

  useEffect(() => { loadDevice(); }, [loadDevice]);

  // ============ Countdown untuk command PENDING ============
  useEffect(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (!latestCmd || latestCmd.status !== 'PENDING') {
      setCountdown(0);
      return;
    }
    const start = latestCmd.created_at ? new Date(latestCmd.created_at).getTime() : Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = COMMAND_TIMEOUT - elapsed;
      if (left <= 0) {
        setCountdown(0);
        setLatestCmd(prev => prev ? { ...prev, status: 'EXPIRED' } : prev);
        setToast({ type: 'error', message: 'Command expired. ESP32 tidak merespons.' });
        clearInterval(countdownTimerRef.current);
      } else {
        setCountdown(left);
      }
    };
    tick();
    countdownTimerRef.current = setInterval(tick, 1000);
    return () => clearInterval(countdownTimerRef.current);
  }, [latestCmd?.command_id, latestCmd?.status]);

  // ============ Realtime ============
  useDeviceSocket({
    'pump:pending': (p) => {
      if (p.device_id === Number(deviceId)) {
        setLatestCmd({
          id: p.command_id, command: p.command,
          status: 'PENDING', created_at: p.created_at,
        });
        setToast({ type: 'success', message: `Perintah ${p.command} dikirim. Menunggu ESP32...` });
      }
    },
    'pump:ack': (p) => {
      if (p.device_id !== Number(deviceId)) return;
      setLatestCmd(prev => prev ? { ...prev, status: p.status } : null);
      if (p.pump_status !== null && p.pump_status !== undefined) {
        setDevice(prev => prev ? {
          ...prev,
          latest: prev.latest ? { ...prev.latest, pump_status: p.pump_status } : prev.latest,
        } : prev);
      }
      if (p.status === 'EXECUTED') setToast({ type: 'success', message: 'Pompa berhasil dieksekusi ESP32' });
      else if (p.status === 'FAILED') setToast({ type: 'error', message: 'ESP32 gagal mengeksekusi perintah' });
      else if (p.status === 'EXPIRED') setToast({ type: 'error', message: 'Command expired (timeout)' });
    },
    'device:update': (p) => {
      if (p.device_id === Number(deviceId)) {
        setDevice(prev => prev ? { ...prev, status: 'online', latest: p } : prev);
        setOfflineReason('');
      }
    },
    'device:offline': (p) => {
      if (p.device_id === Number(deviceId)) {
        setDevice(prev => prev ? { ...prev, status: 'offline' } : prev);
        setOfflineReason('Perangkat terputus. Kontrol manual dinonaktifkan.');
      }
    },
  }, [deviceId]);

  // ============ Kirim command ============
  const sendCommand = async (cmd) => {
    setSending(true);
    // Optimistic: langsung set PENDING
    const tempId = `tmp-${Date.now()}`;
    setLatestCmd({ id: tempId, command: cmd, status: 'PENDING', created_at: new Date().toISOString() });
    try {
      const { data } = await api.post(`/devices/${deviceId}/pump`, { command: cmd });
      setLatestCmd({
        id: data.data.command_id,
        command: cmd,
        status: 'PENDING',
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      setLatestCmd(null);
      setToast({ type: 'error', message: err.response?.data?.message || 'Gagal mengirim perintah' });
    } finally {
      setSending(false);
    }
  };

  // ============ Render ============
  const online = device?.status === 'online';
  const mode = device?.operating_mode || 'AUTO';
  const canControl = online && mode === 'MANUAL';
  const isPumpOn = !!device?.latest?.pump_status;
  const isPending = latestCmd?.status === 'PENDING';

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Irrigation Control</h1>
          <p className="text-sm text-gray-500">Kontrol manual pompa per perangkat</p>
        </div>
        <button onClick={loadDevice} className="btn-secondary text-sm flex items-center gap-1">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="card">
        <label className="text-xs font-medium text-gray-500">Perangkat</label>
        <select value={deviceId} onChange={e => setDeviceId(e.target.value)} className="input-field mt-1">
          {devices.length === 0 && <option value="">Belum ada device</option>}
          {devices.map(d => <option key={d.id} value={d.id}>{d.device_name}</option>)}
        </select>
      </div>

      {!device ? (
        <div className="card text-sm text-gray-500">Pilih perangkat terlebih dahulu.</div>
      ) : (
        <>
          {/* === Status pompa === */}
          <div className={`card animate-in relative overflow-hidden ${
            isPumpOn ? 'border-green-200 bg-gradient-to-br from-white to-green-50/30' : ''
          }`}>
            {/* Accent */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${isPumpOn ? 'bg-gradient-to-r from-green-500 to-accent-500' : 'bg-gray-200'}`} />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-soft ${
                  isPumpOn
                    ? 'bg-gradient-to-br from-green-500 to-accent-500'
                    : 'bg-gradient-to-br from-gray-300 to-gray-400'
                }`}>
                  <Droplets className={`w-6 h-6 text-white ${isPumpOn ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">Status Pompa</h2>
                  <p className="text-xs text-gray-500">Kontrol manual pompa air</p>
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                isPumpOn
                  ? 'bg-green-100 text-green-700 ring-2 ring-green-200'
                  : 'bg-gray-100 text-gray-600 ring-2 ring-gray-200'
              }`}>
                {isPumpOn ? '● MENYALA' : '○ MATI'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-gradient-primary-soft">
                <div className="text-xs text-gray-600 font-medium">Status Perangkat</div>
                <div className={`text-sm font-bold mt-1 ${online ? 'text-green-600' : 'text-gray-500'}`}>
                  {online ? '● Online' : '● Offline'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-primary-soft">
                <div className="text-xs text-gray-600 font-medium">Mode Operasi</div>
                <div className={`text-sm font-bold mt-1 ${mode === 'MANUAL' ? 'text-blue-600' : 'text-primary-600'}`}>
                  {mode}
                </div>
              </div>
            </div>

            {/* ... existing warnings ... */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                disabled={!canControl || sending || isPumpOn || isPending}
                onClick={() => sendCommand('ON')}
                className="relative bg-gradient-to-r from-green-600 to-accent-600 hover:from-green-700 hover:to-accent-700 text-white font-semibold px-4 py-3 rounded-xl shadow-soft hover:shadow-glow transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending && latestCmd?.command === 'ON' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                Nyalakan Pompa
              </button>
              <button
                disabled={!canControl || sending || !isPumpOn || isPending}
                className="bg-white hover:bg-gray-50 text-gray-700 font-semibold px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-red-300 hover:text-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={() => sendCommand('OFF')}
              >
                {sending && latestCmd?.command === 'OFF' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                Matikan Pompa
              </button>
            </div>
          </div>

          {/* === Command status === */}
          {latestCmd && (
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <h2 className="font-semibold text-gray-800 text-sm">Perintah Terakhir</h2>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Command <b>{latestCmd.command}</b></span>
                <StatusBadge status={latestCmd.status} />
              </div>
              {isPending && countdown > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                  <Timer className="w-3.5 h-3.5" />
                  <span>Timeout dalam <b className="text-yellow-700">{formatCountdown(countdown)}</b></span>
                </div>
              )}
              {latestCmd.status === 'EXECUTED' && latestCmd.executed_at && (
                <div className="text-xs text-gray-500 mt-1">
                  Dieksekusi: {new Date(latestCmd.executed_at).toLocaleString('id-ID')}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatCountdown(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function StatusBadge({ status }) {
  const map = {
    PENDING:  { color: 'bg-yellow-50 text-yellow-700', icon: Clock,        label: 'Menunggu' },
    EXECUTED: { color: 'bg-green-50 text-green-700',   icon: CheckCircle2, label: 'Berhasil' },
    FAILED:   { color: 'bg-red-50 text-red-700',       icon: XCircle,      label: 'Gagal'    },
    EXPIRED:  { color: 'bg-gray-100 text-gray-600',    icon: XCircle,      label: 'Expired'  },
  };
  const cfg = map[status] || map.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}