import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  updateDoc, 
  deleteDoc,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import ErrorHandler from './errorHandler';
import FirebaseAuthBridge from './firebaseAuthBridge';

/**
 * Consolidated Firebase Database Manager
 * Optimized for performance with caching and error handling
 */
class FirebaseDatabase {
  constructor() {
    this.isInitialized = true;
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.cacheTTL = 15 * 60 * 1000; // 15 minutes
    this.authBridge = FirebaseAuthBridge;
    
    // Initialize Firebase Auth Bridge
    this.initializeAuthBridge();
  }

  /**
   * Initialize Firebase Auth Bridge for Firestore permissions
   */
  async initializeAuthBridge() {
    try {
      console.log('🔗 Initializing Firebase Auth Bridge for database operations...');
      const result = await this.authBridge.initializeBridge();
      
      if (result.success) {
        console.log('✅ Firebase Auth Bridge initialized:', result.reason);
      } else {
        console.log('⚠️ Firebase Auth Bridge initialization failed:', result.reason);
      }
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'initializeAuthBridge' }, 'MEDIUM');
    }
  }

  /**
   * Ensure Firebase Auth is ready before database operations
   */
  async ensureAuthentication() {
    try {
      // Ensure Firebase auth bridge is ready before DB operations
      const isReady = await this.authBridge.ensureFirebaseAuth();
      if (!isReady) {
        // In development, allow guarded fallback to keep app usable without blocking
        if (__DEV__) {
          console.warn('⚠️ Firebase Auth not ready; continuing in dev mode without auth');
          return true; // Backward-compat for development only
        }
        console.warn('⚠️ Firebase Auth not ready for database operations');
        return false;
      }
      return true;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'ensureAuthentication' }, 'HIGH');
      return false;
    }
  }

  /**
   * Get authenticated user ID for Firestore queries
   */
  getAuthenticatedUserId() {
    // Use Firebase UID supplied by the auth bridge
    const uid = this.authBridge.getFirestoreUserId();
    if (!uid && __DEV__) {
      // Guarded dev fallback to avoid hard crash during local testing
      console.warn('⚠️ No authenticated Firebase user; dev fallback user will be used');
      return 'dev-fallback-user';
    }
    return uid;
  }

  // Cache management
  getCachedData(key) {
    const now = Date.now();
    const expiry = this.cacheExpiry.get(key);
    
    if (expiry && now > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  setCachedData(key, data, customTTL = null) {
    const ttl = customTTL || this.cacheTTL;
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + ttl);
  }

  invalidateCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
          this.cacheExpiry.delete(key);
        }
      }
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }

  // User methods
  async createUser(userData) {
    try {
      const userRef = doc(db, 'users', userData.uid);
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      });
      
      // Invalidate user cache
      this.invalidateCache(`user_${userData.uid}`);
      
      return userData.uid;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'createUser' }, 'HIGH');
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const cacheKey = `user_${userId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = { id: userDoc.id, ...userDoc.data() };
        this.setCachedData(cacheKey, userData);
        return userData;
      }
      return null;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'getUserById' }, 'HIGH');
      return null;
    }
  }

  async getUserByFirebaseUid(firebaseUid) {
    return await this.getUserById(firebaseUid);
  }

  async updateUserProfile(userId, updates) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      // Invalidate user cache
      this.invalidateCache(`user_${userId}`);
      
      return true;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'updateUserProfile' }, 'HIGH');
      throw error;
    }
  }

  // Exercise categories with caching
  async getExerciseCategories() {
    try {
      const cacheKey = 'exercise_categories';
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const categoriesSnapshot = await getDocs(
        query(collection(db, 'categories'), orderBy('name'))
      );
      const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Cache for longer since categories don't change often
      this.setCachedData(cacheKey, categories, 60 * 60 * 1000); // 1 hour
      
      return categories;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'getExerciseCategories' }, 'MEDIUM');
      return this.getDefaultCategories();
    }
  }

  // Exercises with caching
  async getExercises(categoryId = null) {
    try {
      const cacheKey = `exercises_${categoryId || 'all'}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      let exercisesQuery = collection(db, 'exercises');
      
      if (categoryId && categoryId !== 'all') {
        exercisesQuery = query(exercisesQuery, where('categoryId', '==', categoryId));
      }
      
      exercisesQuery = query(exercisesQuery, orderBy('name'));
      const exercisesSnapshot = await getDocs(exercisesQuery);
      
      const exercises = exercisesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Cache for longer since exercises don't change often
      this.setCachedData(cacheKey, exercises, 30 * 60 * 1000); // 30 minutes
      
      return exercises;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'getExercises' }, 'MEDIUM');
      return this.getDefaultExercises();
    }
  }

  async searchExercises(searchTerm) {
    try {
      const exercises = await this.getExercises();
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      return exercises.filter(exercise => 
        exercise.name.toLowerCase().includes(lowerSearchTerm) ||
        (exercise.muscle_groups && exercise.muscle_groups.toLowerCase().includes(lowerSearchTerm))
      );
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'searchExercises' }, 'MEDIUM');
      return [];
    }
  }

  // Workouts
  async createWorkout(name, templateId = null, userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required to create a workout');
      }

      const workoutData = {
        name,
        userId,
        templateId,
        date: serverTimestamp(),
        duration: 0,
        notes: '',
        isCompleted: false,
        createdAt: serverTimestamp()
      };

      const workoutRef = await addDoc(collection(db, 'workouts'), workoutData);
      
      // Invalidate workout caches
      this.invalidateCache(`workouts_${userId}`);
      this.invalidateCache(`active_workout_${userId}`);
      
      return workoutRef.id;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'createWorkout' }, 'HIGH');
      throw error;
    }
  }

  async getActiveWorkout(userId) {
    try {
      // Ensure Firebase Auth is ready
      const isAuthenticated = await this.ensureAuthentication();
      if (!isAuthenticated) {
        console.warn('⚠️ Cannot get active workout: Firebase Auth not ready');
        return null;
      }

      const cacheKey = `active_workout_${userId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // Use authenticated user ID for Firestore query
      const authenticatedUserId = this.getAuthenticatedUserId();
      if (!authenticatedUserId) {
        console.warn('⚠️ No authenticated user ID available for getActiveWorkout');
        return null;
      }

      // Use a simpler query to avoid index requirements
      const workoutsSnapshot = await getDocs(
        query(
          collection(db, 'workouts'),
          where('userId', '==', authenticatedUserId),
          where('isCompleted', '==', false)
        )
      );

      if (workoutsSnapshot.empty) {
        return null;
      }

      // Sort by createdAt manually and get the most recent
      const workouts = workoutsSnapshot.docs.map(doc => ({
        doc,
        data: doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(doc.data().createdAt || 0)
      }));
      
      workouts.sort((a, b) => b.createdAt - a.createdAt);
      const workoutDoc = workouts[0].doc;
      const workoutData = { id: workoutDoc.id, ...workoutDoc.data() };

      // Get exercises for this workout
      const exercisesSnapshot = await getDocs(
        query(collection(db, 'workouts', workoutDoc.id, 'exercises'), orderBy('order_index'))
      );

      const exercises = [];
      for (const exerciseDoc of exercisesSnapshot.docs) {
        const exerciseData = exerciseDoc.data();
        
        // Get sets for this exercise
        const setsSnapshot = await getDocs(
          query(collection(db, 'workouts', workoutDoc.id, 'exercises', exerciseDoc.id, 'sets'), orderBy('set_number'))
        );

        const sets = setsSnapshot.docs.map(setDoc => ({
          id: setDoc.id,
          ...setDoc.data()
        }));

        exercises.push({
          id: exerciseDoc.id,
          ...exerciseData,
          sets
        });
      }

      const activeWorkout = { ...workoutData, exercises };
      
      // Cache for shorter time since active workouts change frequently
      this.setCachedData(cacheKey, activeWorkout, 5 * 60 * 1000); // 5 minutes
      
      return activeWorkout;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'getActiveWorkout' }, 'HIGH');
      return null;
    }
  }

  // Optimized workout history with pagination
  async getWorkoutHistory(userId, limitCount = 50) {
    try {
      // Ensure Firebase Auth is ready
      const isAuthenticated = await this.ensureAuthentication();
      if (!isAuthenticated) {
        console.warn('⚠️ Cannot get workout history: Firebase Auth not ready');
        return [];
      }

      const cacheKey = `workout_history_${userId}_${limitCount}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // Use authenticated user ID for Firestore query
      const authenticatedUserId = this.getAuthenticatedUserId();
      if (!authenticatedUserId) {
        console.warn('⚠️ No authenticated user ID available for getWorkoutHistory');
        return [];
      }

      const workoutsSnapshot = await getDocs(
        query(
          collection(db, 'workouts'),
          where('userId', '==', authenticatedUserId),
          where('isCompleted', '==', true),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        )
      );

      const workouts = [];
      for (const workoutDoc of workoutsSnapshot.docs) {
        const workoutData = workoutDoc.data();
        
        // Get exercise count and set count efficiently
        const exercisesSnapshot = await getDocs(collection(db, 'workouts', workoutDoc.id, 'exercises'));
        let totalSets = 0;
        let totalVolume = 0;

        for (const exerciseDoc of exercisesSnapshot.docs) {
          const setsSnapshot = await getDocs(collection(db, 'workouts', workoutDoc.id, 'exercises', exerciseDoc.id, 'sets'));
          totalSets += setsSnapshot.size;
          
          // Calculate volume
          setsSnapshot.docs.forEach(setDoc => {
            const setData = setDoc.data();
            if (setData.weight && setData.reps) {
              totalVolume += setData.weight * setData.reps;
            }
          });
        }

        workouts.push({
          id: workoutDoc.id,
          ...workoutData,
          exercise_count: exercisesSnapshot.size,
          set_count: totalSets,
          total_volume: totalVolume
        });
      }

      // Cache for moderate time
      this.setCachedData(cacheKey, workouts, 10 * 60 * 1000); // 10 minutes
      
      return workouts;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'getWorkoutHistory' }, 'HIGH');
      return [];
    }
  }

  async getRecentWorkouts(userId, limitCount = 5) {
    return await this.getWorkoutHistory(userId, limitCount);
  }

  // Optimized user progress stats (replaces multiple individual queries)
  async getUserProgressStats(userId) {
    try {
      const cacheKey = `progress_stats_${userId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // Get all completed workouts for comprehensive stats
      const workoutsSnapshot = await getDocs(
        query(
          collection(db, 'workouts'),
          where('userId', '==', userId),
          where('isCompleted', '==', true),
          orderBy('date', 'desc')
        )
      );

      let totalWorkouts = workoutsSnapshot.size;
      let totalVolume = 0;
      let thisWeekWorkouts = 0;
      const exerciseFrequency = new Map();

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      for (const workoutDoc of workoutsSnapshot.docs) {
        const workoutData = workoutDoc.data();
        const workoutDate = workoutData.date?.toDate() || new Date(workoutData.date);

        // Count this week's workouts
        if (workoutDate >= weekStart) {
          thisWeekWorkouts++;
        }

        // Get exercises and calculate volume
        const exercisesSnapshot = await getDocs(collection(db, 'workouts', workoutDoc.id, 'exercises'));
        
        for (const exerciseDoc of exercisesSnapshot.docs) {
          const exerciseData = exerciseDoc.data();
          
          // Track exercise frequency
          const exerciseName = exerciseData.exerciseName || exerciseData.name || 'Unknown';
          exerciseFrequency.set(exerciseName, (exerciseFrequency.get(exerciseName) || 0) + 1);

          // Calculate volume
          const setsSnapshot = await getDocs(collection(db, 'workouts', workoutDoc.id, 'exercises', exerciseDoc.id, 'sets'));
          setsSnapshot.docs.forEach(setDoc => {
            const setData = setDoc.data();
            if (setData.weight && setData.reps) {
              totalVolume += setData.weight * setData.reps;
            }
          });
        }
      }

      // Find favorite exercise
      let favoriteExercise = 'None';
      let maxFrequency = 0;
      for (const [exercise, frequency] of exerciseFrequency) {
        if (frequency > maxFrequency) {
          maxFrequency = frequency;
          favoriteExercise = exercise;
        }
      }

      const stats = {
        totalWorkouts,
        thisWeekWorkouts,
        totalVolume: Math.round(totalVolume),
        favoriteExercise
      };

      // Cache for 15 minutes
      this.setCachedData(cacheKey, stats);
      
      return stats;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'getUserProgressStats' }, 'HIGH');
      return {
        totalWorkouts: 0,
        thisWeekWorkouts: 0,
        totalVolume: 0,
        favoriteExercise: 'None'
      };
    }
  }

  // Default data fallbacks
  getDefaultCategories() {
    return [
      { id: 'chest', name: 'Chest', icon: 'fitness-center' },
      { id: 'back', name: 'Back', icon: 'fitness-center' },
      { id: 'shoulders', name: 'Shoulders', icon: 'fitness-center' },
      { id: 'arms', name: 'Arms', icon: 'fitness-center' },
      { id: 'legs', name: 'Legs', icon: 'fitness-center' },
      { id: 'core', name: 'Core', icon: 'fitness-center' },
      { id: 'cardio', name: 'Cardio', icon: 'directions-run' }
    ];
  }

  getDefaultExercises() {
    return [
      { id: 'bench-press', name: 'Bench Press', categoryId: 'chest', muscle_groups: 'Chest, Triceps' },
      { id: 'squat', name: 'Squat', categoryId: 'legs', muscle_groups: 'Quadriceps, Glutes' },
      { id: 'deadlift', name: 'Deadlift', categoryId: 'back', muscle_groups: 'Back, Hamstrings' },
      { id: 'overhead-press', name: 'Overhead Press', categoryId: 'shoulders', muscle_groups: 'Shoulders, Triceps' },
      { id: 'barbell-row', name: 'Barbell Row', categoryId: 'back', muscle_groups: 'Back, Biceps' },
      { id: 'pull-up', name: 'Pull-up', categoryId: 'back', muscle_groups: 'Back, Biceps' },
      { id: 'dip', name: 'Dip', categoryId: 'chest', muscle_groups: 'Chest, Triceps' },
      { id: 'bicep-curl', name: 'Bicep Curl', categoryId: 'arms', muscle_groups: 'Biceps' },
      { id: 'tricep-extension', name: 'Tricep Extension', categoryId: 'arms', muscle_groups: 'Triceps' },
      { id: 'plank', name: 'Plank', categoryId: 'core', muscle_groups: 'Core' }
    ];
  }

  // Initialize method for compatibility
  async initDatabase() {
    return true;
  }

  // Helper method to ensure user exists
  async ensureUserExists(firebaseUser) {
    try {
      const existingUser = await this.getUserById(firebaseUser.uid);
      if (!existingUser) {
        await this.createUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0]
        });
      }
      return true;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'ensureUserExists' }, 'HIGH');
      return false;
    }
  }

  // Templates methods
  async getTemplates(userId) {
    try {
      const cacheKey = `templates_${userId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const templatesSnapshot = await getDocs(
        query(
          collection(db, 'templates'),
          where('userId', '==', userId),
          orderBy('name')
        )
      );
      
      const templates = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.setCachedData(cacheKey, templates);
      
      return templates;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'getTemplates' }, 'HIGH');
      return [];
    }
  }

  // User profile methods
  async getUserProfile(userId) {
    try {
      return await this.getUserById(userId);
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'getUserProfile' }, 'HIGH');
      return null;
    }
  }

  // User stats methods (alias for getUserProgressStats)
  async getUserStats(userId) {
    try {
      // Ensure Firebase Auth is ready
      const isAuthenticated = await this.ensureAuthentication();
      if (!isAuthenticated) {
        console.warn('⚠️ Cannot get user stats: Firebase Auth not ready');
        return {
          totalWorkouts: 0,
          thisWeekWorkouts: 0,
          totalVolume: 0,
          favoriteExercise: 'None'
        };
      }

      return await this.getUserProgressStats(userId);
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'getUserStats' }, 'HIGH');
      return {
        totalWorkouts: 0,
        thisWeekWorkouts: 0,
        totalVolume: 0,
        favoriteExercise: 'None'
      };
    }
  }

  // Workout stats methods
  async getWorkoutStats(userId) {
    try {
      const cacheKey = `workout_stats_${userId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // Get workout statistics
      const workoutsSnapshot = await getDocs(
        query(
          collection(db, 'workouts'),
          where('userId', '==', userId),
          where('isCompleted', '==', true)
        )
      );

      const workouts = workoutsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Calculate stats
      const totalWorkouts = workouts.length;
      const totalDuration = workouts.reduce((sum, workout) => sum + (workout.duration || 0), 0);
      const avgDuration = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0;
      
      // Get recent workouts (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentWorkouts = workouts.filter(workout => {
        const workoutDate = workout.createdAt?.toDate() || new Date(workout.createdAt);
        return workoutDate >= thirtyDaysAgo;
      });

      const stats = {
        totalWorkouts,
        recentWorkouts: recentWorkouts.length,
        totalDuration: Math.round(totalDuration),
        avgDuration: Math.round(avgDuration),
        longestWorkout: Math.max(...workouts.map(w => w.duration || 0), 0),
        shortestWorkout: totalWorkouts > 0 ? Math.min(...workouts.map(w => w.duration || 0).filter(d => d > 0)) : 0
      };

      this.setCachedData(cacheKey, stats);
      return stats;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'getWorkoutStats' }, 'HIGH');
      return {
        totalWorkouts: 0,
        recentWorkouts: 0,
        totalDuration: 0,
        avgDuration: 0,
        longestWorkout: 0,
        shortestWorkout: 0
      };
    }
  }

  // Finish workout method
  async finishWorkout(workoutId, duration) {
    try {
      const workoutRef = doc(db, 'workouts', workoutId);
      await updateDoc(workoutRef, {
        isCompleted: true,
        completedAt: serverTimestamp(),
        duration: duration || 0,
        updatedAt: serverTimestamp()
      });

      // Invalidate related caches
      const workoutDoc = await getDoc(workoutRef);
      if (workoutDoc.exists()) {
        const userId = workoutDoc.data().userId;
        this.invalidateCache(`progress_stats_${userId}`);
        this.invalidateCache(`workout_stats_${userId}`);
        this.invalidateCache(`workout_history_${userId}`);
      }

      return true;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'finishWorkout' }, 'HIGH');
      throw error;
    }
  }

  // Personal Records methods
  async getPersonalRecords(userId) {
    try {
      const cacheKey = `personal_records_${userId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const recordsSnapshot = await getDocs(
        query(
          collection(db, 'personalRecords'),
          where('userId', '==', userId),
          orderBy('achievedAt', 'desc')
        )
      );
      
      const records = recordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.setCachedData(cacheKey, records);
      
      return records;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'getPersonalRecords' }, 'HIGH');
      return [];
    }
  }

  // Migration methods
  async migrateWorkoutNaming(userId) {
    try {
      console.log(`Starting workout naming migration for user: ${userId}`);
      
      // Get all workouts for the user that might need naming fixes
      const workoutsSnapshot = await getDocs(
        query(
          collection(db, 'workouts'),
          where('userId', '==', userId)
        )
      );

      let migratedCount = 0;
      
      for (const workoutDoc of workoutsSnapshot.docs) {
        const workoutData = workoutDoc.data();
        
        // Check if workout needs a name update
        if (!workoutData.name || workoutData.name === 'Untitled Workout' || workoutData.name.trim() === '') {
          const newName = `Workout ${new Date(workoutData.createdAt?.toDate() || workoutData.createdAt).toLocaleDateString()}`;
          
          await updateDoc(doc(db, 'workouts', workoutDoc.id), {
            name: newName,
            updatedAt: serverTimestamp()
          });
          
          migratedCount++;
        }
      }
      
      console.log(`Migration completed: ${migratedCount} workouts updated`);
      
      // Invalidate workout-related caches
      this.invalidateCache(`workout_history_${userId}`);
      this.invalidateCache(`workout_stats_${userId}`);
      
      return { success: true, migratedCount };
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'migrateWorkoutNaming' }, 'HIGH');
      return { success: false, error: error.message };
    }
  }

  // Legacy compatibility methods (deprecated)
  async getAllAsync(query, params = []) {
    console.warn('getAllAsync is deprecated. Use Firebase query methods instead.');
    return [];
  }

  async getFirstAsync(query, params = []) {
    console.warn('getFirstAsync is deprecated. Use Firebase query methods instead.');
    return null;
  }

  async runAsync(query, params = []) {
    console.warn('runAsync is deprecated. Use Firebase methods instead.');
    return { lastInsertRowId: null };
  }
}

export default new FirebaseDatabase();
