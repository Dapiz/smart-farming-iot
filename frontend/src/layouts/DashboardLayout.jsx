import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  Leaf, LayoutDashboard, Cpu, Activity, History,
  Droplets, Settings, User, LogOut, Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const navItems = [
  { to: '/dashboard',   label: 'Dashboard',           icon: LayoutDashboard },
  { to: '/devices',     label: 'My Devices',          icon: Cpu },
  { to: '/monitoring',  label: 'Monitoring',          icon: Activity },
  { to: '/history',     label: 'History',             icon: History },
  { to: '/irrigation',  label: 'Irrigation Control',  icon: Droplets },
  { to: '/settings',    label: 'Settings',            icon: Settings },
  { to: '/profile',     label: 'Profile',             icon: User },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen]   = useState(false);
  const [loggingOut, setLoggingOut]   = useState(false);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-sidebar text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg">
          <Leaf className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-bold text-white text-sm tracking-wide">Smart Farming</div>
          <div className="text-[11px] text-primary-200/80">IoT Dashboard</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              isActive ? 'sidebar-link-active' : 'sidebar-link'
            }
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Profile + Logout */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-xl bg-white/5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center font-bold text-sm text-white shadow-md">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
            <div className="text-xs text-primary-200/70 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={() => {
            setSidebarOpen(false);
            setLogoutOpen(true);
          }}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-100 hover:bg-red-500/20 hover:text-white rounded-xl transition"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 fixed inset-y-0 left-0 z-30 shadow-xl">
        <SidebarContent />
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar mobile */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-300 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="md:hidden sticky top-0 z-20 bg-glass border-b border-gray-200/50 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-800 text-sm">Smart Farming</span>
          </div>
          <div className="w-10" />
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* Modal konfirmasi logout */}
      <ConfirmModal
        open={logoutOpen}
        danger
        icon={LogOut}
        title="Logout dari akun?"
        message={`Anda akan keluar dari akun ${user?.name || 'ini'}. Perangkat tetap berjalan otomatis di latar belakang.`}
        confirmText="Ya, Logout"
        cancelText="Batal"
        loading={loggingOut}
        onConfirm={handleConfirmLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  );
}