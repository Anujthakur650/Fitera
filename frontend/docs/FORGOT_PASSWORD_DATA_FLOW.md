# 🔑 Forgot Password Flow & Data Interaction Analysis

## Current Problem: Firebase vs Local Auth Mismatch

When a user clicks "Forgot Password", there's a **critical disconnect** between Firebase authentication and local data:

### What Currently Happens:

1. **User clicks "Forgot Password"**
   - Goes to `ForgotPasswordEmailScreen.js`
   - Uses Firebase Auth: `sendPasswordResetEmail(auth, email)`
   - Firebase sends reset email

2. **Firebase Checks**
   ```javascript
   // Firebase looks for user in its own database
   // Returns error if user doesn't exist in Firebase:
   case 'auth/user-not-found':
     errorMessage = 'No account found with this email address.';
   ```

3. **The Problem**
   - User registered locally (SQLite) 
   - User data exists in local database
   - User is NOT in Firebase Auth
   - Firebase returns "user not found"
   - User can't reset password!

## Why This Happens

### Current Auth Flow Issues:

```javascript
// Registration (AuthContext.js)
register() {
  try {
    // Try API registration
    await api.post('/auth/register', {...})
  } catch {
    // Falls back to LOCAL SQLite
    await localRegister() // <-- User created locally, NOT in Firebase
  }
}

// Forgot Password (ForgotPasswordEmailScreen.js)
forgotPassword() {
  // ONLY uses Firebase Auth
  await sendPasswordResetEmail(auth, email) // <-- Fails for local users!
}
```

## Data Sync Issues

### Scenario 1: Local User Tries Password Reset
```
1. User registered locally (SQLite)
2. User has workouts in local database
3. User forgets password
4. Clicks "Forgot Password"
5. Firebase says "User not found" ❌
6. User is stuck!
```

### Scenario 2: User Creates Firebase Account After Local
```
1. User has local account: user@example.com
2. User can't reset password
3. User creates NEW Firebase account with same email
4. Now has:
   - Local account (ID: 1) with all workout data
   - Firebase account (UID: abc123) with no data
5. Data is NOT connected!
```

## Solutions

### Solution 1: Fix Current AuthContext (Quick Fix)
Add local password reset to AuthContext.js:

```javascript
// Add to AuthContext.js
const forgotPassword = async (email) => {
  try {
    // Check if user exists locally
    const users = await DatabaseManager.getAllAsync(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email]
    );
    
    if (users.length > 0) {
      // For local users, implement alternative reset
      // Option 1: Generate temporary password
      const tempPassword = generateTempPassword();
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        tempPassword + 'fitera_salt_2025'
      );
      
      await DatabaseManager.runAsync(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, email]
      );
      
      // Show temporary password to user
      Alert.alert(
        'Password Reset',
        `Your temporary password is: ${tempPassword}\n\nPlease login and change it immediately.`
      );
      return { success: true };
    }
    
    // If not local, try Firebase
    await sendPasswordResetEmail(auth, email);
    return { success: true };
    
  } catch (error) {
    return { success: false, message: error.message };
  }
};
```

### Solution 2: Migrate to UnifiedAuthContext (Better)
This handles both Firebase and local users properly:

```javascript
// UnifiedAuthContext already has this logic
const requestPasswordReset = async (email) => {
  try {
    if (authMode === 'firebase') {
      return await sendPasswordResetEmail(email);
    } else {
      // For local auth
      return {
        success: false,
        message: 'Password reset is only available for Firebase accounts.'
      };
    }
  } catch (error) {
    return ErrorHandler.handleAuthError(error);
  }
};
```

### Solution 3: Auto-Migrate Local Users to Firebase (Best)
When user attempts password reset:

```javascript
const handleForgotPassword = async (email) => {
  // Check if user exists locally
  const localUser = await DatabaseManager.getAllAsync(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  
  if (localUser.length > 0 && !localUser[0].firebase_uid) {
    // User exists locally but not in Firebase
    Alert.alert(
      'Account Migration Required',
      'To use password reset, we need to upgrade your account to cloud sync. This will enable password reset and backup features.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade Account',
          onPress: async () => {
            // Create Firebase account for existing user
            const tempPassword = generateSecureToken();
            
            try {
              // Create Firebase user
              const { user: firebaseUser } = await createUserWithEmailAndPassword(
                auth,
                email,
                tempPassword
              );
              
              // Link to local account
              await DatabaseManager.linkFirebaseUidToExistingUser(
                localUser[0].id,
                firebaseUser.uid
              );
              
              // Send password reset email
              await sendPasswordResetEmail(auth, email);
              
              Alert.alert(
                'Success',
                'Your account has been upgraded. Check your email for password reset instructions.'
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to upgrade account');
            }
          }
        }
      ]
    );
  } else {
    // Normal Firebase reset
    await sendPasswordResetEmail(auth, email);
  }
};
```

## Data Preservation Strategy

### When User Resets Password:

1. **Local User → Firebase Migration**
   ```javascript
   // Preserve all local data
   const preserveUserData = async (localUserId, firebaseUid) => {
     // Link accounts
     await DatabaseManager.runAsync(
       'UPDATE users SET firebase_uid = ? WHERE id = ?',
       [firebaseUid, localUserId]
     );
     
     // All workouts remain linked via user_id
     // No data loss!
   };
   ```

2. **Firebase User Login After Reset**
   ```javascript
   // In login flow
   const handleFirebaseLogin = async (firebaseUser) => {
     // Check if user has local data
     const localUser = await DatabaseManager.getUserByFirebaseUid(firebaseUser.uid);
     
     if (!localUser) {
       // Check by email for migration
       const userByEmail = await DatabaseManager.getAllAsync(
         'SELECT * FROM users WHERE email = ?',
         [firebaseUser.email]
       );
       
       if (userByEmail.length > 0) {
         // Link accounts
         await DatabaseManager.linkFirebaseUidToExistingUser(
           userByEmail[0].id,
           firebaseUser.uid
         );
       }
     }
   };
   ```

## Current Risk Assessment

### High Risk Scenarios:
1. **Local users can't reset passwords** ❌
2. **Creating duplicate accounts** ❌
3. **Data orphaning** ❌
4. **User confusion** ❌

### Impact:
- Users with forgotten passwords are locked out
- May create new accounts and lose workout history
- Poor user experience
- Support burden

## Recommended Implementation

### Immediate Fix (1 hour):
1. Add `forgotPassword` method to AuthContext
2. Show appropriate error for local users
3. Provide alternative reset method

### Proper Fix (4 hours):
1. Switch to UnifiedAuthContext
2. Implement account migration flow
3. Test all scenarios
4. Update UI to guide users

### Best Practice:
- Always check both local and Firebase
- Provide migration path
- Preserve all user data
- Clear user communication

## Testing Checklist

- [ ] Local user attempts password reset
- [ ] Firebase user attempts password reset
- [ ] Local user migrates to Firebase
- [ ] Existing Firebase user with local data
- [ ] Email doesn't exist anywhere
- [ ] Network failure scenarios
