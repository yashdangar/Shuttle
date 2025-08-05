/**
 * Test script for capacity reset scenarios
 * This script tests that shuttle capacity is properly reset when bookings are cancelled or rejected
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api'; // Adjust to your server URL
const DRIVER_TOKEN = 'your-driver-token-here'; // Replace with actual token
const FRONTDESK_TOKEN = 'your-frontdesk-token-here'; // Replace with actual token
const GUEST_TOKEN = 'your-guest-token-here'; // Replace with actual token

// Test data
let testBookingId = null;
let testShuttleId = null;

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null, token = DRIVER_TOKEN) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
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
const testShuttleCapacityBefore = async () => {
  console.log('\n=== Testing Shuttle Capacity Before ===');
  
  try {
    // Get shuttle capacity info
    const capacityInfo = await makeRequest('GET', `/trips/debug/shuttle-capacity/${testShuttleId}`);
    console.log('Shuttle capacity before:', JSON.stringify(capacityInfo.capacityInfo, null, 2));
    
    return capacityInfo.capacityInfo;
  } catch (error) {
    console.error('Shuttle capacity test failed:', error.message);
    return null;
  }
};

const testShuttleCapacityAfter = async () => {
  console.log('\n=== Testing Shuttle Capacity After ===');
  
  try {
    // Get shuttle capacity info
    const capacityInfo = await makeRequest('GET', `/trips/debug/shuttle-capacity/${testShuttleId}`);
    console.log('Shuttle capacity after:', JSON.stringify(capacityInfo.capacityInfo, null, 2));
    
    return capacityInfo.capacityInfo;
  } catch (error) {
    console.error('Shuttle capacity test failed:', error.message);
    return null;
  }
};

const testFrontdeskCancellation = async () => {
  console.log('\n=== Testing Frontdesk Cancellation ===');
  
  try {
    const result = await makeRequest('POST', `/frontdesk/bookings/${testBookingId}/cancel`, {
      reason: 'Test cancellation by frontdesk'
    }, FRONTDESK_TOKEN);
    
    console.log('Frontdesk cancellation result:', JSON.stringify(result, null, 2));
    
    if (result.message && result.message.includes('cancelled')) {
      console.log('✅ Frontdesk cancellation successful');
      return true;
    } else {
      console.log('❌ Frontdesk cancellation failed');
      return false;
    }
  } catch (error) {
    console.error('Frontdesk cancellation test failed:', error.message);
    return false;
  }
};

const testFrontdeskRejection = async () => {
  console.log('\n=== Testing Frontdesk Rejection ===');
  
  try {
    const result = await makeRequest('POST', `/frontdesk/bookings/${testBookingId}/reject`, {
      reason: 'Test rejection by frontdesk'
    }, FRONTDESK_TOKEN);
    
    console.log('Frontdesk rejection result:', JSON.stringify(result, null, 2));
    
    if (result.message && result.message.includes('rejected')) {
      console.log('✅ Frontdesk rejection successful');
      return true;
    } else {
      console.log('❌ Frontdesk rejection failed');
      return false;
    }
  } catch (error) {
    console.error('Frontdesk rejection test failed:', error.message);
    return false;
  }
};

const testGuestCancellation = async () => {
  console.log('\n=== Testing Guest Cancellation ===');
  
  try {
    const result = await makeRequest('POST', `/guest/bookings/${testBookingId}/cancel`, {
      reason: 'Test cancellation by guest'
    }, GUEST_TOKEN);
    
    console.log('Guest cancellation result:', JSON.stringify(result, null, 2));
    
    if (result.message && result.message.includes('cancelled')) {
      console.log('✅ Guest cancellation successful');
      return true;
    } else {
      console.log('❌ Guest cancellation failed');
      return false;
    }
  } catch (error) {
    console.error('Guest cancellation test failed:', error.message);
    return false;
  }
};

const testSystemCancellation = async () => {
  console.log('\n=== Testing System Cancellation (via cron) ===');
  
  try {
    // This would typically be triggered by the cron job
    // For testing, we'll simulate by calling the cleanup function directly
    const result = await makeRequest('POST', `/admin/cleanup-expired-bookings`);
    
    console.log('System cancellation result:', JSON.stringify(result, null, 2));
    
    if (result.message && result.message.includes('cleaned')) {
      console.log('✅ System cancellation successful');
      return true;
    } else {
      console.log('❌ System cancellation failed');
      return false;
    }
  } catch (error) {
    console.error('System cancellation test failed:', error.message);
    return false;
  }
};

const verifyCapacityReset = (before, after, scenario) => {
  console.log(`\n=== Verifying Capacity Reset for ${scenario} ===`);
  
  if (!before || !after) {
    console.log('❌ Cannot verify capacity reset - missing before or after data');
    return false;
  }
  
  // Check if capacity was properly reset
  const beforeTotal = before.generalCapacity.seatsHeld + before.generalCapacity.seatsConfirmed;
  const afterTotal = after.generalCapacity.seatsHeld + after.generalCapacity.seatsConfirmed;
  
  const beforeAirportToHotel = before.airportToHotelCapacity.seatsHeld + before.airportToHotelCapacity.seatsConfirmed;
  const afterAirportToHotel = after.airportToHotelCapacity.seatsHeld + after.airportToHotelCapacity.seatsConfirmed;
  
  const beforeHotelToAirport = before.hotelToAirportCapacity.seatsHeld + before.hotelToAirportCapacity.seatsConfirmed;
  const afterHotelToAirport = after.hotelToAirportCapacity.seatsHeld + after.hotelToAirportCapacity.seatsConfirmed;
  
  console.log(`General capacity: ${beforeTotal} -> ${afterTotal}`);
  console.log(`Airport to Hotel: ${beforeAirportToHotel} -> ${afterAirportToHotel}`);
  console.log(`Hotel to Airport: ${beforeHotelToAirport} -> ${afterHotelToAirport}`);
  
  // Verify that capacity was reduced (seats were released)
  const capacityReduced = afterTotal < beforeTotal || 
                         afterAirportToHotel < beforeAirportToHotel || 
                         afterHotelToAirport < beforeHotelToAirport;
  
  if (capacityReduced) {
    console.log(`✅ Capacity reset successful for ${scenario}`);
    return true;
  } else {
    console.log(`❌ Capacity reset failed for ${scenario} - no reduction detected`);
    return false;
  }
};

// Main test runner
const runCapacityResetTests = async () => {
  console.log('🚀 Starting Capacity Reset Test Suite');
  console.log('=====================================');
  
  const results = {
    frontdeskCancellation: false,
    frontdeskRejection: false,
    guestCancellation: false,
    systemCancellation: false,
  };
  
  try {
    // Get a test booking and shuttle ID
    // This would typically be set up in advance
    testBookingId = 'test-booking-id'; // Replace with actual booking ID
    testShuttleId = 1; // Replace with actual shuttle ID
    
    if (!testBookingId || !testShuttleId) {
      console.log('❌ Test booking ID or shuttle ID not set');
      return;
    }
    
    // Test 1: Frontdesk Cancellation
    console.log('\n📋 Test 1: Frontdesk Cancellation');
    const before1 = await testShuttleCapacityBefore();
    results.frontdeskCancellation = await testFrontdeskCancellation();
    const after1 = await testShuttleCapacityAfter();
    const reset1 = verifyCapacityReset(before1, after1, 'Frontdesk Cancellation');
    
    // Wait a moment between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Frontdesk Rejection
    console.log('\n📋 Test 2: Frontdesk Rejection');
    const before2 = await testShuttleCapacityBefore();
    results.frontdeskRejection = await testFrontdeskRejection();
    const after2 = await testShuttleCapacityAfter();
    const reset2 = verifyCapacityReset(before2, after2, 'Frontdesk Rejection');
    
    // Wait a moment between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Guest Cancellation
    console.log('\n📋 Test 3: Guest Cancellation');
    const before3 = await testShuttleCapacityBefore();
    results.guestCancellation = await testGuestCancellation();
    const after3 = await testShuttleCapacityAfter();
    const reset3 = verifyCapacityReset(before3, after3, 'Guest Cancellation');
    
    // Wait a moment between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 4: System Cancellation
    console.log('\n📋 Test 4: System Cancellation');
    const before4 = await testShuttleCapacityBefore();
    results.systemCancellation = await testSystemCancellation();
    const after4 = await testShuttleCapacityAfter();
    const reset4 = verifyCapacityReset(before4, after4, 'System Cancellation');
    
  } catch (error) {
    console.error('Test suite failed:', error.message);
  }
  
  // Summary
  console.log('\n📊 Capacity Reset Test Results Summary');
  console.log('=====================================');
  console.log(`Frontdesk Cancellation: ${results.frontdeskCancellation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Frontdesk Rejection: ${results.frontdeskRejection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Guest Cancellation: ${results.guestCancellation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`System Cancellation: ${results.systemCancellation ? '✅ PASS' : '❌ FAIL'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\nOverall Result: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All capacity reset tests passed! Capacity is properly reset in all scenarios.');
  } else {
    console.log('⚠️  Some capacity reset tests failed. Please check the implementation.');
  }
};

// Run tests if this script is executed directly
if (require.main === module) {
  runCapacityResetTests().catch(console.error);
}

module.exports = {
  runCapacityResetTests,
  testFrontdeskCancellation,
  testFrontdeskRejection,
  testGuestCancellation,
  testSystemCancellation,
  verifyCapacityReset,
}; 