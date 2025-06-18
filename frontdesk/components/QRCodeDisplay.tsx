import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Share2, Download, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/hooks/use-toast";
import { getQRCodeUrl } from "@/lib/s3Utils";

interface QRCodeDisplayProps {
  qrCodePath: string;
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QRCodeDisplay({ qrCodePath, bookingId, isOpen, onClose }: QRCodeDisplayProps) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      refreshSignedUrl();
    }
  }, [isOpen]);

  const refreshSignedUrl = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      const url = await getQRCodeUrl(bookingId);
      setSignedUrl(url);
      setRetryCount(0);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load QR code');
      toast({
        title: "Error",
        description: "Failed to refresh QR code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsSharing(true);
      
      if (!signedUrl) {
        throw new Error('No QR code URL available');
      }

      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = `booking-${bookingId}-qr.png`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "QR Code Downloaded",
        description: "The QR code has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download QR code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      refreshSignedUrl();
    } else {
      toast({
        title: "Error",
        description: "Maximum retry attempts reached. Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Booking QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-lg relative">
            {isLoading ? (
              <div className="w-64 h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : error ? (
              <div className="w-64 h-64 flex flex-col items-center justify-center text-red-500 space-y-2">
                <AlertCircle className="w-8 h-8" />
                <p className="text-center">{error}</p>
                {retryCount < 3 && (
                  <Button
                    onClick={handleRetry}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Retry
                  </Button>
                )}
              </div>
            ) : signedUrl ? (
              <img
                src={signedUrl}
                alt="Booking QR Code"
                className="w-64 h-64"
                onError={() => {
                  setError('Failed to load QR code image');
                  handleRetry();
                }}
              />
            ) : null}
            <Button
              onClick={refreshSignedUrl}
              disabled={isRefreshing}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex space-x-4">
            <Button
              onClick={handleDownload}
              disabled={isSharing || !signedUrl}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download QR Code</span>
            </Button>
            <Button
              onClick={() => {
                if (signedUrl) {
                  navigator.clipboard.writeText(signedUrl);
                  toast({
                    title: "Copied",
                    description: "QR code image URL copied to clipboard.",
                  });
                }
              }}
              disabled={!signedUrl}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Copy Link</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 