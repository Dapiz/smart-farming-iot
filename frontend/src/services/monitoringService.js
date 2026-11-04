import api from './api';

export const monitoringService = {
  async history(deviceId, range = '24h') {
    const { data } = await api.get(`/devices/${deviceId}/history`, { params: { range } });
    return data.data;
  },
  async summary() {
    const { data } = await api.get('/dashboard/summary');
    return data.data;
  },
  async updateSettings(deviceId, payload) {
    const { data } = await api.put(`/devices/${deviceId}/settings`, payload);
    return data.data;
  },
};