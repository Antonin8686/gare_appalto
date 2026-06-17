import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { TokenResponse, User } from "../types/auth";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

const api = axios.create({
  baseURL: "/api",
});

let refreshPromise: Promise<string> | null = null;

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) {
    throw new Error("No refresh token");
  }

  const { data } = await axios.post<{ access: string; refresh?: string }>(
    "/api/auth/token/refresh/",
    { refresh },
  );

  localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
  if (data.refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
  }
  return data.access;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/token/")
    ) {
      originalRequest._retry = true;

      try {
        refreshPromise ??= refreshAccessToken();
        const newToken = await refreshPromise;
        refreshPromise = null;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        refreshPromise = null;
        clearTokens();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export interface HealthResponse {
  status: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>("/health/");
  return data;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/token/", { email, password });
  return data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me/");
  return data;
}

export async function logoutApi(): Promise<void> {
  const refresh = getRefreshToken();
  if (!refresh) {
    return;
  }

  try {
    await api.post("/auth/token/logout/", { refresh });
  } catch {
    // Il token potrebbe essere già scaduto o revocato.
  } finally {
    clearTokens();
  }
}

export default api;
