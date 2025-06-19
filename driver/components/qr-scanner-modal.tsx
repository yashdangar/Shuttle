"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { QrCode, Camera, CheckCircle, X, User, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import jsQR from "jsqr"

interface QRScannerModalProps {
  onClose: () => void
  onSuccess: (passengerData: any) => void
  passengerList: any[]
}

export function QRScannerModal({ onClose, onSuccess, passengerList }: QRScannerModalProps) {
  const [isScanning, setIsScanning] = useState(true)
  const [scanResult, setScanResult] = useState<any>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isProcessingQR, setIsProcessingQR] = useState(false)
  const [lastScannedData, setLastScannedData] = useState<string>("")
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [scanStatus, setScanStatus] = useState<string>("Looking for QR code...")
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    if (isScanning) {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isScanning])

  const startCamera = async () => {
    try {
      setScanStatus("Starting camera...")
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
        videoRef.current.play()
        
        // Start QR code scanning once video is playing
        videoRef.current.onloadedmetadata = () => {
          setScanStatus("Camera ready - scanning for QR codes...")
          startQRScanning()
        }
      }
      toast.success("📷 Camera ready")
    } catch (error) {
      console.error("Error accessing camera:", error)
      setScanStatus("Camera access denied")
      toast.error("❌ Camera access denied. Please allow camera permissions.")
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }

  const startQRScanning = () => {
    const scanFrame = () => {
      if (videoRef.current && canvasRef.current && isScanning && !isProcessingQR) {
        const video = videoRef.current
        const canvas = canvasRef.current
        const context = canvas.getContext('2d', { willReadFrequently: true })
        
        if (context && video.videoWidth > 0) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)
          
          if (code) {
            console.log("QR Code detected:", code.data)
            
            // Check if this is the same QR code we just processed
            if (code.data === lastScannedData && isProcessingQR) {
              // Same QR code being processed, skip
              animationFrameRef.current = requestAnimationFrame(scanFrame)
              return
            }
            
            setIsProcessingQR(true) // Prevent multiple scans
            setLastScannedData(code.data) // Store the scanned data
            setScanStatus("QR code found! Verifying...")
            onScanSuccess(code.data)
            return
          }
        }
        
        // Continue scanning
        animationFrameRef.current = requestAnimationFrame(scanFrame)
      } else if (isProcessingQR) {
        // If processing QR, don't continue scanning
        return
      } else {
        // Continue scanning
        animationFrameRef.current = requestAnimationFrame(scanFrame)
      }
    }
    
    scanFrame()
  }

  const onScanSuccess = async (decodedText: string) => {
    try {
      setIsVerifying(true)
      stopCamera()
      setIsScanning(false)

      console.log("Attempting to verify QR data:", decodedText)
      
      // Debug: Check if driver token is available
      const driverToken = localStorage.getItem("driverToken")
      console.log("Driver token available:", !!driverToken)
      if (!driverToken) {
        throw new Error("Driver not authenticated. Please log in again.")
      }

      // First step: Check QR code validity (don't mark as used yet)
      const response = await api.post('/driver/check-qr', {
        qrData: decodedText
      })

      console.log("Backend response:", response)

      if (response.success) {
        const passenger = response.passenger
        setScanResult({
          ...passenger,
          valid: true,
          token: passenger.token, // Store token for confirmation
        })
        setScanStatus("QR Code verified! Click 'Confirm Check-in' to complete.")
        toast.success("✅ QR Code verified! Please confirm check-in.")
      } else {
        throw new Error(response.message || 'Verification failed')
      }
    } catch (error) {
      console.error('QR verification error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Verification failed'
      
      setScanResult({
        id: 999,
        name: "Verification Failed",
        valid: false,
        error: errorMessage,
      })
      setScanStatus("Verification failed")
      toast.error(`❌ ${errorMessage}`)
    } finally {
      setIsVerifying(false)
      setIsProcessingQR(false) // Reset processing state
    }
  }

  const handleConfirmCheckIn = async () => {
    if (scanResult && scanResult.valid && scanResult.token) {
      try {
        setIsVerifying(true)
        
        // Second step: Confirm check-in and mark token as used
        const response = await api.post('/driver/confirm-checkin', {
          token: scanResult.token
        })

        if (response.success) {
          const confirmedPassenger = response.passenger
          onSuccess(confirmedPassenger)
          onClose()
          toast.success("✅ Check-in confirmed successfully!")
        } else {
          throw new Error(response.message || 'Check-in confirmation failed')
        }
      } catch (error) {
        console.error('Check-in confirmation error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Check-in confirmation failed'
        toast.error(`❌ ${errorMessage}`)
      } finally {
        setIsVerifying(false)
        setIsProcessingQR(false) // Reset processing state
      }
    }
  }

  const handleTryAgain = () => {
    setIsScanning(true)
    setScanResult(null)
    setIsVerifying(false)
    setIsProcessingQR(false) // Reset processing state
    setLastScannedData("") // Reset last scanned data
    setScanStatus("Looking for QR code...")
    toast.success("🔄 Restarting scanner")
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Scanner
          </DialogTitle>
        </DialogHeader>
        {/* Visually hidden description for accessibility */}
        <span id="qr-scanner-desc" className="sr-only">Scan a passenger QR code to verify their booking and check them in.</span>

        <div className="space-y-4">
          {isScanning ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  {/* Camera View */}
                  <div className="relative aspect-square bg-black rounded-xl overflow-hidden">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover transform scale-x-[-1]" 
                    />
                    {!stream && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="text-center text-white">
                          <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">Camera Loading...</p>
                        </div>
                      </div>
                    )}

                    {/* Verification Loading Overlay */}
                    {isVerifying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                        <div className="text-center text-white">
                          <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin" />
                          <p className="text-lg font-semibold">
                            {scanResult ? "Confirming Check-in..." : "Verifying QR Code..."}
                          </p>
                          <p className="text-sm opacity-75">Please wait</p>
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

                    {/* Hidden canvas for QR detection */}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Position QR code within the frame</p>
                    <p className="text-xs text-gray-500">
                      {scanStatus}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : isVerifying ? (
            // While verifying, show only the loading overlay (no error or success card)
            <div className="flex items-center justify-center min-h-[350px]">
              <div className="text-center text-blue-700 dark:text-blue-300">
                <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin" />
                <p className="text-lg font-semibold">
                  {scanResult ? "Confirming Check-in..." : "Verifying QR Code..."}
                </p>
                <p className="text-sm opacity-75">Please wait</p>
              </div>
            </div>
          ) : scanResult?.valid ? (
            <Card className="border-2 border-blue-500 shadow-xl bg-blue-50 dark:bg-blue-950">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-blue-700 dark:text-blue-300">Ready to Check-in!</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Passenger validated. Click confirm to complete check-in.</p>
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

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pickup:</span>
                          <span className="font-medium">{scanResult.pickup}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dropoff:</span>
                          <span className="font-medium">{scanResult.dropoff}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Payment:</span>
                          <span className="font-medium">{scanResult.paymentMethod}</span>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3 mt-3">
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                          🎫 Assigned Seat: {scanResult.seatNumber}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    <Button 
                      onClick={handleConfirmCheckIn} 
                      disabled={isVerifying}
                      className="w-full bg-green-600 hover:bg-green-700 shadow-lg h-12 text-lg font-semibold"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Confirming Check-in...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Confirm Check-in
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={handleTryAgain} 
                      variant="outline" 
                      className="w-full"
                      disabled={isVerifying}
                    >
                      Scan Another QR Code
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : scanResult && scanResult.valid === false ? (
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
                          {scanResult?.error || "This QR code could not be verified"}
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
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
