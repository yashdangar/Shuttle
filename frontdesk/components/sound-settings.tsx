"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SoundSettings() {
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    // Load sound preference from localStorage
    const savedPreference = localStorage.getItem("frontdesk-sound-enabled");
    if (savedPreference !== null) {
      setSoundEnabled(savedPreference === "true");
    }
  }, []);

  const toggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    localStorage.setItem("frontdesk-sound-enabled", enabled.toString());
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          Notification Sounds
        </CardTitle>
        <CardDescription>
          Control whether you hear sounds when notifications arrive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="sound-toggle" className="text-sm font-medium">
            Enable notification sounds
          </Label>
          <Switch
            id="sound-toggle"
            checked={soundEnabled}
            onCheckedChange={toggleSound}
          />
        </div>
        
        <p className="text-xs text-gray-500">
          {soundEnabled 
            ? "You will hear a notification tone when new notifications arrive."
            : "Notification sounds are disabled. You will only see visual notifications."
          }
        </p>
      </CardContent>
    </Card>
  );
} 