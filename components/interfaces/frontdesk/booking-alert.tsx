"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  BellRing,
  Check,
  ChevronRight,
  Users,
  Luggage,
  DollarSign,
  Clock,
  Calendar,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BookingAlert {
  notificationId: Id<"notifications">;
  bookingId: Id<"bookings">;
  guestName: string;
  guestEmail: string;
  seats: number;
  bags: number;
  notes: string;
  totalPrice: number;
  createdAt: number;
  tripDetails: {
    tripName: string;
    scheduledDate: string;
    scheduledStartTime: string;
  } | null;
}

const STORAGE_KEY = "frontdesk_last_alert_count";
const AUDIO_PERMISSION_KEY = "frontdesk_audio_permission";

// Create alert sound using Web Audio API (no external file needed)
class AlertSoundGenerator {
  private audioContext: AudioContext | null = null;
  private isPlaying = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  // Play a notification beep pattern
  private playBeep(frequency: number, duration: number, volume: number = 0.3) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    // Envelope for smooth sound
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + duration * 0.5);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  // Play the full alert pattern (ding-dong style)
  playAlertPattern() {
    if (!this.audioContext) return;

    // Resume audio context if suspended
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    // Play a pleasant two-tone alert
    this.playBeep(880, 0.15, 0.4); // High tone (A5)
    setTimeout(() => this.playBeep(660, 0.2, 0.35), 150); // Lower tone (E5)
    setTimeout(() => this.playBeep(880, 0.15, 0.3), 400); // High tone again
  }

  // Start looping alert
  startLoop() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    
    // Play immediately
    this.playAlertPattern();
    
    // Then loop every 2.5 seconds
    this.intervalId = setInterval(() => {
      if (this.isPlaying) {
        this.playAlertPattern();
      }
    }, 2500);
  }

  // Stop looping
  stopLoop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Test if audio context is available
  async testPermission(): Promise<boolean> {
    if (!this.audioContext) return false;
    
    try {
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      // Play a very quiet test beep
      this.playBeep(440, 0.05, 0.01);
      return true;
    } catch (error) {
      console.warn("Audio permission test failed:", error);
      return false;
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
  const [audioEnabled, setAudioEnabled] = useState(true);
  // Track if user has granted audio permission through interaction
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

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

  const acknowledgeAlert = useMutation(
    api.bookings.alerts.acknowledgeBookingAlert
  );
  const acknowledgeAllAlerts = useMutation(
    api.bookings.alerts.acknowledgeAllBookingAlerts
  );

  // Check if permission was previously granted (stored in localStorage)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedPermission = localStorage.getItem(AUDIO_PERMISSION_KEY);
      if (storedPermission === "granted") {
        setAudioPermissionGranted(true);
      }
    }
  }, []);

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

  // Function to request audio permission through user interaction
  const requestAudioPermission = useCallback(async () => {
    if (!alertSoundRef.current) return false;

    try {
      const success = await alertSoundRef.current.testPermission();
      if (success) {
        // Permission granted!
        setAudioPermissionGranted(true);
        localStorage.setItem(AUDIO_PERMISSION_KEY, "granted");
        setShowPermissionPrompt(false);
        toast.success("Sound alerts enabled! You'll hear alerts for new bookings.");
        return true;
      }
      return false;
    } catch (error) {
      console.warn("Could not get audio permission:", error);
      toast.error("Could not enable sound. Please try again.");
      return false;
    }
  }, []);

  // Play alert sound
  const playAlertSound = useCallback(() => {
    if (!alertSoundRef.current || !audioEnabled || !audioPermissionGranted || isPlaying)
      return;

    alertSoundRef.current.startLoop();
    setIsPlaying(true);
  }, [audioEnabled, audioPermissionGranted, isPlaying]);

  // Stop alert sound
  const stopAlertSound = useCallback(() => {
    if (alertSoundRef.current) {
      alertSoundRef.current.stopLoop();
    }
    setIsPlaying(false);
  }, []);

  // Show permission prompt for frontdesk users who haven't granted permission
  useEffect(() => {
    if (isFrontdesk && !audioPermissionGranted && status !== "loading") {
      // Show permission prompt after a short delay
      const timer = setTimeout(() => {
        setShowPermissionPrompt(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isFrontdesk, audioPermissionGranted, status]);

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
      setIsAlertOpen(true);

      // Try to play sound if permission granted
      if (audioPermissionGranted && audioEnabled) {
        playAlertSound();
      } else if (!audioPermissionGranted) {
        // Show permission prompt if not granted
        setShowPermissionPrompt(true);
      }

      toast.info(
        `${currentCount - previousCountRef.current} new booking(s) arrived!`,
        {
          description: "Please acknowledge the booking alerts.",
          duration: 5000,
        }
      );
    }

    // Update stored count
    previousCountRef.current = currentCount;
    localStorage.setItem(STORAGE_KEY, currentCount.toString());

    // If alerts are acknowledged (count is 0), stop sound
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
    audioPermissionGranted,
    audioEnabled,
  ]);

  // Handle acknowledging a single alert
  const handleAcknowledgeOne = async (notificationId: Id<"notifications">) => {
    if (!user?.id) return;

    try {
      await acknowledgeAlert({
        frontdeskUserId: user.id as Id<"users">,
        notificationId,
      });

      // If this was the last alert, close dialog and stop sound
      if (bookingAlerts && bookingAlerts.length <= 1) {
        setIsAlertOpen(false);
        stopAlertSound();
      }

      toast.success("Booking alert acknowledged");
    } catch (error) {
      toast.error("Failed to acknowledge alert");
    }
  };

  // Handle acknowledging all alerts
  const handleAcknowledgeAll = async () => {
    if (!user?.id) return;

    try {
      const result = await acknowledgeAllAlerts({
        frontdeskUserId: user.id as Id<"users">,
      });

      setIsAlertOpen(false);
      stopAlertSound();

      toast.success(`${result.acknowledgedCount} booking alert(s) acknowledged`);
    } catch (error) {
      toast.error("Failed to acknowledge alerts");
    }
  };

  // Handle "I'm Here" button
  const handleImHere = () => {
    stopAlertSound();
    // Keep dialog open so user can review bookings
    toast.success("Great! Please review the pending bookings below.");
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

  // Handle enabling sound with permission
  const handleEnableSound = async () => {
    const success = await requestAudioPermission();
    if (success) {
      setAudioEnabled(true);
      // If there are pending alerts, start playing
      if (bookingAlerts && bookingAlerts.length > 0) {
        // Small delay to ensure audio is ready
        setTimeout(() => {
          playAlertSound();
          setIsAlertOpen(true);
        }, 100);
      }
    }
  };

  // Don't render anything if not frontdesk
  if (!isFrontdesk || status === "loading") {
    return null;
  }

  const alertCount = bookingAlerts?.length ?? 0;

  return (
    <>
      {/* Audio Permission Prompt - Shows until user enables sound */}
      {showPermissionPrompt && !audioPermissionGranted && (
        <div className="fixed top-4 right-4 z-100 animate-in slide-in-from-top-2">
          <div className="bg-card border rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Volume2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm">Enable Sound Alerts</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Click to enable sound notifications for new bookings. You&apos;ll
                  hear an alert when guests make reservations.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleEnableSound}
                    className="flex-1"
                  >
                    <Volume2 className="h-4 w-4 mr-1" />
                    Enable Sound
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowPermissionPrompt(false);
                      setAudioEnabled(false);
                    }}
                  >
                    Later
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Alert Button - Shows when there are pending alerts but dialog is closed */}
      {alertCount > 0 && !isAlertOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => {
              setIsAlertOpen(true);
              if (alertCount > 0 && audioPermissionGranted && audioEnabled) {
                playAlertSound();
              }
            }}
            className={cn(
              "relative h-14 w-14 rounded-full shadow-lg transition-all",
              isPlaying && "animate-pulse bg-red-500 hover:bg-red-600"
            )}
            size="icon"
          >
            {isPlaying ? (
              <BellRing className="h-6 w-6 animate-bounce" />
            ) : (
              <Bell className="h-6 w-6" />
            )}
            <Badge className="absolute -right-1 -top-1 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-red-600 text-white">
              {alertCount}
            </Badge>
          </Button>
        </div>
      )}

      {/* Alert Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <BellRing
                className={cn(
                  "h-6 w-6",
                  isPlaying && "animate-bounce text-red-500"
                )}
              />
              New Booking Alert{alertCount > 1 ? "s" : ""}!
              <Badge variant="destructive" className="ml-2">
                {alertCount} pending
              </Badge>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPlaying
                ? '🔔 New booking(s) require your attention. Click "I\'m Here" to acknowledge.'
                : "Review and manage the pending booking alerts below."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Booking List */}
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-3">
              {bookingAlerts?.map((alert: BookingAlert) => (
                <div
                  key={alert.notificationId}
                  className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-base">
                          {alert.guestName}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(alert.createdAt)}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {alert.guestEmail}
                      </p>

                      {alert.tripDetails && (
                        <div className="flex flex-wrap gap-2 text-sm">
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            <Calendar className="h-3 w-3" />
                            {alert.tripDetails.scheduledDate}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {alert.tripDetails.scheduledStartTime}
                          </Badge>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {alert.seats} seat{alert.seats > 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Luggage className="h-4 w-4" />
                          {alert.bags} bag{alert.bags !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-green-600">
                          <DollarSign className="h-4 w-4" />
                          ${alert.totalPrice.toFixed(2)}
                        </span>
                      </div>

                      {alert.notes && (
                        <p className="text-sm text-muted-foreground italic">
                          &ldquo;{alert.notes}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcknowledgeOne(alert.notificationId)}
                        className="flex items-center gap-1"
                      >
                        <Check className="h-4 w-4" />
                        Acknowledge
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          window.location.href = `/frontdesk/bookings/${alert.bookingId}`;
                        }}
                        className="flex items-center gap-1"
                      >
                        View
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {alertCount === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No pending booking alerts</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            {isPlaying && (
              <Button
                onClick={handleImHere}
                variant="default"
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              >
                <Check className="mr-2 h-4 w-4" />
                I&apos;m Here
              </Button>
            )}

            {alertCount > 1 && (
              <Button
                onClick={handleAcknowledgeAll}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Acknowledge All ({alertCount})
              </Button>
            )}

            <AlertDialogAction
              onClick={() => {
                setIsAlertOpen(false);
                stopAlertSound();
              }}
              className="w-full sm:w-auto"
            >
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Audio Toggle Button - Always visible for frontdesk */}
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          onClick={async () => {
            if (!audioPermissionGranted) {
              // First time - need to get permission
              await handleEnableSound();
            } else {
              // Toggle on/off
              const newState = !audioEnabled;
              setAudioEnabled(newState);
              if (!newState && isPlaying) {
                stopAlertSound();
              }
              toast.info(
                newState ? "Alert sounds enabled" : "Alert sounds disabled"
              );
            }
          }}
          variant="outline"
          size="sm"
          className={cn("shadow-md", !audioEnabled && "bg-muted")}
        >
          {audioEnabled && audioPermissionGranted ? (
            <>
              <Volume2 className="h-4 w-4 mr-1" />
              Sound On
            </>
          ) : (
            <>
              <VolumeX className="h-4 w-4 mr-1 opacity-50" />
              Sound Off
            </>
          )}
        </Button>
      </div>
    </>
  );
}
