"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onAcknowledge: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  onAcknowledge,
}) => {
  const handleAcknowledge = () => {
    onAcknowledge();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-red-500 animate-pulse" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 whitespace-pre-line">
            {message}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Close
            </Button>
            <Button
              onClick={handleAcknowledge}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
            >
              <Bell className="h-4 w-4" />
              Acknowledge & Stop Sound
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 