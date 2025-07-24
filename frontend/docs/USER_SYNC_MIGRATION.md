# User Synchronization Migration Guide

## Overview
This migration improves user data synchronization between Firebase Authentication and SQLite local database, ensuring proper data isolation and consistency across the Fitera app.

## Changes Implemented

### 1. Database Schema Updates
- Added `firebase_uid` column to `users` table with UNIQUE constraint
- Created index on `firebase_uid` for faster lookups
- Maintains backward compatibility with existing users

### 2. User ID Management
- **Removed all `userId = 1` fallbacks** throughout the app
- Uses SQLite integer IDs for all local data operations
- Maps Firebase UIDs to local user IDs for Firebase-authenticated users
- Enforces user authentication before allowing data operations

### 3. New Database Methods
```javascript
// Firebase user synchronization
getUserByFirebaseUid(firebaseUid)
createOrUpdateFirebaseUser(firebaseUser)
linkFirebaseUidToExistingUser(userId, firebaseUid)
getUserIdForAuth(authUser)
```

### 4. Unified Auth Context
Created `UnifiedAuthContext.js` that:
- Handles both Firebase and local authentication
- Properly syncs Firebase users with local database
- Maintains consistent user object structure
- Supports auth mode switching (Firebase/local)

### 5. Updated Components
- **WorkoutContext**: No longer falls back to userId=1
- **HomeScreen**: Requires authenticated user for data loading
- **WorkoutHistoryScreen**: Only shows authenticated user's workouts
- **ProfileScreen**: Only displays authenticated user's stats

## Migration Process

### For New Users
1. User signs up with Firebase or local auth
2. Local user record is created with proper ID mapping
3. All data is associated with the correct user ID

### For Existing Users
1. Existing local users maintain their integer IDs
2. Firebase users get linked via `firebase_uid` column
3. No data loss or orphaned records

## Testing

Run the migration test to verify everything works:

```javascript
import { testUserSyncMigration } from './tests/testUserSyncMigration';

// Run the test
await testUserSyncMigration();

// Check user data structure
await displayUserDataStructure();
```

## Security Improvements

1. **Data Isolation**: Each user only sees their own data
2. **No Default User**: Removed dangerous fallback to user ID 1
3. **Authentication Required**: All data operations require authenticated user
4. **Audit Trail**: All auth events are logged for security

## Breaking Changes

⚠️ **Important**: Apps that relied on the `userId = 1` fallback will need users to authenticate before accessing data.

### Before (Unsafe)
```javascript
const userId = user?.id || 1; // Dangerous fallback
```

### After (Safe)
```javascript
if (!user || !user.id) {
  // Require authentication
  return;
}
const userId = user.id;
```

## Rollback Plan

If issues arise:
1. Database backup is created before migration
2. Use `DatabaseBackup.restoreBackup()` to restore
3. Revert code changes to previous version

## Future Considerations

### Complete Firebase Migration
To fully migrate to Firebase:
1. Use Firestore for all user data
2. Remove SQLite dependency
3. Implement offline persistence with Firestore
4. Use Firebase Auth as single source of truth

### Benefits of Full Migration
- Real-time sync across devices
- Automatic backups
- Better scalability
- Reduced app complexity

## Troubleshooting

### Common Issues

1. **"No authenticated user" errors**
   - Ensure user is logged in before accessing protected screens
   - Check auth state in context

2. **Missing workout data**
   - Verify user ID is properly set
   - Check database integrity with verification tools

3. **Firebase sync failures**
   - Verify Firebase configuration
   - Check network connectivity
   - Review Firebase console for auth issues

### Debug Commands
```javascript
// Check current user
console.log('Current user:', user);

// Verify database schema
const tableInfo = await DatabaseManager.getAllAsync("PRAGMA table_info(users)");
console.log('Users table schema:', tableInfo);

// Check for orphaned data
await DatabaseManager.verifyDatabaseIntegrity();
```

## Support

For issues or questions:
- Check console logs for detailed error messages
- Run integrity checks
- Review migration test results
- Contact support with error details

---

Last Updated: January 2025
Version: 1.0.0
