export type LatLngLiteral = {
  lat: number;
  lng: number;
};

export type DriverLocation = LatLngLiteral & {
  heading?: number;
  speedKph?: number;
  updatedAt?: Date;
};
