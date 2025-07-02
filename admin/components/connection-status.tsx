"use client";

import { useWebSocket } from "@/context/WebSocketContext";
import { Wifi, WifiOff } from "lucide-react";

export function ConnectionStatus() {
  const { isConnected } = useWebSocket();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
        isConnected 
          ? 'bg-green-100 text-green-700 border border-green-200' 
          : 'bg-red-100 text-red-700 border border-red-200'
      }`}>
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Disconnected</span>
          </>
        )}
      </div>
    </div>
  );
} 