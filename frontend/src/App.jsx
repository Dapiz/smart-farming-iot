import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MyDevices from './pages/MyDevices';
import AddDevice from './pages/AddDevice';
import DeviceDetail from './pages/DeviceDetail';
import Monitoring from './pages/Monitoring';
import History from './pages/History';
import Irrigation from './pages/Irrigation';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login"    element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/dashboard"      element={<Dashboard />} />
            <Route path="/devices"        element={<MyDevices />} />
            <Route path="/devices/new"    element={<AddDevice />} />
            <Route path="/devices/:id"    element={<DeviceDetail />} />
            <Route path="/monitoring"     element={<Monitoring />} />
            <Route path="/monitoring/:id" element={<Monitoring />} />
            <Route path="/history"        element={<History />} />
            <Route path="/irrigation"     element={<Irrigation />} />
            <Route path="/settings"       element={<Settings />} />
            <Route path="/profile"        element={<Profile />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function Placeholder({ title, note }) {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      <p className="text-sm text-gray-500 mt-1">{note}</p>
      <div className="card mt-4 text-sm text-gray-500">Halaman belum dibuat.</div>
    </div>
  );
}