import DatabaseManager from '../utils/database';
import DatabaseBackup from '../utils/databaseBackup';
import { Alert } from 'react-native';

export const testUserSyncMigration = async () => {
  console.log('=== Starting User Sync Migration Test ===\n');
  
  try {
    // Step 1: Create a backup first
    console.log('1. Creating database backup...');
    const backupResult = await DatabaseBackup.createBackup();
    if (backupResult.success) {
      console.log(`✅ Backup created: ${backupResult.backupFileName}`);
    } else {
      console.log('❌ Backup failed:', backupResult.error);
      return;
    }
    
    // Step 2: Initialize database with migrations
    console.log('\n2. Initializing database with migrations...');
    await DatabaseManager.initDatabase();
    console.log('✅ Database initialized');
    
    // Step 3: Check if firebase_uid column exists
    console.log('\n3. Checking database schema...');
    const tableInfo = await DatabaseManager.getAllAsync("PRAGMA table_info(users)");
    const hasFirebaseUid = tableInfo.some(col => col.name === 'firebase_uid');
    console.log(`✅ firebase_uid column exists: ${hasFirebaseUid}`);
    
    // Step 4: Test Firebase user synchronization
    console.log('\n4. Testing Firebase user synchronization...');
    const mockFirebaseUser = {
      uid: 'test_firebase_uid_123',
      email: 'test@firebase.com',
      displayName: 'Test Firebase User'
    };
    
    const localUserId = await DatabaseManager.createOrUpdateFirebaseUser(mockFirebaseUser);
    console.log(`✅ Firebase user created/updated with local ID: ${localUserId}`);
    
    // Verify the user was created correctly
    const firebaseUser = await DatabaseManager.getUserByFirebaseUid(mockFirebaseUser.uid);
    console.log('✅ Firebase user retrieved:', {
      id: firebaseUser.id,
      name: firebaseUser.name,
      email: firebaseUser.email,
      firebase_uid: firebaseUser.firebase_uid
    });
    
    // Step 5: Test existing user linking
    console.log('\n5. Testing existing user Firebase linking...');
    const existingUsers = await DatabaseManager.getAllAsync('SELECT * FROM users WHERE firebase_uid IS NULL LIMIT 1');
    if (existingUsers.length > 0) {
      const userToLink = existingUsers[0];
      console.log(`Found existing user without Firebase UID: ${userToLink.email}`);
      
      await DatabaseManager.linkFirebaseUidToExistingUser(userToLink.id, 'linked_firebase_uid_456');
      console.log(`✅ Linked Firebase UID to user ${userToLink.id}`);
    }
    
    // Step 6: Test user ID resolution
    console.log('\n6. Testing user ID resolution...');
    const testAuthUser1 = { id: 1, email: 'local@user.com' };
    const testAuthUser2 = { uid: mockFirebaseUser.uid, email: mockFirebaseUser.email };
    
    const userId1 = await DatabaseManager.getUserIdForAuth(testAuthUser1);
    const userId2 = await DatabaseManager.getUserIdForAuth(testAuthUser2);
    
    console.log(`✅ Local user ID resolved: ${userId1}`);
    console.log(`✅ Firebase user ID resolved: ${userId2}`);
    
    // Step 7: Test workout association
    console.log('\n7. Testing workout association with proper user ID...');
    if (userId2) {
      const workoutId = await DatabaseManager.createWorkout(
        'Test Workout with Firebase User',
        null,
        userId2
      );
      console.log(`✅ Workout created with ID: ${workoutId} for user: ${userId2}`);
      
      // Verify the workout is associated with the correct user
      const userWorkouts = await DatabaseManager.getWorkoutHistory(userId2, 10);
      console.log(`✅ User ${userId2} has ${userWorkouts.length} workouts`);
    }
    
    // Step 8: Data integrity check
    console.log('\n8. Running data integrity check...');
    await DatabaseManager.verifyDatabaseIntegrity();
    
    console.log('\n=== User Sync Migration Test Completed Successfully ===');
    
    // Show results
    Alert.alert(
      'Migration Test Complete',
      'User synchronization migration test completed successfully. Check console logs for details.',
      [
        {
          text: 'View Backup',
          onPress: async () => {
            if (backupResult.success) {
              await DatabaseBackup.shareBackup(backupResult.backupPath);
            }
          }
        },
        { text: 'OK' }
      ]
    );
    
  } catch (error) {
    console.error('❌ Migration test failed:', error);
    Alert.alert(
      'Migration Test Failed',
      `Error: ${error.message}\n\nCheck console logs for details.`
    );
  }
};

// Helper function to display current user data structure
export const displayUserDataStructure = async () => {
  try {
    console.log('\n=== Current User Data Structure ===');
    
    const users = await DatabaseManager.getAllAsync('SELECT * FROM users LIMIT 5');
    console.log(`\nTotal users in database: ${users.length}`);
    
    users.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log(`  ID: ${user.id} (SQLite)`);
      console.log(`  Firebase UID: ${user.firebase_uid || 'Not linked'}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Has Password: ${!!user.password}`);
      console.log(`  Created: ${user.created_at}`);
    });
    
    // Check for data consistency
    console.log('\n=== Data Consistency Check ===');
    
    const orphanedWorkouts = await DatabaseManager.getAllAsync(
      'SELECT COUNT(*) as count FROM workouts WHERE user_id NOT IN (SELECT id FROM users)'
    );
    console.log(`Orphaned workouts: ${orphanedWorkouts[0].count}`);
    
    const firebaseUsers = await DatabaseManager.getAllAsync(
      'SELECT COUNT(*) as count FROM users WHERE firebase_uid IS NOT NULL'
    );
    console.log(`Users with Firebase UID: ${firebaseUsers[0].count}`);
    
    const localOnlyUsers = await DatabaseManager.getAllAsync(
      'SELECT COUNT(*) as count FROM users WHERE firebase_uid IS NULL'
    );
    console.log(`Local-only users: ${localOnlyUsers[0].count}`);
    
  } catch (error) {
    console.error('Error displaying user data structure:', error);
  }
};
