import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Leaf, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Kiri: Hero */}
      <div className="hidden md:flex relative bg-gradient-primary items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-md text-white text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/15 backdrop-blur rounded-3xl mb-6 shadow-xl">
            <Leaf className="w-11 h-11 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-extrabold mb-3 tracking-tight">Smart Farming IoT</h1>
          <p className="text-primary-100 text-lg leading-relaxed">
            Pantau kebun Anda dari mana saja, kapan saja secara real-time, aman, dan otomatis.
          </p>
          <div className="flex justify-center gap-6 mt-10 text-sm text-primary-100/80">
            <div>Multi-device</div>
            <div>Real-time</div>
            <div>Aman</div>
          </div>
        </div>
      </div>

      {/* Kanan: Form */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-white">
        <div className="w-full max-w-md animate-in">
          <div className="md:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl shadow-glow mb-3">
              <Leaf className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Smart Farming IoT</h1>
          </div>

          <div className="hidden md:block mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Masuk ke akun Anda</h2>
            <p className="text-gray-500 mt-1 text-sm">Kelola kebun Anda dengan mudah</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 text-red-700 text-sm p-3 rounded-xl border border-red-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email" name="email" required
                  value={form.email} onChange={handleChange}
                  placeholder="nama@email.com"
                  className="input-field pl-11"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password" name="password" required
                  value={form.password} onChange={handleChange}
                  placeholder="••••••••"
                  className="input-field pl-11"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Belum punya akun?{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700 hover:underline">
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}