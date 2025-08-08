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
  Timestamp,
  getCountFromServer
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
    return this.authBridge.getFirestoreUserId();
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

      // Read from public master list first
      let exercisesQuery = query(collection(db, 'exercises'), orderBy('name'));
      const exercisesSnapshot = await getDocs(exercisesQuery);

      let exercises = exercisesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Optional: include user-specific custom exercises from a user subcollection
      const uid = this.getAuthenticatedUserId();
      if (uid) {
        try {
          const userExercisesSnap = await getDocs(
            query(collection(db, 'users', uid, 'exercises'), orderBy('name'))
          );
          const userExercises = userExercisesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          exercises = [...exercises, ...userExercises];
        } catch (e) {
          // Ignore if user subcollection doesn't exist or permissions restrict access
        }
      }
      
      // Filter by category if provided (client-side to avoid index requirements)
      if (categoryId && categoryId !== 'all') {
        exercises = exercises.filter(ex => ex.categoryId === categoryId || ex.category === categoryId);
      }
      
      // If no exercises found, return defaults to avoid empty UI
      if (!exercises || exercises.length === 0) {
        exercises = this.getDefaultExercises();
      }

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

  async addExerciseToWorkout(workoutId, exerciseId, orderIndex = 0, exerciseName = null) {
    try {
      const exerciseData = {
        exerciseId,
        exerciseName: exerciseName || null,
        order_index: orderIndex,
        createdAt: serverTimestamp(),
      };
      const exerciseRef = await addDoc(collection(db, 'workouts', workoutId, 'exercises'), exerciseData);
      return exerciseRef.id;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'addExerciseToWorkout' }, 'HIGH');
      throw error;
    }
  }

  async addSet(workoutId, workoutExerciseId, setData) {
    try {
      const setRef = await addDoc(collection(db, 'workouts', workoutId, 'exercises', workoutExerciseId, 'sets'), {
        ...setData,
        createdAt: serverTimestamp()
      });
      return setRef.id;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'addSet' }, 'HIGH');
      throw error;
    }
  }

  /**
   * Get all workout exercises for a workout (Firebase subcollection)
   */
  async getWorkoutExercises(workoutId) {
    try {
      const exercisesSnapshot = await getDocs(
        query(collection(db, 'workouts', workoutId, 'exercises'), orderBy('order_index'))
      );
      return exercisesSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id, // workout exercise id used by contexts
          exercise_id: data.exerciseId || null,
          exercise_name: data.exerciseName || 'Exercise',
          order_index: data.order_index ?? 0,
        };
      });
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'getWorkoutExercises' }, 'HIGH');
      return [];
    }
  }

  /**
   * Get all sets for a workout exercise
   */
  async getSets(workoutId, workoutExerciseId) {
    try {
      const setsSnapshot = await getDocs(
        query(collection(db, 'workouts', workoutId, 'exercises', workoutExerciseId, 'sets'), orderBy('set_number'))
      );
      return setsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'getSets' }, 'HIGH');
      return [];
    }
  }

  /**
   * Get detailed workout info (exercises + sets), enriched with basic exercise metadata
   */
  async getWorkoutDetails(workoutId) {
    try {
      const exerciseMetaCache = new Map();
      const fetchExerciseMeta = async (exerciseId) => {
        if (!exerciseId) return { muscle_groups: '', category_name: '' };
        if (exerciseMetaCache.has(exerciseId)) return exerciseMetaCache.get(exerciseId);
        try {
          const exDoc = await getDoc(doc(db, 'exercises', exerciseId));
          const data = exDoc.exists() ? exDoc.data() : {};
          const meta = {
            muscle_groups: data.muscle_groups || '',
            category_name: data.category || data.category_name || '',
          };
          exerciseMetaCache.set(exerciseId, meta);
          return meta;
        } catch (_) {
          return { muscle_groups: '', category_name: '' };
        }
      };

      const workoutExercises = await this.getWorkoutExercises(workoutId);
      const results = [];
      for (const ex of workoutExercises) {
        const sets = await this.getSets(workoutId, ex.id);
        const meta = await fetchExerciseMeta(ex.exercise_id);
        results.push({
          workout_exercise_id: ex.id,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          muscle_groups: meta.muscle_groups,
          category_name: meta.category_name,
          sets,
        });
      }
      return results;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'getWorkoutDetails' }, 'HIGH');
      return [];
    }
  }

  /**
   * Delete a workout and all nested subcollections (exercises and sets)
   */
  async deleteWorkout(workoutId, userId) {
    try {
      // Delete sets and exercises first
      const exercisesSnap = await getDocs(collection(db, 'workouts', workoutId, 'exercises'));
      for (const exDoc of exercisesSnap.docs) {
        const setsSnap = await getDocs(collection(db, 'workouts', workoutId, 'exercises', exDoc.id, 'sets'));
        for (const setDoc of setsSnap.docs) {
          await deleteDoc(doc(db, 'workouts', workoutId, 'exercises', exDoc.id, 'sets', setDoc.id));
        }
        await deleteDoc(doc(db, 'workouts', workoutId, 'exercises', exDoc.id));
      }
      // Delete the workout document
      await deleteDoc(doc(db, 'workouts', workoutId));

      // Invalidate caches for this user
      if (userId) {
        this.invalidateCache(`workout_history_${userId}`);
        this.invalidateCache(`workout_stats_${userId}`);
        this.invalidateCache(`active_workout_${userId}`);
      }
      return true;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'deleteWorkout' }, 'HIGH');
      throw error;
    }
  }

  /**
   * Delete selected workouts by IDs
   */
  async deleteSelectedWorkouts(workoutIds = [], userId) {
    for (const id of workoutIds) {
      try {
        await this.deleteWorkout(id, userId);
      } catch (e) {
        // continue on error; caller will show partial failure
      }
    }
    return true;
  }

  /**
   * Delete all workouts for a user
   */
  async deleteAllWorkouts(userId) {
    try {
      const snap = await getDocs(query(collection(db, 'workouts'), where('userId', '==', userId)));
      for (const wDoc of snap.docs) {
        await this.deleteWorkout(wDoc.id, userId);
      }
      return true;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'deleteAllWorkouts' }, 'HIGH');
      throw error;
    }
  }

  async getActiveWorkout(userId) {
    try {
      // Require authenticated user
      const isAuthenticated = await this.ensureAuthentication();
      if (!isAuthenticated) return null;

      const cacheKey = `active_workout_${userId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // Use authenticated user ID for Firestore query
      const authenticatedUserId = this.getAuthenticatedUserId();
      if (!authenticatedUserId) return null;

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
      // Require authenticated user
      const isAuthenticated = await this.ensureAuthentication();
      if (!isAuthenticated) return [];

      const cacheKey = `workout_history_${userId}_${limitCount}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // Use authenticated user ID for Firestore query
      const authenticatedUserId = this.getAuthenticatedUserId();
      if (!authenticatedUserId) return [];

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
        const created = workoutData.createdAt?.toDate?.() || new Date(workoutData.createdAt || workoutData.date || 0);
        const dateISO = created instanceof Date && !isNaN(created) ? created.toISOString() : null;
        
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
          // Normalize date to an ISO string for UI helpers expecting strings
          date: dateISO,
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
    try {
      const cacheKey = `recent_workouts_${userId}_${limitCount}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // Lightweight list: no subcollection reads
      const recentSnap = await getDocs(
        query(
          collection(db, 'workouts'),
          where('userId', '==', userId),
          where('isCompleted', '==', true),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        )
      );

      const items = recentSnap.docs.map(docSnap => {
        const w = docSnap.data();
        const created = w.createdAt?.toDate?.() || new Date(w.createdAt || 0);
        return {
          id: docSnap.id,
          name: w.name || 'Workout',
          date: created instanceof Date && !isNaN(created) ? created.toISOString() : null,
          duration: w.duration || 0,
          total_volume: typeof w.totalVolume === 'number' ? w.totalVolume : 0,
          // optional precomputed counts if present; do not fetch subcollections here
          exercise_count: w.exerciseCount || 0,
          set_count: w.setCount || 0,
        };
      });

      this.setCachedData(cacheKey, items, 5 * 60 * 1000);
      return items;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'getRecentWorkouts' }, 'MEDIUM');
      return [];
    }
  }

  // Optimized user progress stats (fast, low-IO)
  async getUserProgressStats(userId) {
    try {
      const cacheKey = `progress_stats_${userId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // 1) Count completed workouts using aggregation (no document reads)
      const countSnap = await getCountFromServer(
        query(
          collection(db, 'workouts'),
          where('userId', '==', userId),
          where('isCompleted', '==', true)
        )
      );
      const totalWorkouts = countSnap.data().count || 0;

      // 2) Fetch limited recent workouts to derive thisWeek + favoriteExercise quickly
      const recentWorkoutsSnap = await getDocs(
        query(
          collection(db, 'workouts'),
          where('userId', '==', userId),
          where('isCompleted', '==', true),
          orderBy('createdAt', 'desc'),
          limit(30) // enough to compute weekly stats and top exercise without heavy IO
        )
      );

      let thisWeekWorkouts = 0;
      let totalVolume = 0;
      const exerciseFrequency = new Map();

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      // Iterate recent workouts only
      for (const workoutDoc of recentWorkoutsSnap.docs) {
        const workoutData = workoutDoc.data();
        const created = workoutData.createdAt?.toDate?.() || new Date(workoutData.createdAt || 0);
        if (created >= weekStart) thisWeekWorkouts++;

        // Prefer persisted total volume if available (written on finish)
        if (typeof workoutData.totalVolume === 'number') {
          totalVolume += workoutData.totalVolume;
          continue; // no need to read subcollections
        }

        // Fallback: read only exercises (not sets) to compute favorite quickly
        const exercisesSnap = await getDocs(collection(db, 'workouts', workoutDoc.id, 'exercises'));
        exercisesSnap.docs.forEach(exDoc => {
          const ex = exDoc.data();
          const name = ex.exerciseName || ex.name || 'Unknown';
          exerciseFrequency.set(name, (exerciseFrequency.get(name) || 0) + 1);
        });
      }

      // If we still need favoriteExercise and frequency map is empty, default gracefully
      let favoriteExercise = 'None';
      if (exerciseFrequency.size > 0) {
        let max = 0;
        for (const [name, freq] of exerciseFrequency) {
          if (freq > max) {
            max = freq;
            favoriteExercise = name;
          }
        }
      }

      const stats = {
        totalWorkouts,
        thisWeekWorkouts,
        totalVolume: Math.round(totalVolume),
        favoriteExercise
      };

      this.setCachedData(cacheKey, stats);
      return stats;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'FirebaseDatabase', action: 'getUserProgressStats' }, 'HIGH');
      return { totalWorkouts: 0, thisWeekWorkouts: 0, totalVolume: 0, favoriteExercise: 'None' };
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
        const workoutDate = workout.createdAt?.toDate?.() || new Date(workout.createdAt);
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

      // Compute total volume once when finishing to speed up future stats
      let totalVolume = 0;
      try {
        const exercisesSnap = await getDocs(collection(db, 'workouts', workoutId, 'exercises'));
        for (const ex of exercisesSnap.docs) {
          const setsSnap = await getDocs(collection(db, 'workouts', workoutId, 'exercises', ex.id, 'sets'));
          setsSnap.docs.forEach(snap => {
            const s = snap.data();
            if (s.is_completed && s.weight && s.reps) totalVolume += s.weight * s.reps;
          });
        }
      } catch (_) {}

      await updateDoc(workoutRef, {
        isCompleted: true,
        completedAt: serverTimestamp(),
        duration: duration || 0,
        totalVolume: Math.round(totalVolume),
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
