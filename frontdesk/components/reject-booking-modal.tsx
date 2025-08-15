"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, X, AlertTriangle } from "lucide-react";

interface RejectBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  bookingId: string;
}

export function RejectBookingModal({
  isOpen,
  onClose,
  onConfirm,
  bookingId,
}: RejectBookingModalProps) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const MIN_REASON_LEN = 5;
  const MAX_REASON_LEN = 240;

  const suggestions = useMemo(
    () => [
      "Invalid guest information",
      "Duplicate booking",
      "Guest not found",
      "Invalid booking details",
      "Payment verification failed",
      "Scheduling conflict",
      "Service not available",
      "Guest request",
    ],
    []
  );

  const handleConfirm = async () => {
    if (!reason.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setReason("");
      onClose();
    }
  };

  const handleShortcutConfirm = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (reason.trim().length >= MIN_REASON_LEN && !isLoading) {
          void handleConfirm();
        }
      }
    },
    [isLoading, reason]
  );

  const remaining = MAX_REASON_LEN - reason.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="w-5 h-5 text-red-600" />
            Reject Booking
          </DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this booking. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Irreversible action</AlertTitle>
            <AlertDescription>
              Rejecting booking <span className="font-mono text-xs px-1 py-0.5 bg-white border rounded">{bookingId}</span> will cancel the booking and notify the guest.
            </AlertDescription>
          </Alert>

          <div className="grid gap-2">
            <Label className="text-sm">Quick reasons</Label>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((text) => (
                <Button
                  key={text}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 py-1"
                  onClick={() => setReason(text)}
                  disabled={isLoading}
                >
                  {text}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reason">Rejection Reason *</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for rejection..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[120px]"
              disabled={isLoading}
              maxLength={MAX_REASON_LEN}
              onKeyDown={handleShortcutConfirm}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Minimum {MIN_REASON_LEN} characters</span>
              <span className={remaining < 0 ? "text-red-600" : ""}>{remaining} characters left</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={reason.trim().length < MIN_REASON_LEN || isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <X className="w-4 h-4 mr-2" />
                Reject Booking
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
