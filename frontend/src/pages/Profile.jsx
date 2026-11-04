import { useState } from 'react';
import { User, Save, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import Toast from '../components/Toast';

export default function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  const [toast, setToast] = useState(null);

  const saveName = async (e) => {
    e.preventDefault();
    setSavingName(true);
    try {
      const updated = await userService.updateProfile({ name });
      // update localStorage via AuthContext would need a refetch; simplest: update stored user
      localStorage.setItem('user', JSON.stringify({ ...user, ...updated }));
      setToast({ type: 'success', message: 'Nama berhasil diperbarui. Refresh untuk melihat perubahan di sidebar.' });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Gagal menyimpan' });
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) {
      return setToast({ type: 'error', message: 'Konfirmasi password tidak cocok' });
    }
    setSavingPw(true);
    try {
      await userService.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setToast({ type: 'success', message: 'Password berhasil diubah' });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Gagal mengubah password' });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Toast type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Profile</h1>
        <p className="text-sm text-gray-500">Kelola informasi akun Anda</p>
      </div>

      {/* Info akun */}
      <div className="card-gradient">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold text-2xl text-white shadow-lg">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xl text-white truncate">{user?.name}</div>
            <div className="text-sm text-primary-100 truncate">{user?.email}</div>
          </div>
        </div>

        <form onSubmit={saveName} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Nama</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Email (tidak bisa diubah)</label>
            <input type="email" value={user?.email || ''} disabled className="input-field mt-1 bg-gray-50" />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={savingName} className="btn-primary text-sm flex items-center gap-2">
              {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingName ? 'Menyimpan...' : 'Simpan Nama'}
            </button>
          </div>
        </form>
      </div>

      {/* Ganti password */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-gray-800">Ganti Password</h2>
        </div>
        <form onSubmit={savePassword} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Password Lama</label>
            <input type="password" value={pw.currentPassword}
              onChange={e => setPw({ ...pw, currentPassword: e.target.value })} className="input-field mt-1" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Password Baru</label>
              <input type="password" value={pw.newPassword} minLength={6}
                onChange={e => setPw({ ...pw, newPassword: e.target.value })} className="input-field mt-1" required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Konfirmasi</label>
              <input type="password" value={pw.confirm} minLength={6}
                onChange={e => setPw({ ...pw, confirm: e.target.value })} className="input-field mt-1" required />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={savingPw} className="btn-primary text-sm flex items-center gap-2">
              {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {savingPw ? 'Menyimpan...' : 'Ubah Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}