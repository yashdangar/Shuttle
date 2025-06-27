// Simple test for airport boundary
console.log("Testing airport boundary...");

const AIRPORT_BOUNDARY = [
  { lat: 19.0896, lng: 72.8656 },
  { lat: 19.0896, lng: 72.8756 },
  { lat: 19.0996, lng: 72.8756 },
  { lat: 19.0996, lng: 72.8856 },
  { lat: 19.0896, lng: 72.8856 },
  { lat: 19.0796, lng: 72.8856 },
  { lat: 19.0796, lng: 72.8756 },
  { lat: 19.0796, lng: 72.8656 },
  { lat: 19.0896, lng: 72.8656 },
];

console.log("Airport boundary coordinates:");
AIRPORT_BOUNDARY.forEach((coord, i) => {
  console.log(`Point ${i}: ${coord.lat}, ${coord.lng}`);
});

console.log("\nTest complete!"); 