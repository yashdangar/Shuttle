export type BookingStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "cancelled";

export type BookingDirection = "hotelToAirport" | "airportToHotel" | "parkFly";

export interface Booking {
  id: string;
  guestName: string;
  confirmationNumber: string;
  hotelName: string;
  hotelAddress: string;
  direction: BookingDirection;
  pickupLocation: string;
  destination: string;
  pickupDate: string;
  pickupTime: string;
  passengers: number;
  notes?: string;
  paymentMethod: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export const FAKE_BOOKINGS: Booking[] = [
  {
    id: "bk-1001",
    guestName: "Amelia Carter",
    confirmationNumber: "CAR-4821",
    hotelName: "Horizon Grand Hotel",
    hotelAddress: "123 Ocean View Blvd, Miami, FL",
    direction: "hotelToAirport",
    pickupLocation: "Hotel Lobby",
    destination: "Miami International Airport",
    pickupDate: "2025-01-06",
    pickupTime: "10:30",
    passengers: 2,
    notes: "2 checked bags, 1 carry-on",
    paymentMethod: "Front Desk",
    status: "scheduled",
    createdAt: "2024-12-28T14:03:00.000Z",
    updatedAt: "2024-12-30T09:12:00.000Z",
  },
  {
    id: "bk-1002",
    guestName: "Marcus Rivera",
    confirmationNumber: "RIV-9920",
    hotelName: "Palm Breeze Resort",
    hotelAddress: "498 Seaside Ave, San Diego, CA",
    direction: "airportToHotel",
    pickupLocation: "Terminal 2 Arrivals",
    destination: "Palm Breeze Resort",
    pickupDate: "2025-01-04",
    pickupTime: "17:45",
    passengers: 3,
    notes: "Infant car seat needed",
    paymentMethod: "Front Desk",
    status: "in-progress",
    createdAt: "2024-12-27T18:40:00.000Z",
    updatedAt: "2025-01-03T16:05:00.000Z",
  },
  {
    id: "bk-1003",
    guestName: "Lena McGuire",
    confirmationNumber: "MCG-7312",
    hotelName: "Summit Peaks Lodge",
    hotelAddress: "77 Alpine Road, Denver, CO",
    direction: "parkFly",
    pickupLocation: "Long-term Parking Deck",
    destination: "Summit Peaks Lodge",
    pickupDate: "2025-01-08",
    pickupTime: "08:15",
    passengers: 1,
    notes: "Guest has ski equipment",
    paymentMethod: "Front Desk",
    status: "scheduled",
    createdAt: "2024-12-30T10:15:00.000Z",
    updatedAt: "2025-01-01T11:25:00.000Z",
  },
  {
    id: "bk-1004",
    guestName: "Noah Patel",
    confirmationNumber: "PAT-2188",
    hotelName: "Downtown Suites",
    hotelAddress: "901 Market St, San Francisco, CA",
    direction: "hotelToAirport",
    pickupLocation: "Suite 1821",
    destination: "SFO Terminal 3",
    pickupDate: "2025-01-05",
    pickupTime: "06:00",
    passengers: 1,
    paymentMethod: "Front Desk",
    status: "completed",
    createdAt: "2024-12-25T08:05:00.000Z",
    updatedAt: "2025-01-05T09:40:00.000Z",
  },
  {
    id: "bk-1005",
    guestName: "Harper Lin",
    confirmationNumber: "LIN-5604",
    hotelName: "Cascade Retreat",
    hotelAddress: "54 Riverbend Way, Portland, OR",
    direction: "airportToHotel",
    pickupLocation: "PDX Terminal B",
    destination: "Cascade Retreat",
    pickupDate: "2025-01-03",
    pickupTime: "13:10",
    passengers: 4,
    notes: "One passenger with limited mobility",
    paymentMethod: "Front Desk",
    status: "cancelled",
    createdAt: "2024-12-26T12:20:00.000Z",
    updatedAt: "2024-12-31T15:55:00.000Z",
  },
];

