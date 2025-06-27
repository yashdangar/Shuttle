// Airport boundary coordinates for Mumbai International Airport (BOM)
// These coordinates define a polygon around the airport terminals
export const AIRPORT_BOUNDARY_COORDINATES = [
  { lat: 19.0896, lng: 72.8656 }, // Terminal 1
  { lat: 19.0896, lng: 72.8756 }, // Terminal 1 East
  { lat: 19.0996, lng: 72.8756 }, // Terminal 1 North East
  { lat: 19.0996, lng: 72.8856 }, // Terminal 2 North
  { lat: 19.0896, lng: 72.8856 }, // Terminal 2
  { lat: 19.0796, lng: 72.8856 }, // Terminal 2 South
  { lat: 19.0796, lng: 72.8756 }, // Terminal 2 South East
  { lat: 19.0796, lng: 72.8656 }, // Terminal 2 South West
  { lat: 19.0896, lng: 72.8656 }, // Back to Terminal 1
];

// Additional airport areas for more precise detection
export const AIRPORT_TERMINAL_AREAS = {
  TERMINAL_1: [
    { lat: 19.0896, lng: 72.8656 },
    { lat: 19.0896, lng: 72.8756 },
    { lat: 19.0996, lng: 72.8756 },
    { lat: 19.0996, lng: 72.8656 },
  ],
  TERMINAL_2: [
    { lat: 19.0896, lng: 72.8756 },
    { lat: 19.0896, lng: 72.8856 },
    { lat: 19.0796, lng: 72.8856 },
    { lat: 19.0796, lng: 72.8756 },
  ],
  PARKING_AREA: [
    { lat: 19.0796, lng: 72.8656 },
    { lat: 19.0796, lng: 72.8756 },
    { lat: 19.0896, lng: 72.8756 },
    { lat: 19.0896, lng: 72.8656 },
  ],
};

// Function to check if a point is inside a polygon using ray casting algorithm
export function isPointInPolygon(point: { lat: number; lng: number }, polygon: Array<{ lat: number; lng: number }>): boolean {
  const { lat, lng } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

// Function to check if driver is within airport boundary
export function isDriverInAirportBoundary(driverLocation: { lat: number; lng: number }): boolean {
  return isPointInPolygon(driverLocation, AIRPORT_BOUNDARY_COORDINATES);
}

// Function to check if driver is in a specific terminal area
export function getDriverTerminalArea(driverLocation: { lat: number; lng: number }): string | null {
  if (isPointInPolygon(driverLocation, AIRPORT_TERMINAL_AREAS.TERMINAL_1)) {
    return 'TERMINAL_1';
  }
  if (isPointInPolygon(driverLocation, AIRPORT_TERMINAL_AREAS.TERMINAL_2)) {
    return 'TERMINAL_2';
  }
  if (isPointInPolygon(driverLocation, AIRPORT_TERMINAL_AREAS.PARKING_AREA)) {
    return 'PARKING_AREA';
  }
  return null;
}

// Function to calculate distance between two points in meters
export function calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Function to check if driver is approaching airport (within 2km)
export function isDriverApproachingAirport(driverLocation: { lat: number; lng: number }): boolean {
  // Check distance to airport center (Terminal 1)
  const airportCenter = { lat: 19.0896, lng: 72.8656 };
  const distance = calculateDistance(driverLocation, airportCenter);
  return distance <= 2000; // 2km radius
}

// Function to get airport boundary for Google Maps Polygon
export function getAirportBoundaryForMap() {
  return AIRPORT_BOUNDARY_COORDINATES.map(coord => ({
    lat: coord.lat,
    lng: coord.lng,
  }));
}

// Function to get terminal areas for Google Maps Polygons
export function getTerminalAreasForMap() {
  return {
    terminal1: AIRPORT_TERMINAL_AREAS.TERMINAL_1.map(coord => ({
      lat: coord.lat,
      lng: coord.lng,
    })),
    terminal2: AIRPORT_TERMINAL_AREAS.TERMINAL_2.map(coord => ({
      lat: coord.lat,
      lng: coord.lng,
    })),
    parking: AIRPORT_TERMINAL_AREAS.PARKING_AREA.map(coord => ({
      lat: coord.lat,
      lng: coord.lng,
    })),
  };
} 