"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  QrCode,
  Camera,
  CheckCircle,
  X,
  User,
  AlertTriangle,
  Loader2,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import jsQR from "jsqr";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (passengerData: any) => void;
  passengerList: any[];
}

export function QRScannerModal({
  isOpen,
  onClose,
  onSuccess,
  passengerList,
}: QRScannerModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const [lastScannedData, setLastScannedData] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanStatus, setScanStatus] = useState<string>(
    "Click 'Start Camera' to begin scanning"
  );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsScanning(false);
      setScanResult(null);
      setIsVerifying(false);
      setIsProcessingQR(false);
      setLastScannedData("");
      setScanStatus("Click 'Start Camera' to begin scanning");
      setCameraError(null);
      stopCamera();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isScanning && isOpen) {
      startCamera();
    }
    return () => {
      if (!isScanning) {
        stopCamera();
      }
    };
  }, [isScanning, isOpen]);

  const apiPost = async (path: string, body: any) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      setScanStatus("Starting camera...");
      stopCamera();
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await new Promise((resolve, reject) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              if (videoRef.current) {
                videoRef.current.play().then(resolve).catch(reject);
              }
            };
            videoRef.current.onerror = reject;
          }
        });
        setScanStatus("Camera ready - scanning for QR codes...");
        startQRScanning();
        toast.success("Camera started");
      }
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : "Camera access denied";
      setCameraError(errorMessage);
      setScanStatus("Camera access denied");
      setIsScanning(false);
      toast.error(`${errorMessage}. Please allow camera permissions.`);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleStartCamera = () => setIsScanning(true);

  const handleStopCamera = () => {
    setIsScanning(false);
    stopCamera();
    setScanStatus("Camera stopped");
  };

  const startQRScanning = () => {
    const scanFrame = () => {
      if (videoRef.current && canvasRef.current && isScanning && !isProcessingQR) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (context && video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            if (code.data === lastScannedData && isProcessingQR) {
              animationFrameRef.current = requestAnimationFrame(scanFrame);
              return;
            }
            setIsProcessingQR(true);
            setLastScannedData(code.data);
            setScanStatus("QR code found! Verifying...");
            onScanSuccess(code.data);
            return;
          }
        }
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      } else if (isProcessingQR) {
        return;
      } else if (isScanning) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };
    scanFrame();
  };

  const onScanSuccess = async (decodedText: string) => {
    try {
      setIsVerifying(true);
      stopCamera();
      setIsScanning(false);
      const response = await apiPost("/api/driver/check-qr", { qrData: decodedText });
      if (response.success) {
        const passenger = response.passenger;
        setScanResult({
          ...passenger,
          valid: true,
          token: passenger.token,
        });
        setScanStatus("QR Code verified! Click 'Confirm Check-in' to complete.");
        toast.success("QR Code verified! Please confirm check-in.");
      } else {
        throw new Error(response.message || "Verification failed");
      }
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : "Verification failed";
      setScanResult({
        id: 999,
        name: "Verification Failed",
        valid: false,
        error: errorMessage,
      });
      setScanStatus("Verification failed");
      toast.error(errorMessage);
    } finally {
      setIsVerifying(false);
      setIsProcessingQR(false);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (scanResult && scanResult.valid && scanResult.token) {
      try {
        setIsVerifying(true);
        const response = await apiPost("/api/driver/confirm-checkin", {
          token: scanResult.token,
        });
        if (response.success) {
          const confirmedPassenger = response.passenger;
          onSuccess(confirmedPassenger);
          onClose();
          toast.success("Check-in confirmed successfully!");
        } else {
          throw new Error(response.message || "Check-in confirmation failed");
        }
      } catch (error: any) {
        const errorMessage =
          error instanceof Error ? error.message : "Check-in confirmation failed";
        toast.error(errorMessage);
      } finally {
        setIsVerifying(false);
        setIsProcessingQR(false);
      }
    }
  };

  const handleTryAgain = () => {
    setIsScanning(false);
    setScanResult(null);
    setIsVerifying(false);
    setIsProcessingQR(false);
    setLastScannedData("");
    setScanStatus("Click 'Start Camera' to begin scanning");
    setCameraError(null);
    stopCamera();
    toast.success("Ready to scan again");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Scanner
            </div>
          </DialogTitle>
        </DialogHeader>
        <span className="sr-only">
          Scan a passenger QR code to verify their booking and check them in.
        </span>

        <div className="space-y-4">
          {!isScanning && !scanResult ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-sm text-gray-600">Camera not started</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Ready to scan QR codes</p>
                    <p className="text-xs text-gray-500">{scanStatus}</p>
                    {cameraError && (
                      <p className="text-xs text-red-500">Error: {cameraError}</p>
                    )}
                  </div>

                  <Button
                    onClick={handleStartCamera}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isVerifying}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : isScanning ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
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
                          <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin" />
                          <p className="text-sm">Starting camera...</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                      </div>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Position QR code within the frame</p>
                    <p className="text-xs text-gray-500">{scanStatus}</p>
                  </div>

                  <Button onClick={handleStopCamera} variant="outline" className="w-full">
                    Stop Camera
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : isVerifying ? (
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
                    <h3 className="text-xl font-bold text-blue-700 dark:text-blue-300">
                      Ready to Check-in!
                    </h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Passenger validated. Click confirm to complete check-in.
                    </p>
                  </div>

                  <Card className="bg-white dark:bg-gray-800 shadow-inner">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 bg-linear-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
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

                      <div className="bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3 mt-3">
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
                    <h3 className="text-xl font-bold text-red-700 dark:text-red-300">
                      Scan Failed
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {scanResult?.error || "Invalid QR code"}
                    </p>
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
  );
}

