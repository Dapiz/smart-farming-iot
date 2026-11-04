import { useEffect } from 'react';
import { getSocket } from '../services/socket';

/**
 * Hook untuk subscribe event Socket.IO.
 * @param {Object} handlers - { 'device:update': fn, 'device:offline': fn, ... }
 * @param {Array} deps - dependency (mis. [deviceId]) untuk re-subscribe
 */
export function useDeviceSocket(handlers, deps = []) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const entries = Object.entries(handlers);
    entries.forEach(([evt, fn]) => socket.on(evt, fn));

    return () => {
      entries.forEach(([evt, fn]) => socket.off(evt, fn));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}