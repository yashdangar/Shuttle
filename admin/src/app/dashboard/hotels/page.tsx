'use client';

import { useState } from 'react';

export default function HotelsPage() {
    const [formData, setFormData] = useState({
        name: '',
        propertyCode: '',
        ohipClientId: '',
        ohipClientSecret: '',
        ohipBaseUrl: '',
        environment: 'sandbox',
        scopes: ['reservation.read', 'profile.read']
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch('/api/admin/add/hotel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to add hotel');
            }

            setSuccess('Hotel added successfully');
            setFormData({
                name: '',
                propertyCode: '',
                ohipClientId: '',
                ohipClientSecret: '',
                ohipBaseUrl: '',
                environment: 'sandbox',
                scopes: ['reservation.read', 'profile.read']
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add hotel');
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Add Hotel</h2>
            
            {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
                    {error}
                </div>
            )}
            
            {success && (
                <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-md">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Hotel Name
                    </label>
                    <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="propertyCode" className="block text-sm font-medium text-gray-700">
                        Property Code
                    </label>
                    <input
                        type="text"
                        id="propertyCode"
                        value={formData.propertyCode}
                        onChange={(e) => setFormData({ ...formData, propertyCode: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="ohipClientId" className="block text-sm font-medium text-gray-700">
                        OHIP Client ID
                    </label>
                    <input
                        type="text"
                        id="ohipClientId"
                        value={formData.ohipClientId}
                        onChange={(e) => setFormData({ ...formData, ohipClientId: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="ohipClientSecret" className="block text-sm font-medium text-gray-700">
                        OHIP Client Secret
                    </label>
                    <input
                        type="password"
                        id="ohipClientSecret"
                        value={formData.ohipClientSecret}
                        onChange={(e) => setFormData({ ...formData, ohipClientSecret: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="ohipBaseUrl" className="block text-sm font-medium text-gray-700">
                        OHIP Base URL
                    </label>
                    <input
                        type="url"
                        id="ohipBaseUrl"
                        value={formData.ohipBaseUrl}
                        onChange={(e) => setFormData({ ...formData, ohipBaseUrl: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="environment" className="block text-sm font-medium text-gray-700">
                        Environment
                    </label>
                    <select
                        id="environment"
                        value={formData.environment}
                        onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                    >
                        <option value="sandbox">Sandbox</option>
                        <option value="production">Production</option>
                    </select>
                </div>

                <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Add Hotel
                </button>
            </form>
        </div>
    );
} 