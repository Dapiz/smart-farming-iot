import api from './api';

export const deviceService = {
  async list() {
    const { data } = await api.get('/devices');
    return data.data;
  },
  async detail(id) {
    const { data } = await api.get(`/devices/${id}`);
    return data.data;
  },
  async create(payload) {
    const { data } = await api.post('/devices', payload);
    return data.data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/devices/${id}`, payload);
    return data.data;
  },
  async remove(id) {
    const { data } = await api.delete(`/devices/${id}`);
    return data.data;
  },
  async regenerateToken(id) {
    const { data } = await api.post(`/devices/${id}/regenerate-token`);
    return data.data;
  },
};