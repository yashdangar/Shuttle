export const api = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    // Get token from localStorage
    const token = localStorage.getItem("guestToken");


    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };


    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        {
          ...options,
          headers,
          credentials: 'include', // Include credentials for CORS
        }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));

        throw new Error(error.error || error.message || "API request failed");
      }

      const data = await response.json();
      console.log(`[API DEBUG] Response data:`, data);
      return data;
    } catch (error) {
      console.error(`[API DEBUG] Fetch error:`, error);
      throw error;
    }
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
