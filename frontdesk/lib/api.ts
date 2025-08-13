const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("frontdeskToken");
  if (!token) {
    window.location.href = "/";
    throw new Error("No token found");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("frontdeskToken");
    window.location.href = "/";
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
}

export const api = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem("frontdeskToken");
    if (!token) {
      window.location.href = "/";
      throw new Error("No token found");
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem("frontdeskToken");
      window.location.href = "/";
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(
        errorData.error || errorData.message || "API request failed"
      );
      (error as any).response = { data: errorData, status: response.status };
      throw error;
    }

    return response.json();
  },

  async get(endpoint: string) {
    return this.fetch(endpoint);
  },

  async post(endpoint: string, data: any) {
    return this.fetch(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async put(endpoint: string, data: any) {
    return this.fetch(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(endpoint: string) {
    return this.fetch(endpoint, {
      method: "DELETE",
    });
  },

  // Dashboard specific methods
  async getLiveShuttleData() {
    return this.get("/frontdesk/dashboard/live-shuttles");
  },

  async getPendingBookingsLastHour() {
    return this.get("/frontdesk/dashboard/pending-bookings");
  },

  async getSchedules(params?: URLSearchParams) {
    return this.get(
      `/frontdesk/get/schedule${params ? `?${params.toString()}` : ""}`
    );
  },
};

// Public API (no auth header, for routes like login/forgot-password)
export const apiPublic = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(
        (errorData as any).error || (errorData as any).message || "API request failed"
      );
      (error as any).response = { data: errorData, status: response.status };
      throw error;
    }

    return response.json();
  },

  async get(endpoint: string) {
    return this.fetch(endpoint);
  },

  async post(endpoint: string, data: any) {
    return this.fetch(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async put(endpoint: string, data: any) {
    return this.fetch(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(endpoint: string) {
    return this.fetch(endpoint, {
      method: "DELETE",
    });
  },
};