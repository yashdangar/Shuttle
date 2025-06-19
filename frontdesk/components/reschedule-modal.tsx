"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/hooks/use-toast"
import { fetchWithAuth } from "@/lib/api"

interface RescheduleModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  currentTime: string
  onSuccess: () => void
}

export function RescheduleModal({ isOpen, onClose, bookingId, currentTime, onSuccess }: RescheduleModalProps) {
  const { toast } = useToast()
  const [newTime, setNewTime] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleReschedule = async () => {
    if (!newTime) {
      toast({
        title: "Error",
        description: "Please select a new time",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      
      // Create new datetime by combining today's date with selected time
      const today = new Date()
      const [hours, minutes] = newTime.split(':')
      today.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      const response = await fetchWithAuth(`/frontdesk/bookings/${bookingId}/reschedule`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preferredTime: today.toISOString()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to reschedule booking")
      }
      
      toast({
        title: "Success",
        description: "Booking rescheduled successfully",
      })
      onSuccess()
      onClose()
      setNewTime("")
    } catch (error: any) {
      console.error("Error rescheduling booking:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to reschedule booking",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setNewTime("")
    onClose()
  }

  const getCurrentTimeString = () => {
    const now = new Date()
    // Add 2 minutes buffer to ensure the time is in the future
    const bufferTime = new Date(now.getTime() + 2 * 60 * 1000)
    return `${bufferTime.getHours().toString().padStart(2, '0')}:${bufferTime.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reschedule Booking</DialogTitle>
          <DialogDescription>
            Select a new time for the booking today. The new time must be in the future.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="current-time" className="text-right">
              Current Time
            </Label>
            <div className="col-span-3 text-sm text-muted-foreground">
              {new Date(currentTime).toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="current-date" className="text-right">
              Date
            </Label>
            <div className="col-span-3 text-sm text-muted-foreground">
              {new Date().toLocaleDateString()}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-time" className="text-right">
              New Time
            </Label>
            <Input
              id="new-time"
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="col-span-3"
              min={getCurrentTimeString()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleReschedule} disabled={isLoading || !newTime}>
            {isLoading ? "Rescheduling..." : "Reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 