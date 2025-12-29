const API_BASE_URL = 'http://localhost:3001/api';

export const api = {
    // Auth
    login: async (credentials) => {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
        return response.json();
    },

    // Displays
    getDisplays: async () => {
        const response = await fetch(`${API_BASE_URL}/displays`);
        return response.json();
    },
    addDisplay: async (formData) => {
        const response = await fetch(`${API_BASE_URL}/displays`, {
            method: 'POST',
            body: formData, // FormData for file upload
        });
        return response.json();
    },
    updateDisplay: async (id, formData) => {
        const response = await fetch(`${API_BASE_URL}/displays/${id}`, {
            method: 'PUT',
            body: formData,
        });
        return response.json();
    },
    deleteDisplay: async (id) => {
        const response = await fetch(`${API_BASE_URL}/displays/${id}`, {
            method: 'DELETE',
        });
        return response.json();
    },

    // Ads
    getAds: async () => {
        const response = await fetch(`${API_BASE_URL}/ads`);
        return response.json();
    },
    addAd: async (formData) => {
        const response = await fetch(`${API_BASE_URL}/ads`, {
            method: 'POST',
            body: formData,
        });
        return response.json();
    },
    updateAd: async (id, formData) => {
        const response = await fetch(`${API_BASE_URL}/ads/${id}`, {
            method: 'PUT',
            body: formData,
        });
        return response.json();
    },
    deleteAd: async (id) => {
        const response = await fetch(`${API_BASE_URL}/ads/${id}`, {
            method: 'DELETE',
        });
        return response.json();
    },

    // Groups
    getGroups: async () => {
        const response = await fetch(`${API_BASE_URL}/groups`);
        return response.json();
    },
    saveGroups: async (groups) => {
        const response = await fetch(`${API_BASE_URL}/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(groups),
        });
        return response.json();
    },
    deleteGroup: async (groupId) => {
        const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
            method: 'DELETE',
        });
        return response.json();
    },

    // Users (Installers)
    getUsers: async () => {
        const response = await fetch(`${API_BASE_URL}/users`);
        return response.json();
    },
    addUser: async (user) => {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
        });
        return response.json();
    },
    updateUser: async (id, user) => {
        const response = await fetch(`${API_BASE_URL}/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
        });
        return response.json();
    },
    deleteUser: async (id) => {
        const response = await fetch(`${API_BASE_URL}/users/${id}`, {
            method: 'DELETE',
        });
        return response.json();
    }
};
