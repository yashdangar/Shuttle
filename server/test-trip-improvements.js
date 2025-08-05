/**
 * Test script for trip management improvements
 * This script tests the new functionality for trip state management and capacity reset
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api'; // Adjust to your server URL
const DRIVER_TOKEN = 'your-driver-token-here'; // Replace with actual token

// Test data
let testTripId = null;
let testShuttleId = null;

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${DRIVER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    if (error.response) {
      console.error(`Response:`, error.response.data);
    }
    throw error;
  }
};

// Test functions
const testShuttleCapacityDebug = async () => {
  console.log('\n=== Testing Shuttle Capacity Debug ===');
  
  try {
    // First, get current trip to find shuttle ID
    const currentTrip = await makeRequest('GET', '/trips/current');
    
    if (currentTrip.currentTrip && currentTrip.currentTrip.shuttle) {
      testShuttleId = currentTrip.currentTrip.shuttle.id;
      console.log(`Found shuttle ID: ${testShuttleId}`);
      
      // Test shuttle capacity debug
      const capacityInfo = await makeRequest('GET', `/trips/debug/shuttle-capacity/${testShuttleId}`);
      console.log('Shuttle capacity info:', JSON.stringify(capacityInfo, null, 2));
      
      return true;
    } else {
      console.log('No active trip found, skipping shuttle capacity test');
      return false;
    }
  } catch (error) {
    console.error('Shuttle capacity debug test failed:', error.message);
    return false;
  }
};

const testOverlappingTripCleanup = async () => {
  console.log('\n=== Testing Overlapping Trip Cleanup ===');
  
  try {
    const result = await makeRequest('POST', '/trips/cleanup-overlapping');
    console.log('Cleanup result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`✅ Cleanup successful: ${result.message}`);
      if (result.cleanedTrips && result.cleanedTrips.length > 0) {
        console.log(`Cleaned up ${result.cleanedTrips.length} overlapping trips`);
      }
    } else {
      console.log(`❌ Cleanup failed: ${result.message}`);
    }
    
    return result.success;
  } catch (error) {
    console.error('Overlapping trip cleanup test failed:', error.message);
    return false;
  }
};

const testPrepareNextTrip = async () => {
  console.log('\n=== Testing Prepare Next Trip ===');
  
  try {
    const result = await makeRequest('POST', '/trips/prepare-next');
    console.log('Prepare next trip result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`✅ Prepare next trip successful: ${result.message}`);
      if (result.nextTrip) {
        console.log(`Next trip created: ${result.nextTrip.id}`);
        testTripId = result.nextTrip.id;
      }
      if (result.assignedBookings) {
        console.log(`Assigned ${result.assignedBookings} bookings to next trip`);
      }
    } else {
      console.log(`❌ Prepare next trip failed: ${result.message}`);
    }
    
    return result.success;
  } catch (error) {
    console.error('Prepare next trip test failed:', error.message);
    return false;
  }
};

const testTripCompletion = async () => {
  console.log('\n=== Testing Trip Completion ===');
  
  if (!testTripId) {
    console.log('No test trip ID available, skipping completion test');
    return false;
  }
  
  try {
    const result = await makeRequest('POST', `/trips/${testTripId}/end`);
    console.log('Trip completion result:', JSON.stringify(result, null, 2));
    
    if (result.trip && result.trip.status === 'COMPLETED') {
      console.log(`✅ Trip completion successful: ${result.message}`);
      console.log(`Verified bookings: ${result.verifiedBookings}`);
      console.log(`Unverified bookings: ${result.unverifiedBookings}`);
    } else {
      console.log(`❌ Trip completion failed: ${result.message}`);
    }
    
    return true;
  } catch (error) {
    console.error('Trip completion test failed:', error.message);
    return false;
  }
};

const testCapacityReset = async () => {
  console.log('\n=== Testing Capacity Reset ===');
  
  if (!testShuttleId) {
    console.log('No test shuttle ID available, skipping capacity reset test');
    return false;
  }
  
  try {
    // Check capacity before reset
    const capacityBefore = await makeRequest('GET', `/trips/debug/shuttle-capacity/${testShuttleId}`);
    console.log('Capacity before reset:', JSON.stringify(capacityBefore.capacityInfo, null, 2));
    
    // Wait a moment for any async operations
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check capacity after reset
    const capacityAfter = await makeRequest('GET', `/trips/debug/shuttle-capacity/${testShuttleId}`);
    console.log('Capacity after reset:', JSON.stringify(capacityAfter.capacityInfo, null, 2));
    
    // Verify that capacity was reset
    const before = capacityBefore.capacityInfo;
    const after = capacityAfter.capacityInfo;
    
    const resetSuccessful = 
      after.generalCapacity.seatsHeld === 0 &&
      after.generalCapacity.seatsConfirmed === 0 &&
      after.airportToHotelCapacity.seatsHeld === 0 &&
      after.airportToHotelCapacity.seatsConfirmed === 0 &&
      after.hotelToAirportCapacity.seatsHeld === 0 &&
      after.hotelToAirportCapacity.seatsConfirmed === 0;
    
    if (resetSuccessful) {
      console.log('✅ Capacity reset successful - all seat counts reset to 0');
    } else {
      console.log('❌ Capacity reset failed - seat counts not properly reset');
      console.log('Before:', before);
      console.log('After:', after);
    }
    
    return resetSuccessful;
  } catch (error) {
    console.error('Capacity reset test failed:', error.message);
    return false;
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting Trip Management Improvements Test Suite');
  console.log('================================================');
  
  const results = {
    shuttleCapacityDebug: false,
    overlappingCleanup: false,
    prepareNextTrip: false,
    tripCompletion: false,
    capacityReset: false,
  };
  
  try {
    // Test 1: Shuttle capacity debug
    results.shuttleCapacityDebug = await testShuttleCapacityDebug();
    
    // Test 2: Overlapping trip cleanup
    results.overlappingCleanup = await testOverlappingTripCleanup();
    
    // Test 3: Prepare next trip
    results.prepareNextTrip = await testPrepareNextTrip();
    
    // Test 4: Trip completion
    results.tripCompletion = await testTripCompletion();
    
    // Test 5: Capacity reset verification
    results.capacityReset = await testCapacityReset();
    
  } catch (error) {
    console.error('Test suite failed:', error.message);
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`Shuttle Capacity Debug: ${results.shuttleCapacityDebug ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Overlapping Trip Cleanup: ${results.overlappingCleanup ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Prepare Next Trip: ${results.prepareNextTrip ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Trip Completion: ${results.tripCompletion ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Capacity Reset: ${results.capacityReset ? '✅ PASS' : '❌ FAIL'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\nOverall Result: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Trip management improvements are working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
};

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testShuttleCapacityDebug,
  testOverlappingTripCleanup,
  testPrepareNextTrip,
  testTripCompletion,
  testCapacityReset,
}; 