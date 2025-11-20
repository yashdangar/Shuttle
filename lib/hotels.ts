export type Hotel = {
  id: string;
  slug: string;
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
  imageId: null | string;
  imageUrl?: string;
  timeZone: string;
  latitude: number;
  longitude: number;
  shuttleIds: string[];
  userIds: string[];
  locationIds: string[];
};

export const FAKE_HOTELS: Hotel[] = [
  {
    id: "hotel-1",
    slug: "grand-plaza-hotel",
    name: "Grand Plaza Hotel",
    address: "123 Main Street, New York, NY 10001",
    phoneNumber: "+1-555-0101",
    email: "info@grandplaza.com",
    imageId: null,
    imageUrl:
      "https://images.unsplash.com/photo-1469796466635-455ede028aca?auto=format&fit=crop&w=900&q=60",
    timeZone: "America/New_York",
    latitude: 40.7128,
    longitude: -74.006,
    shuttleIds: [],
    userIds: [],
    locationIds: [],
  },
  {
    id: "hotel-2",
    slug: "oceanview-resort",
    name: "Oceanview Resort",
    address: "456 Beach Boulevard, Miami, FL 33139",
    phoneNumber: "+1-555-0202",
    email: "contact@oceanviewresort.com",
    imageId: null,
    imageUrl:
      "https://images.unsplash.com/photo-1501117716987-c8e1ecb210cc?auto=format&fit=crop&w=900&q=60",
    timeZone: "America/New_York",
    latitude: 25.7907,
    longitude: -80.1300,
    shuttleIds: [],
    userIds: [],
    locationIds: [],
  },
  {
    id: "hotel-3",
    slug: "mountain-peak-lodge",
    name: "Mountain Peak Lodge",
    address: "789 Alpine Road, Denver, CO 80202",
    phoneNumber: "+1-555-0303",
    email: "reservations@mountainpeak.com",
    imageId: null,
    imageUrl:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=60",
    timeZone: "America/Denver",
    latitude: 39.7392,
    longitude: -104.9903,
    shuttleIds: [],
    userIds: [],
    locationIds: [],
  },
  {
    id: "hotel-4",
    slug: "sunset-bay-inn",
    name: "Sunset Bay Inn",
    address: "321 Harbor Drive, San Francisco, CA 94102",
    phoneNumber: "+1-555-0404",
    email: "hello@sunsetbayinn.com",
    imageId: null,
    imageUrl:
      "https://images.unsplash.com/photo-1505692794400-1c88860d338d?auto=format&fit=crop&w=900&q=60",
    timeZone: "America/Los_Angeles",
    latitude: 37.7749,
    longitude: -122.4194,
    shuttleIds: [],
    userIds: [],
    locationIds: [],
  },
  {
    id: "hotel-5",
    slug: "downtown-express-hotel",
    name: "Downtown Express Hotel",
    address: "654 Business District, Chicago, IL 60601",
    phoneNumber: "+1-555-0505",
    email: "info@downtownexpress.com",
    imageId: null,
    imageUrl:
      "https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?auto=format&fit=crop&w=900&q=60",
    timeZone: "America/Chicago",
    latitude: 41.8781,
    longitude: -87.6298,
    shuttleIds: [],
    userIds: [],
    locationIds: [],
  },
  {
    id: "hotel-6",
    slug: "riverside-grand-hotel",
    name: "Riverside Grand Hotel",
    address: "987 Riverwalk Avenue, Seattle, WA 98101",
    phoneNumber: "+1-555-0606",
    email: "contact@riversidegrand.com",
    imageId: null,
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=60",
    timeZone: "America/Los_Angeles",
    latitude: 47.6062,
    longitude: -122.3321,
    shuttleIds: [],
    userIds: [],
    locationIds: [],
  },
  {
    id: "hotel-7",
    slug: "desert-oasis-resort",
    name: "Desert Oasis Resort",
    address: "147 Palm Tree Lane, Phoenix, AZ 85001",
    phoneNumber: "+1-555-0707",
    email: "reservations@desertoasis.com",
    imageId: null,
    imageUrl:
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=60",
    timeZone: "America/Phoenix",
    latitude: 33.4484,
    longitude: -112.0740,
    shuttleIds: [],
    userIds: [],
    locationIds: [],
  },
  {
    id: "hotel-8",
    slug: "historic-manor-hotel",
    name: "Historic Manor Hotel",
    address: "258 Heritage Street, Boston, MA 02101",
    phoneNumber: "+1-555-0808",
    email: "info@historicmanor.com",
    imageId: null,
    imageUrl:
      "https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=900&q=60",
    timeZone: "America/New_York",
    latitude: 42.3601,
    longitude: -71.0589,
    shuttleIds: [],
    userIds: [],
    locationIds: [],
  },
];

