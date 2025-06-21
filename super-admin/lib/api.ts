const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getToken(): string | null {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("superAdminToken");
      console.log("Token from localStorage:", token);
      return token;
    }
    return null;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "An error occurred",
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to parse response",
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: "Network error",
      };
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "POST",
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: "Network error",
      };
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: "Network error",
      };
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: "Network error",
      };
    }
  }
}

// Create and export the API client instance
export const api = new ApiClient(API_BASE_URL);

// Auth-specific API methods
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post<{ message: string; token: string }>(
      "/super-admin/login",
      { email, password }
    );

    console.log("Login response:", response);

    if (response.success && response.data?.token) {
      console.log("Storing token:", response.data.token);
      // Store token in localStorage
      localStorage.setItem("superAdminToken", response.data.token);
    }

    return response;
  },

  logout: () => {
    localStorage.removeItem("superAdminToken");
  },

  getCurrentUser: () => {
    return api.get("/super-admin");
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem("superAdminToken");
  },
};

// Hotels API
export const hotelsApi = {
  getAll: () => {
    return api.get("/super-admin/hotels");
  },

  getDetails: (id: number) => {
    return api.get(`/super-admin/hotels/${id}`);
  },
};

// Admins API
export const adminsApi = {
  getAll: () => {
    return api.get("/super-admin/admins");
  },

  create: (adminData: { name: string; email: string; password: string }) => {
    return api.post("/super-admin/admins", adminData);
  },

  update: (
    id: number,
    adminData: {
      name?: string;
      email?: string;
      password?: string;
      hotelId?: number | null;
    }
  ) => {
    return api.put(`/super-admin/admins/${id}`, adminData);
  },

  delete: (id: number) => {
    return api.delete(`/super-admin/admins/${id}`);
  },
};

// Locations API
export const locationsApi = {
  getAll: () => {
    return api.get("/super-admin/locations");
  },

  create: (locationData: {
    name: string;
    latitude: number;
    longitude: number;
  }) => {
    return api.post("/super-admin/locations", locationData);
  },

  update: (
    id: number,
    locationData: { name?: string; latitude?: number; longitude?: number }
  ) => {
    return api.put(`/super-admin/locations/${id}`, locationData);
  },

  delete: (id: number) => {
    return api.delete(`/super-admin/locations/${id}`);
  },
};
