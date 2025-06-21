"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MapPin, 
  Users, 
  Clock, 
  Navigation, 
  Play, 
  Square, 
  History,
  Calendar,
  Package,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AvailableTrip {
  direction: 'HOTEL_TO_AIRPORT' | 'AIRPORT_TO_HOTEL';
  bookingCount: number;
  totalPersons: number;
  totalBags: number;
  earliestTime: string;
  latestTime: string;
}

interface CurrentTrip {
  id: string;
  direction: 'HOTEL_TO_AIRPORT' | 'AIRPORT_TO_HOTEL';
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startTime: string;
  endTime?: string;
  shuttle: {
    vehicleNumber: string;
  };
  passengers: any[];
  totalPeople: number;
  checkedInPeople: number;
  totalBookings: number;
  checkedInBookings: number;
  totalBags: number;
}

interface TripHistory {
  id: string;
  direction: 'HOTEL_TO_AIRPORT' | 'AIRPORT_TO_HOTEL';
  status: 'COMPLETED';
  startTime: string;
  endTime: string;
  passengerCount: number;
  totalPersons: number;
  totalBags: number;
  duration: number;
  shuttle: {
    vehicleNumber: string;
  };
  bookings: any[];
}

export default function TripDashboard() {
  const [availableTrips, setAvailableTrips] = useState<AvailableTrip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<CurrentTrip | null>(null);
  const [tripHistory, setTripHistory] = useState<TripHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingTrip, setStartingTrip] = useState(false);
  const [endingTrip, setEndingTrip] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [showEndTripDialog, setShowEndTripDialog] = useState(false);
  const { toast } = useToast();
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchTripData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch current trip
      const currentTripResponse = await api.get('/trips/current');
      console.log('Current trip response:', currentTripResponse);
      setCurrentTrip(currentTripResponse.currentTrip);

      // Fetch available trips
      const availableTripsResponse = await api.get('/trips/available');
      console.log('Available trips response:', availableTripsResponse);
      setAvailableTrips(availableTripsResponse.availableTrips);

      // Fetch initial trip history
      await fetchTripHistory(1);

    } catch (error) {
      console.error('Error fetching trip data:', error);
      // Only show toast if component is mounted and not during initial render
      if (mountedRef.current) {
        setTimeout(() => {
          if (mountedRef.current) {
            toast({
              title: "Error",
              description: "Failed to load trip data",
              variant: "destructive",
            });
          }
        }, 100);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [toast]);

  const fetchTripHistory = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      setHistoryLoading(true);
      const historyResponse = await api.get(`/trips/history?page=${page}&limit=5`);
      console.log('Trip history response:', historyResponse);
      
      const newTrips = historyResponse.trips || [];
      const pagination = historyResponse.pagination;
      
      if (append) {
        setTripHistory(prev => [...prev, ...newTrips]);
      } else {
        setTripHistory(newTrips);
      }
      
      setHistoryPage(page);
      setHasMoreHistory(pagination && page < pagination.pages);
      
    } catch (error) {
      console.error('Error fetching trip history:', error);
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to load trip history",
          variant: "destructive",
        });
      }
    } finally {
      if (mountedRef.current) {
        setHistoryLoading(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    fetchTripData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTripData, 30000);
    return () => clearInterval(interval);
  }, [fetchTripData]);

  const handleStartTrip = useCallback(async (direction: 'HOTEL_TO_AIRPORT' | 'AIRPORT_TO_HOTEL') => {
    try {
      setStartingTrip(true);
      const response = await api.post('/trips/start', { direction });
      
      // Only show toast if component is mounted
      if (mountedRef.current) {
        setTimeout(() => {
          if (mountedRef.current) {
            toast({
              title: "✅ Trip Started!",
              description: response.message,
            });
          }
        }, 100);
      }
      
      // Refresh trip data
      await fetchTripData();
    } catch (error: any) {
      console.error('Error starting trip:', error);
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to start trip",
          variant: "destructive",
        });
      }
    } finally {
      if (mountedRef.current) {
        setStartingTrip(false);
      }
    }
  }, [toast, fetchTripData]);

  const endTripConfirmed = useCallback(async () => {
    if (!currentTrip) return;
    
    try {
      setEndingTrip(true);
      const response = await api.post(`/trips/${currentTrip.id}/end`);
      
      if (mountedRef.current) {
        setTimeout(() => {
          if (mountedRef.current) {
            const summary = response.summary;
            if (summary && summary.cancelledBookings > 0) {
              toast({
                title: "✅ Trip Completed!",
                description: `${summary.completedBookings} passengers served, ${summary.cancelledBookings} bookings cancelled due to no-show.`,
                variant: "default",
              });
            } else {
              toast({
                title: "✅ Trip Completed!",
                description: response.message,
              });
            }
          }
        }, 100);
      }
      
      await fetchTripData();
    } catch (error: any) {
      console.error('Error ending trip:', error);
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to end trip",
          variant: "destructive",
        });
      }
    } finally {
      if (mountedRef.current) {
        setEndingTrip(false);
        setShowEndTripDialog(false);
      }
    }
  }, [currentTrip, toast, fetchTripData]);

  const handleEndTrip = useCallback(async () => {
    if (!currentTrip) return;
    
    const unverifiedBookingCount = currentTrip.totalBookings - currentTrip.checkedInBookings;
    
    if (unverifiedBookingCount > 0) {
      setShowEndTripDialog(true);
    } else {
      await endTripConfirmed();
    }
  }, [currentTrip, endTripConfirmed]);

  const getDirectionLabel = (direction: string) => {
    return direction === 'HOTEL_TO_AIRPORT' ? 'Hotel → Airport' : 'Airport → Hotel';
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'HOTEL_TO_AIRPORT' ? '🏨→✈️' : '✈️→🏨';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading trip dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trip Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your shuttle trips and passengers
          </p>
        </div>
        <Button
          onClick={fetchTripData}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <div className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </div>
          Refresh
        </Button>
      </div>

      {/* Current Trip Status */}
      {currentTrip ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-green-600" />
              Active Trip
              <Badge variant="secondary" className="ml-auto">
                {getDirectionLabel(currentTrip.direction)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {currentTrip.checkedInPeople} / {currentTrip.totalPeople} Passengers
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {currentTrip.checkedInBookings} / {currentTrip.totalBookings} Bookings
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {currentTrip.totalBags} Total Bags
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Started: {new Date(currentTrip.startTime).toLocaleTimeString()}
                </span>
              </div>
            </div>
            
            <Progress 
              value={currentTrip.totalPeople > 0 ? (currentTrip.checkedInPeople / currentTrip.totalPeople) * 100 : 0} 
              className="mb-4"
            />
            
            <div className="flex gap-2">
              <Button
                onClick={handleEndTrip}
                disabled={endingTrip}
                variant="destructive"
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                {endingTrip ? 'Ending...' : 'End Trip'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              No Active Trip
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              You don't have any active trips. Start a new trip to begin serving passengers.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Available Trips */}
      {availableTrips.length > 0 && !currentTrip && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Available Trips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableTrips.map((trip, index) => (
                <Card key={index} className="border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getDirectionIcon(trip.direction)}</span>
                        <div>
                          <h3 className="font-semibold">{getDirectionLabel(trip.direction)}</h3>
                          <p className="text-sm text-gray-600">{trip.bookingCount} bookings</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{trip.totalPersons} persons</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        <span>{trip.totalBags} bags</span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleStartTrip(trip.direction)}
                      disabled={startingTrip}
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {startingTrip ? 'Starting...' : 'Start Trip'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trip History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Trip History
              {tripHistory.length > 0 && (
                <Badge variant="secondary">
                  {tripHistory.length} trips
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTripHistory(1)}
                disabled={historyLoading}
              >
                <div className={`w-4 h-4 mr-2 ${historyLoading ? 'animate-spin' : ''}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                  </svg>
                </div>
                Refresh
              </Button>
              {tripHistory.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // TODO: Navigate to detailed history page
                    toast({
                      title: "Trip History",
                      description: "Detailed history page coming soon!",
                    });
                  }}
                >
                  View All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tripHistory.length > 0 ? (
            <div className="space-y-3">
              {tripHistory.map((trip) => {
                const completedBookings = trip.bookings.filter(b => b.isCompleted).length;
                const cancelledBookings = trip.bookings.filter(b => b.isCancelled).length;

                return (
                  <div key={trip.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getDirectionIcon(trip.direction)}</span>
                      <div>
                        <p className="font-medium">{getDirectionLabel(trip.direction)}</p>
                        <p className="text-sm text-gray-600">
                          {trip.totalPersons} passengers • {completedBookings} bookings completed
                        </p>
                        {cancelledBookings > 0 && (
                           <p className="text-xs text-red-600">
                             {cancelledBookings} bookings cancelled
                           </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Vehicle: {trip.shuttle?.vehicleNumber || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {trip.duration && (
                        <p className="text-sm font-medium text-green-600">{trip.duration} min</p>
                      )}
                      <p className="text-xs text-gray-600">
                        {new Date(trip.startTime).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(trip.startTime).toLocaleTimeString()} - {trip.endTime ? new Date(trip.endTime).toLocaleTimeString() : 'Ongoing'}
                      </p>
                    </div>
                  </div>
                )
              })}
              
              {hasMoreHistory && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchTripHistory(historyPage + 1, true)}
                    disabled={historyLoading}
                  >
                    {historyLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Trip History</h3>
              <p className="text-gray-600">
                You haven't completed any trips yet. Start your first trip to see it here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* No Data State */}
      {!currentTrip && availableTrips.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Navigation className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Trips Available</h3>
              <p className="text-gray-600">
                There are no available trips to start at the moment.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* End Trip Confirmation Dialog */}
      {showEndTripDialog && currentTrip && (
        <AlertDialog open={showEndTripDialog} onOpenChange={setShowEndTripDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Confirm End Trip
              </AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  You have <strong>{currentTrip.totalBookings - currentTrip.checkedInBookings} unverified bookings</strong> out of {currentTrip.totalBookings} total.
                  This affects a total of <strong>{currentTrip.totalPeople - currentTrip.checkedInPeople} passengers</strong>.
                </p>
                <p className="text-orange-600 mb-2">
                  Ending the trip will automatically cancel bookings for these unverified passengers.
                </p>
                <p>Are you sure you want to proceed?</p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={endTripConfirmed}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                End Trip & Cancel Unverified
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
} 