"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Users,
  CheckCircle,
} from "lucide-react";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { toast } from "sonner";

export default function CurrentTripPage() {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [verifiedPassengers, setVerifiedPassengers] = useState<any[]>([]);

  const handleQRScanSuccess = (passengerData: any) => {
    // Add the verified passenger to the list
    setVerifiedPassengers(prev => [
      ...prev,
      {
        ...passengerData,
        verifiedAt: new Date().toISOString(),
        id: Date.now(), // Generate unique ID for display
      }
    ]);
    toast.success("Check-in successful!");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* QR Scanner Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Scanner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Scan passenger QR codes to verify their bookings
            </p>
            <Button 
              onClick={() => setShowQRScanner(true)} 
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <QrCode className="w-5 h-5 mr-2" />
              Start QR Scanner
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Verified Passengers List */}
      {verifiedPassengers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Verified Passengers</span>
              <Badge variant="secondary">
                {verifiedPassengers.length} Checked In
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {verifiedPassengers.map((passenger) => (
                <Card
                  key={passenger.id}
                  className="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{passenger.name}</h3>
                          <p className="text-sm text-gray-600">
                            {passenger.persons} passengers • {passenger.bags} bags
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                        {passenger.seatNumber && (
                          <p className="text-sm font-medium text-blue-600 mt-1">
                            Seat {passenger.seatNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Pickup:</p>
                          <p className="font-medium">{passenger.pickup}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Dropoff:</p>
                          <p className="font-medium">{passenger.dropoff}</p>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Payment:</span>
                          <span>{passenger.paymentMethod}</span>
                        </div>
                        <div className="text-gray-500">
                          {new Date(passenger.verifiedAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">
                1
              </div>
              <p>Click "Start QR Scanner" to open the camera</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">
                2
              </div>
              <p>Point the camera at the passenger's QR code</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">
                3
              </div>
              <p>The system will automatically verify and check-in the passenger</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">
                4
              </div>
              <p>Verified passengers will appear in the list below</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {showQRScanner && (
        <QRScannerModal
          onClose={() => setShowQRScanner(false)}
          onSuccess={handleQRScanSuccess}
          passengerList={[]} // Empty array since we're not using current trip logic
        />
      )}
    </div>
  );
}
