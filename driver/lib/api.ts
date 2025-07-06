export const api = {
    async fetch(endpoint: string, options: RequestInit = {}) {
        const token = localStorage.getItem("driverToken");
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers,
        };

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json();
            const error = new Error(errorData.message || 'API request failed');
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
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async put(endpoint: string, data: any) {
        return this.fetch(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async delete(endpoint: string) {
        return this.fetch(endpoint, {
            method: 'DELETE',
        });
    },
};