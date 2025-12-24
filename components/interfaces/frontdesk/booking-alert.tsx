"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Bell,
  BellRing,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";


const STORAGE_KEY = "frontdesk_last_alert_count";

// Create alert sound player using HTML5 Audio - PLAYS YOUR MP3 FILE
class AlertSoundGenerator {
  private audio: HTMLAudioElement | null = null;
  private isPlaying = false;
  private intervalId: NodeJS.Timeout | null = null;
  private isLoaded = false;
  
  constructor() {
    if (typeof window !== "undefined") {
      this.initializeAudio();
    }
  }

  private initializeAudio() {
    try {
      this.audio = document.createElement('audio');
      this.audio.preload = 'auto';
      this.audio.volume = 1.0;
      
      const source = document.createElement('source');
      source.src = '/sounds/notification.mp3';
      source.type = 'audio/mpeg';
      this.audio.appendChild(source);
      
      this.audio.addEventListener('canplaythrough', () => {
        this.isLoaded = true;
      });

      this.audio.load();
    } catch (error) {
      console.error("Failed to initialize audio:", error);
    }
  }

  playAlertPattern() {
    if (!this.audio) return;

    try {
      this.audio.currentTime = 0;
      const playPromise = this.audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Audio playback failed:", error);
        });
      }
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  }

  startLoop() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    
    this.playAlertPattern();
    
    this.intervalId = setInterval(() => {
      if (this.isPlaying) {
        this.playAlertPattern();
      }
    }, 3000);
  }

  // Stop looping
  stopLoop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  getIsPlaying() {
    return this.isPlaying;
  }
}

export function FrontdeskBookingAlert() {
  const { user, status } = useAuthSession();
  const isFrontdesk = user?.role === "frontdesk";

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [newBookingCount, setNewBookingCount] = useState(0);

  const alertSoundRef = useRef<AlertSoundGenerator | null>(null);
  const previousCountRef = useRef<number>(0);
  const hasInitializedRef = useRef(false);

  // Query for booking alerts - only for frontdesk users
  const bookingAlerts = useQuery(
    api.bookings.alerts.getUnacknowledgedBookingAlerts,
    isFrontdesk && user?.id
      ? { frontdeskUserId: user.id as Id<"users"> }
      : "skip"
  );



  // Initialize alert sound generator
  useEffect(() => {
    if (typeof window !== "undefined") {
      alertSoundRef.current = new AlertSoundGenerator();
    }

    return () => {
      if (alertSoundRef.current) {
        alertSoundRef.current.stopLoop();
      }
    };
  }, []);

  const playAlertSound = useCallback(() => {
    if (!alertSoundRef.current || isPlaying) return;

    try {
      alertSoundRef.current.startLoop();
      setIsPlaying(true);
    } catch (error) {
      console.error("Could not play alert sound:", error);
    }
  }, [isPlaying]);

  // Stop alert sound
  const stopAlertSound = useCallback(() => {
    if (alertSoundRef.current) {
      alertSoundRef.current.stopLoop();
    }
    setIsPlaying(false);
  }, []);

  // Handle new booking alerts
  useEffect(() => {
    if (!isFrontdesk || status === "loading" || bookingAlerts === undefined)
      return;

    const currentCount = bookingAlerts?.length ?? 0;

    // Initialize previous count from storage on first load
    if (!hasInitializedRef.current) {
      const storedCount = localStorage.getItem(STORAGE_KEY);
      previousCountRef.current = storedCount ? parseInt(storedCount, 10) : 0;
      hasInitializedRef.current = true;
    }

    // Check if there are new bookings (count increased)
    if (currentCount > previousCountRef.current && currentCount > 0) {
      // New booking(s) arrived!
      const newCount = currentCount - previousCountRef.current;
      setNewBookingCount(newCount);
      setIsAlertOpen(true);

      // Play sound automatically
      playAlertSound();

      toast.info(
        `${newCount} new booking(s) arrived!`,
        {
          description: "Please check the booking alerts.",
          duration: 5000,
        }
      );
      
      // Update previous count immediately so we don't count these again
      previousCountRef.current = currentCount;
      localStorage.setItem(STORAGE_KEY, currentCount.toString());
    }

    // If alerts are dismissed and count is 0, stop sound
    if (currentCount === 0 && isPlaying) {
      stopAlertSound();
    }
  }, [
    bookingAlerts,
    isFrontdesk,
    status,
    playAlertSound,
    stopAlertSound,
    isPlaying,
  ]);

  // Handle closing the alert (when user clicks Close or goes to bookings)
  const handleCloseAlert = useCallback(() => {
    setIsAlertOpen(false);
    stopAlertSound();
    setNewBookingCount(0);
  }, [stopAlertSound]);

  // Handle going to bookings page
  const handleGoToBookings = () => {
    handleCloseAlert();
    window.location.href = "/frontdesk/bookings";
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Don't render anything if not frontdesk
  if (!isFrontdesk || status === "loading") {
    return null;
  }

  return (
    <>
      {/* Alert Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseAlert();
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-primary/10 rounded-full">
                <BellRing
                  className={cn(
                    "h-7 w-7 text-primary",
                    isPlaying && "animate-bounce"
                  )}
                />
              </div>
              <div className="flex-1">
                New Booking Alert
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {isPlaying
                ? "🔔 New booking(s) require your attention!"
                : "Review your pending bookings"}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Booking Notification */}
          <div className="py-12">
            {newBookingCount > 0 ? (
              <div className="text-center space-y-6">
                <div className="inline-block p-6 bg-primary/10 rounded-full">
                  <BellRing className="h-16 w-16 text-primary animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold">
                    {newBookingCount} {newBookingCount === 1 ? "Booking" : "Bookings"} Arrived!
                  </h3>
                  <p className="text-muted-foreground text-lg">
                    New {newBookingCount === 1 ? "reservation has" : "reservations have"} been received
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="inline-block p-4 bg-muted rounded-full">
                  <Bell className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-medium text-muted-foreground">
                    No pending booking alerts
                  </p>
                  <p className="text-sm text-muted-foreground/80">
                    You&apos;re all caught up!
                  </p>
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter className="gap-2">
            <Button
              onClick={handleCloseAlert}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              Close
            </Button>
            <Button
              onClick={handleGoToBookings}
              className="flex-1 sm:flex-none gap-2"
            >
              Go to Bookings Page
              <ChevronRight className="h-4 w-4" />
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
