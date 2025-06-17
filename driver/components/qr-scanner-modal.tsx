"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { QrCode, Camera, CheckCircle, X, User, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QRScannerModalProps {
  onClose: () => void
  onSuccess: (passengerData: any) => void
  passengerList: any[]
}

export function QRScannerModal({ onClose, onSuccess, passengerList }: QRScannerModalProps) {
  const [isScanning, setIsScanning] = useState(true)
  const [scanResult, setScanResult] = useState<any>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      toast({
        title: "📷 Camera ready",
        description: "Point camera at QR code to scan",
      })
    } catch (error) {
      console.error("Error accessing camera:", error)
      toast({
        title: "❌ Camera error",
        description: "Unable to access camera. Using simulation mode.",
        variant: "destructive",
      })
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }

  // Simulate QR code scanning with valid passenger
  const simulateValidScan = () => {
    const validPassenger = passengerList.find((p) => p.status === "next" || p.status === "pending")
    if (validPassenger) {
      const mockPassenger = {
        ...validPassenger,
        seatNumber: `A${Math.floor(Math.random() * 12) + 1}`,
        valid: true,
      }

      setScanResult(mockPassenger)
      setIsScanning(false)
      stopCamera()

      toast({
        title: "✅ QR Code scanned!",
        description: `Found ${mockPassenger.name} in passenger list`,
      })
    } else {
      simulateInvalidScan()
    }
  }

  // Simulate QR code scanning with invalid passenger
  const simulateInvalidScan = () => {
    const mockInvalidPassenger = {
      id: 999,
      name: "Unknown Passenger",
      valid: false,
      error: "Passenger not found in current trip",
    }

    setScanResult(mockInvalidPassenger)
    setIsScanning(false)
    stopCamera()

    toast({
      title: "❌ Invalid QR Code",
      description: "This passenger is not in your current trip",
      variant: "destructive",
    })
  }

  const handleConfirmCheckIn = () => {
    if (scanResult && scanResult.valid) {
      onSuccess(scanResult)
      onClose()
    }
  }

  const handleTryAgain = () => {
    setIsScanning(true)
    setScanResult(null)
    startCamera()
    toast({
      title: "🔄 Restarting scanner",
      description: "Camera is ready for scanning",
    })
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isScanning ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  {/* Camera View */}
                  <div className="relative aspect-square bg-black rounded-xl overflow-hidden">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {!stream && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="text-center text-white">
                          <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">Camera Loading...</p>
                        </div>
                      </div>
                    )}

                    {/* Scanning Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Position QR code within the frame</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={simulateValidScan} className="bg-green-600 hover:bg-green-700" size="sm">
                        ✓ Valid Scan
                      </Button>
                      <Button onClick={simulateInvalidScan} variant="outline" size="sm">
                        ✗ Invalid Scan
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : scanResult?.valid ? (
            <Card className="border-2 border-green-500 shadow-xl bg-green-50 dark:bg-green-950">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-green-700 dark:text-green-300">Check-in Successful!</h3>
                    <p className="text-sm text-green-600 dark:text-green-400">Passenger validated and seat assigned</p>
                  </div>

                  <Card className="bg-white dark:bg-gray-800 shadow-inner">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-lg">{scanResult.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {scanResult.persons} passengers • {scanResult.bags} bags
                          </p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3">
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                          🎫 Assigned Seat: {scanResult.seatNumber}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Button onClick={handleConfirmCheckIn} className="w-full bg-green-500 hover:bg-green-600 shadow-lg">
                    Confirm Check-in
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-red-500 shadow-xl bg-red-50 dark:bg-red-950">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                    <AlertTriangle className="h-8 w-8 text-white" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-red-700 dark:text-red-300">Scan Failed</h3>
                    <p className="text-sm text-red-600 dark:text-red-400">{scanResult?.error || "Invalid QR code"}</p>
                  </div>

                  <Card className="bg-white dark:bg-gray-800 shadow-inner">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <X className="h-12 w-12 mx-auto mb-2 text-red-500" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          This passenger is not in your current trip list
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <Button
                      onClick={handleTryAgain}
                      variant="outline"
                      className="w-full border-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                    >
                      🔄 Try Again
                    </Button>
                    <Button onClick={onClose} variant="ghost" className="w-full">
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
