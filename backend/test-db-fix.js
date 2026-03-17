// Test script to verify the getUserByPhone fix
const { DatabaseService } = require('./src/lib/db.ts');

async function testGetUserByPhone() {
  try {
    console.log('Testing getUserByPhone with a non-existent phone number...');
    const result = await DatabaseService.getUserByPhone('19999999999');
    console.log('Success! Result:', result); // Should be null
    console.log('✅ Test passed - no PGRST116 error thrown');
  } catch (error) {
    console.error('❌ Test failed - Error thrown:', error.message);
    process.exit(1);
  }
}

testGetUserByPhone();
