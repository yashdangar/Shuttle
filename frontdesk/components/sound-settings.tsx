"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const testSound = () => {
    if (soundEnabled) {
      try {
        // Try to play the tone.mp3 file for testing
        const audio = new Audio('/tone.mp3');
        audio.volume = 0.5;
        audio.play().catch((error) => {
          console.warn('Failed to play tone.mp3 for testing, falling back to beep:', error);
          // Fallback to beep sound
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        });
      } catch (error) {
        console.warn('Failed to play test sound:', error);
      }
    }
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
        
        <Button
          variant="outline"
          onClick={testSound}
          disabled={!soundEnabled}
          className="w-full"
        >
          Test Sound
        </Button>
        
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