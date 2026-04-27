const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

class ApiClient {
  private baseUrl: string;
  private refreshing: Promise<void> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem("access_token");
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem("refresh_token");
  }

  private getHeaders(contentType?: string): HeadersInit {
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    return headers;
  }

  private async refreshIfNeeded(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error("Not authenticated");

    if (!this.refreshing) {
      this.refreshing = (async () => {
        const res = await fetch(`${this.baseUrl}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          throw new Error("Session expired");
        }
        const data = await res.json();
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
      })().finally(() => {
        this.refreshing = null;
      });
    }

    await this.refreshing;
  }

  private async request<T>(path: string, init: RequestInit, retry = true): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, init);
    if (response.status === 401 && retry) {
      await this.refreshIfNeeded();
      const retryInit: RequestInit = {
        ...init,
        headers: {
          ...(init.headers || {}),
          ...this.getHeaders((init.headers as Record<string, string> | undefined)?.["Content-Type"]),
        },
      };
      return this.request<T>(path, retryInit, false);
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || "Request failed");
    }
    return response.json();
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return this.request<T>(url.toString().replace(this.baseUrl, ""), {
      headers: this.getHeaders(),
    });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      headers: this.getHeaders("application/json"),
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async postForm<T>(path: string, formData: FormData): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      headers: this.getHeaders(),
      body: formData,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      headers: this.getHeaders("application/json"),
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export { API_BASE_URL };
