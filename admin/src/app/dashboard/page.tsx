'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
    const [adminData, setAdminData] = useState<any>(null);

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                const response = await fetch('/api/admin', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                setAdminData(data.admin);
            } catch (error) {
                console.error('Error fetching admin data:', error);
            }
        };

        fetchAdminData();
    }, []);

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Welcome to Admin Dashboard</h2>
            {adminData && (
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-medium">Admin Information</h3>
                        <p>Name: {adminData.name}</p>
                        <p>Email: {adminData.email}</p>
                    </div>
                </div>
            )}
        </div>
    );
} 