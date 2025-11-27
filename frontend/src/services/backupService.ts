import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create authenticated axios instance for backup operations
const backupApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
backupApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
backupApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('adminToken');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export interface Backup {
  id: string;
  filename: string;
  path: string;
  size: number;
  createdAt: string;
  downloadUrl?: string;
}

export const backupService = {
  // Get all backups
  getBackups: async (): Promise<Backup[]> => {
    const response = await backupApi.get('/backups');
    return response.data;
  },

  // Create a new backup
  createBackup: async (name?: string): Promise<Backup> => {
    const response = await backupApi.post('/backups', { name });
    return response.data;
  },

  // Restore a backup
  restoreBackup: async (filename: string): Promise<void> => {
    await backupApi.post(`/backups/restore/${filename}`);
  },

  // Delete a backup
  deleteBackup: async (filename: string): Promise<void> => {
    await backupApi.delete(`/backups/${filename}`);
  },

  // Format file size
  formatSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
};
