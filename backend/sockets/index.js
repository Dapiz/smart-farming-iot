const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwt');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true,
    },
  });

  // Auth middleware: JWT dari handshake.auth.token
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Token tidak ditemukan'));
      const payload = verifyAccessToken(token);
      socket.user = { id: payload.id, email: payload.email };
      return next();
    } catch (err) {
      return next(new Error('Token tidak valid'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);
    console.log(`🔌 Socket connected: user#${userId} (${socket.id})`);

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnect: user#${userId}`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };