require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');

const routes = require('./routes');
const { fail } = require('./utils/response');
const { initSocket } = require('./sockets');
const { markStaleDevicesOffline } = require('./services/devicePresence');

const app = express();
const httpServer = http.createServer(app);

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend Smart Farming IoT berjalan', time: new Date() });
});

// Semua route API
app.use('/api', routes);

// 404
app.use((req, res) => fail(res, 'Endpoint tidak ditemukan', 404));

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  return fail(res, err.message || 'Internal Server Error', err.status || 500);
});

// ===== Socket.IO =====
initSocket(httpServer);

// ===== Cron: cek device offline tiap 20 detik =====
setInterval(markStaleDevicesOffline, 20 * 1000);

// ===== Cron: expire command PENDING > 5 menit tiap 30 detik =====
const { expireStaleCommands } = require('./services/commandExpiry');
setInterval(expireStaleCommands, 30 * 1000);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend berjalan di http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Socket.IO siap di port ${PORT}`);
});