const { cleanupExpiredSeatHolds } = require('./src/utils/seatHoldingUtils');

async function testCleanup() {
  try {
    console.log('=== TESTING CLEANUP FUNCTION ===');
    await cleanupExpiredSeatHolds();
    console.log('=== CLEANUP COMPLETED ===');
  } catch (error) {
    console.error('Error during cleanup test:', error);
  }
}

testCleanup(); 