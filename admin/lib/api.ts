export const api = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    // Get token from cookies
    const token = localStorage.getItem("adminToken") || null;
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
      {
        ...options,
        headers,
      }
    );
    const data = await response.json();
    // console.log(data);
    if (data.message === "Invalid token") {
      localStorage.removeItem("adminToken");
      window.location.href = "/login";
    }
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "API request failed");
    }
    return data;
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
