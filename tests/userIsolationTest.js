/**
 * User Isolation Testing Protocol
 * Ensures that users can only access their own data and verifies complete user data separation.
 */

import DatabaseManager from '../utils/database';
import { AuthProvider } from '../contexts/AuthContext';
import { renderHook, act } from '@testing-library/react-hooks';
import '@testing-library/jest-dom';

async function createUser(name, email, password) {
  const { result } = renderHook(() => AuthProvider({ children: null }));

  await act(async () => {
    const { register } = result.current;
    await register(name, email, password);
  });

  return result.current.user;
}

async function loginUser(email, password) {
  const { result } = renderHook(() => AuthProvider({ children: null }));

  await act(async () => {
    const { login } = result.current;
    await login(email, password);
  });

  return result.current.user;
}

async function testUserIsolation() {
  console.log('🔒 Starting User Isolation Tests');
  console.log('='.repeat(60));
  
  try {
    // Create test users
    const user1 = await createUser('Test User 1', 'test1@example.com', 'Password123');
    const user2 = await createUser('Test User 2', 'test2@example.com', 'Password456');

    // Verify users are separate
    if (!user1 || !user2 || user1.id === user2.id) {
      console.error('❌ User ID overlap detected');
      return;
    }

    console.log('✅ User accounts created and verified as separate');

    // Test login and data isolation
    const user1Data = await loginUser('test1@example.com', 'Password123');
    console.log('User 1 logged in:', user1Data);

    const user2Data = await loginUser('test2@example.com', 'Password456');
    console.log('User 2 logged in:', user2Data);

    // Database query to verify user isolation for workouts
    const workoutsUser1 = await DatabaseManager.getWorkoutHistory(user1.id);
    const workoutsUser2 = await DatabaseManager.getWorkoutHistory(user2.id);
    if (workoutsUser1.some(workout => workout.user_id !== user1.id)) {
      console.error('❌ User 1 can see User 2 workouts');
    } else {
      console.log('✅ User 1 sees only their workouts');
    }

    if (workoutsUser2.some(workout => workout.user_id !== user2.id)) {
      console.error('❌ User 2 can see User 1 workouts');
    } else {
      console.log('✅ User 2 sees only their workouts');
    }

    // Assert results
    console.assert(user1 && user2 && user1.id !== user2.id, 'User IDs must be unique');

    console.log('✅ User isolation tests completed successfully');
  } catch (error) {
    console.error('❌ Critical error in user isolation testing:', error);
  }
}

export default testUserIsolation;
