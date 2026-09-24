import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

/** Smart Report for one LIMS visit — computed live on the server, nothing is stored */
export async function getSmartReport(visitNo) {
  const { data } = await api.get(`/smart-report/${encodeURIComponent(visitNo)}`);
  return data;
}

/** Server error message, or a readable fallback */
export function errorMessage(err) {
  return err?.response?.data?.message || (err?.code === 'ERR_NETWORK' ? 'Cannot reach the Smart Report server' : err?.message) || 'Something went wrong';
}

export default api;
