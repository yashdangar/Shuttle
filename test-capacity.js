// Test script for shuttle capacity functionality
// Run this with: node test-capacity.js

const axios = require('axios');

const BASE_URL = 'http://localhost:3001'; // Adjust if your server runs on different port
const FRONTDESK_TOKEN = 'YOUR_FRONTDESK_TOKEN_HERE'; // Replace with actual token

async function testCapacity() {
  try {
    console.log('=== TESTING SHUTTLE CAPACITY ===\n');

    // 1. Check current shuttle capacity status
    console.log('1. Checking current shuttle capacity status...');
    const capacityResponse = await axios.get(`${BASE_URL}/frontdesk/shuttle-capacity-status`, {
      headers: { Authorization: `Bearer ${FRONTDESK_TOKEN}` }
    });
    
    console.log('Capacity Status:', JSON.stringify(capacityResponse.data, null, 2));
    console.log('\n');

    // 2. Create a test booking with 34 passengers
    console.log('2. Creating test booking with 34 passengers...');
    const bookingData = {
      numberOfPersons: 34,
      numberOfBags: 10,
      preferredTime: new Date().toISOString(),
      paymentMethod: 'FRONTDESK',
      tripType: 'HOTEL_TO_AIRPORT',
      pickupLocationId: 1,
      dropoffLocationId: 2
    };

    const bookingResponse = await axios.post(`${BASE_URL}/frontdesk/bookings`, bookingData, {
      headers: { 
        Authorization: `Bearer ${FRONTDESK_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Booking Response:', JSON.stringify(bookingResponse.data, null, 2));
    console.log('\n');

    // 3. Check capacity status again
    console.log('3. Checking capacity status after booking...');
    const capacityResponse2 = await axios.get(`${BASE_URL}/frontdesk/shuttle-capacity-status`, {
      headers: { Authorization: `Bearer ${FRONTDESK_TOKEN}` }
    });
    
    console.log('Updated Capacity Status:', JSON.stringify(capacityResponse2.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

// Instructions
console.log('INSTRUCTIONS:');
console.log('1. Replace FRONTDESK_TOKEN with your actual frontdesk authentication token');
console.log('2. Make sure your server is running on port 3001 (or update BASE_URL)');
console.log('3. Run: node test-capacity.js');
console.log('\n');

// Uncomment the line below to run the test
// testCapacity(); 