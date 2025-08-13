import axios from 'axios';

interface Location {
  latitude: number;
  longitude: number;
}

interface ETAResponse {
  duration: string;
  durationInSeconds: number;
  distance: string;
  distanceInMeters: number;
}

interface DirectionsResponse {
  routes: Array<{
    legs: Array<{
      duration: { text: string; value: number };
      distance: { text: string; value: number };
      start_location: { lat: number; lng: number };
      end_location: { lat: number; lng: number };
    }>;
  }>;
}

class GoogleMapsService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Google Maps API key not found. ETA calculations will be simulated.');
    }
  }

  /**
   * Calculate ETA between two locations using Google Maps Distance Matrix API
   */
  async calculateETA(
    origin: Location,
    destination: Location,
    mode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<ETAResponse> {
    if (!this.apiKey) {
      // Fallback to simulated ETA
      return this.simulateETA(origin, destination);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/distancematrix/json`, {
        params: {
          origins: `${origin.latitude},${origin.longitude}`,
          destinations: `${destination.latitude},${destination.longitude}`,
          mode,
          key: this.apiKey,
        },
      });

      const result = response.data;
      
      if (result.status === 'OK' && result.rows[0]?.elements[0]?.status === 'OK') {
        const element = result.rows[0].elements[0];
        return {
          duration: element.duration.text,
          durationInSeconds: element.duration.value,
          distance: element.distance.text,
          distanceInMeters: element.distance.value,
        };
      } else {
        console.error('Google Maps API error:', result.status);
        return this.simulateETA(origin, destination);
      }
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return this.simulateETA(origin, destination);
    }
  }

  /**
   * Get detailed directions between two locations
   */
  async getDirections(
    origin: Location,
    destination: Location,
    mode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<DirectionsResponse | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/directions/json`, {
        params: {
          origin: `${origin.latitude},${origin.longitude}`,
          destination: `${destination.latitude},${destination.longitude}`,
          mode,
          key: this.apiKey,
        },
      });

      const result = response.data;
      
      if (result.status === 'OK') {
        return result;
      } else {
        console.error('Google Maps Directions API error:', result.status);
        return null;
      }
    } catch (error) {
      console.error('Error getting directions:', error);
      return null;
    }
  }

  /**
   * Geocode an address to get coordinates
   */
  async geocodeAddress(address: string): Promise<Location | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          address,
          key: this.apiKey,
        },
      });

      const result = response.data;
      
      if (result.status === 'OK' && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng,
        };
      } else {
        console.error('Geocoding error:', result.status);
        return null;
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to get address
   */
  async reverseGeocode(location: Location): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          latlng: `${location.latitude},${location.longitude}`,
          key: this.apiKey,
        },
      });

      const result = response.data;
      
      if (result.status === 'OK' && result.results.length > 0) {
        return result.results[0].formatted_address;
      } else {
        console.error('Reverse geocoding error:', result.status);
        return null;
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (loc1.latitude * Math.PI) / 180;
    const φ2 = (loc2.latitude * Math.PI) / 180;
    const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Simulate ETA when Google Maps API is not available
   */
  private simulateETA(origin: Location, destination: Location): ETAResponse {
    const distance = this.calculateDistance(origin, destination);
    const averageSpeed = 30; // 30 km/h average speed
    const durationInSeconds = (distance / 1000) / averageSpeed * 3600; // Convert to seconds
    
    const minutes = Math.round(durationInSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    let duration = '';
    if (hours > 0) {
      duration = `${hours}h ${remainingMinutes}m`;
    } else {
      duration = `${minutes}m`;
    }

    return {
      duration,
      durationInSeconds: Math.round(durationInSeconds),
      distance: `${Math.round(distance / 1000 * 10) / 10} km`,
      distanceInMeters: Math.round(distance),
    };
  }

  /**
   * Check if a location is within a certain radius of another location
   */
  isWithinRadius(
    center: Location,
    point: Location,
    radiusInMeters: number
  ): boolean {
    const distance = this.calculateDistance(center, point);
    return distance <= radiusInMeters;
  }
}

export const googleMapsService = new GoogleMapsService();
export type { Location, ETAResponse, DirectionsResponse };

/**
 * Calculate ETA for next trip bookings that includes current trip completion time
 */
export async function calculateNextTripETA(
  driverLocation: Location,
  currentTripId: string,
  nextTripPickupLocation: Location
): Promise<ETAResponse> {
  try {
    // Import prisma here to avoid circular dependencies
    const { default: prisma } = await import('../db/prisma');
    
    // Get current trip details to calculate completion time
    const currentTrip = await prisma.trip.findUnique({
      where: { id: currentTripId },
      include: {
        bookings: {
          where: {
            isCompleted: false,
            isCancelled: false,
          },
          include: {
            pickupLocation: true,
            dropoffLocation: true,
          },
          orderBy: {
            preferredTime: 'asc',
          },
        },
      },
    });

    if (!currentTrip || currentTrip.bookings.length === 0) {
      // No current trip or no bookings, calculate direct ETA
      return await googleMapsService.calculateETA(driverLocation, nextTripPickupLocation);
    }

    // Calculate estimated time for current trip to complete
    let currentTripCompletionTime = 0;
    let lastLocation = driverLocation;

    for (const booking of currentTrip.bookings) {
      // Time to pickup location (if not already picked up)
      if (booking.pickupLocation && !booking.isVerified) {
        const pickupETA = await googleMapsService.calculateETA(
          lastLocation,
          {
            latitude: booking.pickupLocation.latitude,
            longitude: booking.pickupLocation.longitude,
          }
        );
        currentTripCompletionTime += pickupETA.durationInSeconds;
        currentTripCompletionTime += 120; // 2 minutes stop time for pickup
        
        lastLocation = {
          latitude: booking.pickupLocation.latitude,
          longitude: booking.pickupLocation.longitude,
        };
      }

      // Time to dropoff location
      if (booking.dropoffLocation) {
        const dropoffETA = await googleMapsService.calculateETA(
          lastLocation,
          {
            latitude: booking.dropoffLocation.latitude,
            longitude: booking.dropoffLocation.longitude,
          }
        );
        currentTripCompletionTime += dropoffETA.durationInSeconds;
        currentTripCompletionTime += 120; // 2 minutes stop time for dropoff
        
        lastLocation = {
          latitude: booking.dropoffLocation.latitude,
          longitude: booking.dropoffLocation.longitude,
        };
      }
    }

    // Calculate time from last dropoff to next trip pickup
    const nextTripETA = await googleMapsService.calculateETA(
      lastLocation,
      nextTripPickupLocation
    );

    // Total ETA = current trip completion time + travel to next pickup
    const totalDurationInSeconds = currentTripCompletionTime + nextTripETA.durationInSeconds;
    
    // Format the duration
    const minutes = Math.round(totalDurationInSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    let duration = '';
    if (hours > 0) {
      duration = `${hours}h ${remainingMinutes}m`;
    } else {
      duration = `${minutes}m`;
    }

    // Calculate total distance (approximate)
    const totalDistanceInMeters = nextTripETA.distanceInMeters + (currentTripCompletionTime / 60 * 500); // Assume 500m/min average
    const distance = `${Math.round(totalDistanceInMeters / 1000 * 10) / 10} km`;

    return {
      duration,
      durationInSeconds: totalDurationInSeconds,
      distance,
      distanceInMeters: totalDistanceInMeters,
    };
  } catch (error) {
    console.error('Error calculating next trip ETA:', error);
    // Fallback to direct ETA calculation
    return await googleMapsService.calculateETA(driverLocation, nextTripPickupLocation);
  }
} 