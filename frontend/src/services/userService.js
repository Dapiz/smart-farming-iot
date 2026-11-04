import api from './api';

export const userService = {
  async updateProfile(payload) {
    const { data } = await api.put('/auth/profile', payload);
    return data.data;
  },
  async changePassword(payload) {
    const { data } = await api.put('/auth/password', payload);
    return data.data;
  },
};