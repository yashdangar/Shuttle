"use client";

export default function EnvCheckPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Check</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">API URL:</h2>
          <p className="bg-gray-100 p-2 rounded">
            {process.env.NEXT_PUBLIC_API_URL || "Not set"}
          </p>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">WebSocket URL:</h2>
          <p className="bg-gray-100 p-2 rounded">
            {process.env.NEXT_PUBLIC_WEBSOCKET_URL || "Not set"}
          </p>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Google Maps API Key:</h2>
          <p className="bg-gray-100 p-2 rounded">
            {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "Set" : "Not set"}
          </p>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Node Environment:</h2>
          <p className="bg-gray-100 p-2 rounded">
            {process.env.NODE_ENV || "Not set"}
          </p>
        </div>
      </div>
    </div>
  );
} 