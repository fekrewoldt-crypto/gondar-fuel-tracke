import axios from 'axios';
import type { User, Tokens, LoginCredentials, RegisterData } from '../types/user.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token } = response.data;
        localStorage.setItem('accessToken', access_token);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear auth and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<{ user: User; tokens: Tokens }> {
    const response = await api.post('/auth/register', data);
    const { user, tokens } = response.data;

    // Store tokens
    localStorage.setItem('accessToken', tokens.access_token);
    localStorage.setItem('refreshToken', tokens.refresh_token);
    localStorage.setItem('user', JSON.stringify(user));

    return { user, tokens };
  },

  /**
   * Login with phone and password
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: Tokens }> {
    const response = await api.post('/auth/login', credentials);
    const { user, tokens } = response.data;

    // Store tokens
    localStorage.setItem('accessToken', tokens.access_token);
    localStorage.setItem('refreshToken', tokens.refresh_token);
    localStorage.setItem('user', JSON.stringify(user));

    return { user, tokens };
  },

  /**
   * Login with OAuth provider
   */
  async loginWithOAuth(provider: string, idToken: string): Promise<{ user: User; tokens: Tokens; isNewUser: boolean }> {
    const response = await api.post('/auth/login/oauth', {
      provider,
      id_token: idToken,
    });
    const { user, tokens, is_new_user } = response.data;

    // Store tokens
    localStorage.setItem('accessToken', tokens.access_token);
    localStorage.setItem('refreshToken', tokens.refresh_token);
    localStorage.setItem('user', JSON.stringify(user));

    return { user, tokens, isNewUser: is_new_user };
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore errors - still clear local data
      console.error('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    const response = await api.get('/auth/me');
    const user = response.data;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  },

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.patch('/auth/me', data);
    const user = response.data;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(phone: string): Promise<{ message: string }> {
    const response = await api.post('/auth/password-reset/request', { phone });
    return response.data;
  },

  /**
   * Reset password with code
   */
  async resetPassword(
    phone: string,
    code: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const response = await api.post('/auth/password-reset/verify', {
      phone,
      code,
      new_password: newPassword,
    });
    return response.data;
  },

  /**
   * Get cached user from localStorage
   */
  getCachedUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  },

  /**
   * Get access token
   */
  getToken(): string | null {
    return localStorage.getItem('accessToken');
  },
};

export default authService;
