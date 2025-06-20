# Driver App Setup

## Google Maps Integration

To enable the Google Maps functionality in the driver app, you need to:

1. Create a `.env.local` file in the driver directory with:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
NEXT_PUBLIC_API_URL=http://localhost:3001
```

2. Get a Google Maps API key from the Google Cloud Console with the following APIs enabled:
   - Maps JavaScript API
   - Directions API
   - Distance Matrix API
   - Geocoding API

## Features

- **Live Route Map**: Shows all pickup and dropoff locations for current bookings
- **Driver Location**: Real-time driver location tracking
- **Interactive Markers**: Click on markers to see passenger details
- **Route Visualization**: Shows the route between locations
- **Status Indicators**: Different colored markers for different booking statuses

## Map Legend

- 🔵 Blue: Driver location
- 🟡 Yellow: Next pickup location
- 🟢 Green: Checked-in passengers
- 🔴 Red: Pending passengers
- 🟣 Purple: Dropoff locations 