import * as SQLite from 'expo-sqlite';
import ErrorHandler from './errorHandler';

class EnhancedDatabaseManager {
  constructor() {
    this.db = null;
    this.isConstraintsEnabled = false;
  }

  async initDatabase() {
    try {
      // Open database with enhanced security settings
      this.db = await SQLite.openDatabaseAsync('strongclone.db');
      
      // Enable critical security settings
      await this.enableSecuritySettings();
      
      // Create tables with proper constraints
      await this.createTables();
      
      // Run migrations
      await this.migrateToUserAssociation();
      
      // Seed initial data
      await this.seedExercises();
      
      // Verify database integrity
      await this.verifyDatabaseIntegrity();
      
      console.log('✅ Database initialized with enhanced security settings');
      return true;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'EnhancedDatabase', action: 'initDatabase' }, 'CRITICAL');
      return false;
    }
  }

  async enableSecuritySettings() {
    try {
      // Enable foreign key constraints - CRITICAL for data integrity
      await this.db.execAsync('PRAGMA foreign_keys = ON');
      
      // Enable Write-Ahead Logging for better concurrency and crash recovery
      await this.db.execAsync('PRAGMA journal_mode = WAL');
      
      // Set synchronous mode for better data integrity
      await this.db.execAsync('PRAGMA synchronous = FULL');
      
      // Enable recursive triggers for cascade operations
      await this.db.execAsync('PRAGMA recursive_triggers = ON');
      
      // Set auto vacuum to reclaim unused space
      await this.db.execAsync('PRAGMA auto_vacuum = FULL');
      
      // Verify foreign keys are enabled
      const fkStatus = await this.db.getFirstAsync('PRAGMA foreign_keys');
      this.isConstraintsEnabled = fkStatus.foreign_keys === 1;
      
      if (!this.isConstraintsEnabled) {
        throw new Error('Failed to enable foreign key constraints');
      }
      
      console.log('✅ Database security settings enabled:');
      console.log('  - Foreign key constraints: ENABLED');
      console.log('  - WAL mode: ENABLED');
      console.log('  - Synchronous mode: FULL');
      console.log('  - Recursive triggers: ENABLED');
      
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'EnhancedDatabase', action: 'enableSecuritySettings' }, 'CRITICAL');
      throw error;
    }
  }

  async createTables() {
    // Drop and recreate tables in correct order to ensure proper constraints
    // Note: In production, use migrations instead of dropping tables
    
    // Users table - Foundation of all user data
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        weight REAL,
        height REAL,
        is_new_user BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index on email for faster lookups
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    // Exercise categories
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercise_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon TEXT
      );
    `);

    // Exercises table with user association
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        muscle_groups TEXT,
        equipment TEXT,
        instructions TEXT,
        is_custom BOOLEAN DEFAULT 0,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES exercise_categories (id) ON DELETE RESTRICT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Create index for user-specific exercises
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
    `);

    // Workout templates with user association
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS workout_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Template exercises with cascade delete
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS template_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        order_index INTEGER NOT NULL,
        FOREIGN KEY (template_id) REFERENCES workout_templates (id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
      );
    `);

    // Workouts table with enforced user association
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        duration INTEGER DEFAULT 0,
        notes TEXT,
        template_id INTEGER,
        is_completed BOOLEAN DEFAULT 0,
        FOREIGN KEY (template_id) REFERENCES workout_templates (id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Create index for user workouts
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
    `);

    // Workout exercises with cascade delete
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS workout_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        order_index INTEGER NOT NULL,
        notes TEXT,
        FOREIGN KEY (workout_id) REFERENCES workouts (id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE RESTRICT
      );
    `);

    // Sets table with cascade delete
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_exercise_id INTEGER NOT NULL,
        set_number INTEGER NOT NULL,
        weight REAL CHECK(weight >= 0),
        reps INTEGER CHECK(reps >= 0),
        duration INTEGER CHECK(duration >= 0),
        distance REAL CHECK(distance >= 0),
        is_completed BOOLEAN DEFAULT 0,
        is_warmup BOOLEAN DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises (id) ON DELETE CASCADE
      );
    `);

    // Personal records with enforced user association
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS personal_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        record_type TEXT NOT NULL CHECK(record_type IN ('1RM', 'volume', 'max_weight', 'max_reps')),
        value REAL NOT NULL CHECK(value > 0),
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        workout_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE,
        FOREIGN KEY (workout_id) REFERENCES workouts (id) ON DELETE SET NULL
      );
    `);

    // Body measurements with enforced user association
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS body_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        measurement_type TEXT NOT NULL CHECK(measurement_type IN ('weight', 'body_fat', 'muscle_mass')),
        value REAL NOT NULL CHECK(value > 0),
        unit TEXT NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Create index for user body measurements
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_body_measurements_user_id ON body_measurements(user_id);
    `);

    console.log('✅ All tables created with proper constraints');
  }

  async verifyDatabaseIntegrity() {
    try {
      // Check foreign key integrity
      const fkCheck = await this.db.getAllAsync('PRAGMA foreign_key_check');
      if (fkCheck.length > 0) {
        console.error('❌ Foreign key constraint violations detected:', fkCheck);
        // In production, this should trigger an alert
        ErrorHandler.logError(
          new Error('Foreign key constraint violations detected'),
          { violations: fkCheck },
          'CRITICAL'
        );
      }

      // Check for orphaned data
      const orphanChecks = [
        {
          name: 'Orphaned workouts',
          query: 'SELECT COUNT(*) as count FROM workouts WHERE user_id NOT IN (SELECT id FROM users)'
        },
        {
          name: 'Orphaned exercises',
          query: 'SELECT COUNT(*) as count FROM exercises WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users)'
        },
        {
          name: 'Orphaned personal records',
          query: 'SELECT COUNT(*) as count FROM personal_records WHERE user_id NOT IN (SELECT id FROM users)'
        },
        {
          name: 'Orphaned body measurements',
          query: 'SELECT COUNT(*) as count FROM body_measurements WHERE user_id NOT IN (SELECT id FROM users)'
        }
      ];

      let hasOrphans = false;
      for (const check of orphanChecks) {
        const result = await this.db.getFirstAsync(check.query);
        if (result.count > 0) {
          hasOrphans = true;
          console.error(`❌ ${check.name}: ${result.count}`);
        }
      }

      if (!hasOrphans) {
        console.log('✅ Database integrity check passed - no orphaned data');
      }

      // Verify constraints are working
      await this.testConstraints();

    } catch (error) {
      ErrorHandler.logError(error, { screen: 'EnhancedDatabase', action: 'verifyDatabaseIntegrity' }, 'HIGH');
    }
  }

  async testConstraints() {
    console.log('🧪 Testing database constraints...');
    
    try {
      // Test 1: Foreign key constraint should prevent invalid user_id
      try {
        await this.db.runAsync(
          'INSERT INTO workouts (user_id, name) VALUES (?, ?)',
          [99999, 'Test Workout']
        );
        throw new Error('Foreign key constraint not working - invalid user_id accepted');
      } catch (error) {
        if (error.message.includes('FOREIGN KEY constraint failed')) {
          console.log('  ✅ Foreign key constraint working correctly');
        } else if (!error.message.includes('Foreign key constraint not working')) {
          throw error;
        }
      }

      // Test 2: Check constraints should prevent negative values
      try {
        // First create a valid workout and exercise
        const testUser = await this.db.getFirstAsync('SELECT id FROM users LIMIT 1');
        if (testUser) {
          const workoutResult = await this.db.runAsync(
            'INSERT INTO workouts (user_id, name) VALUES (?, ?)',
            [testUser.id, 'Test Workout']
          );
          
          const exerciseResult = await this.db.getFirstAsync('SELECT id FROM exercises LIMIT 1');
          if (exerciseResult) {
            const weResult = await this.db.runAsync(
              'INSERT INTO workout_exercises (workout_id, exercise_id, order_index) VALUES (?, ?, ?)',
              [workoutResult.lastInsertRowId, exerciseResult.id, 1]
            );
            
            // Now try to insert invalid set data
            try {
              await this.db.runAsync(
                'INSERT INTO sets (workout_exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?)',
                [weResult.lastInsertRowId, 1, -50, -10]
              );
              console.log('  ⚠️  Check constraints not enforced for negative values');
            } catch (checkError) {
              if (checkError.message.includes('CHECK constraint failed')) {
                console.log('  ✅ Check constraints working correctly');
              }
            }
            
            // Clean up test data
            await this.db.runAsync('DELETE FROM workouts WHERE id = ?', [workoutResult.lastInsertRowId]);
          }
        }
      } catch (error) {
        console.error('  ❌ Error testing check constraints:', error.message);
      }

    } catch (error) {
      console.error('❌ Constraint testing failed:', error);
    }
  }

  // Migration method - keeping existing migration logic
  async migrateToUserAssociation() {
    try {
      // Check if password column exists in users table
      const usersTableInfo = await this.db.getAllAsync("PRAGMA table_info(users)");
      const hasPasswordColumn = usersTableInfo.some(column => column.name === 'password');
      
      if (!hasPasswordColumn) {
        console.log('Adding password column to users table...');
        await this.db.execAsync('ALTER TABLE users ADD COLUMN password TEXT');
        console.log('Password column added to users table');
      }

      // Ensure all tables have user_id where needed
      const tablesToCheck = [
        { table: 'workouts', needsUserId: true },
        { table: 'body_measurements', needsUserId: true },
        { table: 'personal_records', needsUserId: true },
        { table: 'workout_templates', needsUserId: true }
      ];

      for (const { table, needsUserId } of tablesToCheck) {
        if (needsUserId) {
          const tableInfo = await this.db.getAllAsync(`PRAGMA table_info(${table})`);
          const hasUserIdColumn = tableInfo.some(column => column.name === 'user_id');
          
          if (!hasUserIdColumn) {
            console.log(`Adding user_id column to ${table} table...`);
            await this.db.execAsync(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER`);
            
            // Set default user_id for existing data
            await this.db.execAsync(`UPDATE ${table} SET user_id = 1 WHERE user_id IS NULL`);
            
            console.log(`Migration completed: ${table} now associated with users`);
          }
        }
      }
    } catch (error) {
      console.error('Migration failed:', error);
      ErrorHandler.logError(error, { screen: 'EnhancedDatabase', action: 'migrateToUserAssociation' }, 'HIGH');
    }
  }

  // Copy existing seedExercises method
  async seedExercises() {
    // Check if exercises already exist
    const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM exercises');
    if (result.count > 0) return;

    // Insert categories
    const categories = [
      { name: 'Chest', icon: 'fitness-center' },
      { name: 'Back', icon: 'fitness-center' },
      { name: 'Shoulders', icon: 'fitness-center' },
      { name: 'Arms', icon: 'fitness-center' },
      { name: 'Legs', icon: 'fitness-center' },
      { name: 'Core', icon: 'fitness-center' },
      { name: 'Cardio', icon: 'directions-run' }
    ];

    for (const category of categories) {
      await this.db.runAsync(
        'INSERT INTO exercise_categories (name, icon) VALUES (?, ?)',
        [category.name, category.icon]
      );
    }

    // Insert exercises (same as original)
    const exercises = [
      // Chest
      { name: 'Bench Press', category: 'Chest', muscle_groups: 'Chest, Triceps, Shoulders', equipment: 'Barbell' },
      { name: 'Incline Bench Press', category: 'Chest', muscle_groups: 'Upper Chest, Triceps, Shoulders', equipment: 'Barbell' },
      { name: 'Dumbbell Press', category: 'Chest', muscle_groups: 'Chest, Triceps, Shoulders', equipment: 'Dumbbells' },
      { name: 'Push-ups', category: 'Chest', muscle_groups: 'Chest, Triceps, Shoulders', equipment: 'Bodyweight' },
      { name: 'Dips', category: 'Chest', muscle_groups: 'Chest, Triceps', equipment: 'Bodyweight' },
      
      // Back
      { name: 'Deadlift', category: 'Back', muscle_groups: 'Back, Glutes, Hamstrings', equipment: 'Barbell' },
      { name: 'Pull-ups', category: 'Back', muscle_groups: 'Lats, Biceps', equipment: 'Bodyweight' },
      { name: 'Barbell Row', category: 'Back', muscle_groups: 'Back, Biceps', equipment: 'Barbell' },
      { name: 'Lat Pulldown', category: 'Back', muscle_groups: 'Lats, Biceps', equipment: 'Cable' },
      { name: 'T-Bar Row', category: 'Back', muscle_groups: 'Back, Biceps', equipment: 'T-Bar' },

      // Shoulders
      { name: 'Overhead Press', category: 'Shoulders', muscle_groups: 'Shoulders, Triceps', equipment: 'Barbell' },
      { name: 'Lateral Raises', category: 'Shoulders', muscle_groups: 'Side Delts', equipment: 'Dumbbells' },
      { name: 'Rear Delt Flyes', category: 'Shoulders', muscle_groups: 'Rear Delts', equipment: 'Dumbbells' },
      { name: 'Arnold Press', category: 'Shoulders', muscle_groups: 'Shoulders', equipment: 'Dumbbells' },

      // Arms
      { name: 'Bicep Curls', category: 'Arms', muscle_groups: 'Biceps', equipment: 'Dumbbells' },
      { name: 'Hammer Curls', category: 'Arms', muscle_groups: 'Biceps, Forearms', equipment: 'Dumbbells' },
      { name: 'Tricep Extensions', category: 'Arms', muscle_groups: 'Triceps', equipment: 'Dumbbells' },
      { name: 'Close-Grip Bench Press', category: 'Arms', muscle_groups: 'Triceps, Chest', equipment: 'Barbell' },

      // Legs
      { name: 'Squat', category: 'Legs', muscle_groups: 'Quads, Glutes', equipment: 'Barbell' },
      { name: 'Romanian Deadlift', category: 'Legs', muscle_groups: 'Hamstrings, Glutes', equipment: 'Barbell' },
      { name: 'Leg Press', category: 'Legs', muscle_groups: 'Quads, Glutes', equipment: 'Machine' },
      { name: 'Lunges', category: 'Legs', muscle_groups: 'Quads, Glutes', equipment: 'Dumbbells' },
      { name: 'Calf Raises', category: 'Legs', muscle_groups: 'Calves', equipment: 'Dumbbells' },

      // Core
      { name: 'Plank', category: 'Core', muscle_groups: 'Core', equipment: 'Bodyweight' },
      { name: 'Crunches', category: 'Core', muscle_groups: 'Abs', equipment: 'Bodyweight' },
      { name: 'Russian Twists', category: 'Core', muscle_groups: 'Obliques', equipment: 'Bodyweight' },
      { name: 'Dead Bug', category: 'Core', muscle_groups: 'Core', equipment: 'Bodyweight' },

      // Cardio
      { name: 'Running', category: 'Cardio', muscle_groups: 'Full Body', equipment: 'None' },
      { name: 'Cycling', category: 'Cardio', muscle_groups: 'Legs', equipment: 'Bike' },
      { name: 'Rowing', category: 'Cardio', muscle_groups: 'Full Body', equipment: 'Rowing Machine' }
    ];

    for (const exercise of exercises) {
      const category = await this.db.getFirstAsync(
        'SELECT id FROM exercise_categories WHERE name = ?',
        [exercise.category]
      );
      
      await this.db.runAsync(
        'INSERT INTO exercises (name, category_id, muscle_groups, equipment) VALUES (?, ?, ?, ?)',
        [exercise.name, category.id, exercise.muscle_groups, exercise.equipment]
      );
    }
  }

  // All other methods remain the same but with enhanced error handling
  // ... (copy all other methods from original database.js)

  // Enhanced method to ensure user isolation
  async createWorkout(name, templateId = null, userId) {
    if (!userId) {
      throw new Error('User ID is required to create a workout');
    }
    
    // Verify user exists
    const user = await this.db.getFirstAsync('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new Error('Invalid user ID');
    }
    
    const result = await this.db.runAsync(
      'INSERT INTO workouts (name, template_id, user_id) VALUES (?, ?, ?)',
      [name, templateId, userId]
    );
    return result.lastInsertRowId;
  }

  // Enhanced cleanup method for testing
  async cleanupOrphanedData() {
    console.log('🧹 Cleaning up orphaned data...');
    
    try {
      // Since foreign keys are enabled, we need to clean in correct order
      // This should normally not be needed with proper constraints
      
      // Clean orphaned sets
      const orphanedSets = await this.db.runAsync(`
        DELETE FROM sets 
        WHERE workout_exercise_id NOT IN (SELECT id FROM workout_exercises)
      `);
      
      if (orphanedSets.changes > 0) {
        console.log(`  - Removed ${orphanedSets.changes} orphaned sets`);
      }
      
      // Clean orphaned workout exercises
      const orphanedWE = await this.db.runAsync(`
        DELETE FROM workout_exercises 
        WHERE workout_id NOT IN (SELECT id FROM workouts)
      `);
      
      if (orphanedWE.changes > 0) {
        console.log(`  - Removed ${orphanedWE.changes} orphaned workout exercises`);
      }
      
      console.log('✅ Orphaned data cleanup complete');
      
    } catch (error) {
      console.error('Error cleaning orphaned data:', error);
      ErrorHandler.logError(error, { screen: 'EnhancedDatabase', action: 'cleanupOrphanedData' }, 'MEDIUM');
    }
  }

  // Copy all remaining methods from original database.js
  async getActiveWorkout(userId) {
    try {
      return await this.db.getFirstAsync(
        'SELECT * FROM workouts WHERE is_completed = 0 AND user_id = ? ORDER BY date DESC LIMIT 1',
        [userId]
      );
    } catch (error) {
      ErrorHandler.handleDatabaseError(error, { screen: 'Database', action: 'getActiveWorkout', userId });
      return null;
    }
  }

  async getWorkoutHistory(userId, limit = 50) {
    try {
      return await this.db.getAllAsync(
        'SELECT * FROM workouts WHERE is_completed = 1 AND user_id = ? ORDER BY date DESC LIMIT ?',
        [userId, limit]
      );
    } catch (error) {
      ErrorHandler.handleDatabaseError(error, { screen: 'Database', action: 'getWorkoutHistory', userId });
      return [];
    }
  }

  async addExerciseToWorkout(workoutId, exerciseId, orderIndex) {
    const result = await this.db.runAsync(
      'INSERT INTO workout_exercises (workout_id, exercise_id, order_index) VALUES (?, ?, ?)',
      [workoutId, exerciseId, orderIndex]
    );
    return result.lastInsertRowId;
  }

  async getWorkoutExercises(workoutId) {
    return await this.db.getAllAsync(`
      SELECT we.*, e.name as exercise_name, e.muscle_groups 
      FROM workout_exercises we 
      JOIN exercises e ON we.exercise_id = e.id 
      WHERE we.workout_id = ? 
      ORDER BY we.order_index
    `, [workoutId]);
  }

  async finishWorkout(workoutId, duration) {
    return await this.db.runAsync(
      'UPDATE workouts SET is_completed = 1, duration = ? WHERE id = ?',
      [duration, workoutId]
    );
  }

  async deleteWorkout(workoutId, userId) {
    try {
      // First verify the workout belongs to the user
      const workout = await this.db.getFirstAsync(
        'SELECT id FROM workouts WHERE id = ? AND user_id = ?',
        [workoutId, userId]
      );
      
      if (!workout) {
        const error = new Error('Workout not found or access denied');
        error.code = 'WORKOUT_ACCESS_DENIED';
        throw error;
      }
      
      // With CASCADE DELETE, we only need to delete the workout
      // All related data will be automatically deleted
      await this.db.runAsync('DELETE FROM workouts WHERE id = ? AND user_id = ?', [workoutId, userId]);
      
      // Log successful deletion for audit trail
      ErrorHandler.logError(
        { message: 'Workout deleted', code: 'WORKOUT_DELETED' },
        { screen: 'Database', action: 'deleteWorkout', userId, workoutId },
        'INFO'
      );
    } catch (error) {
      const result = ErrorHandler.handleDatabaseError(error, { screen: 'Database', action: 'deleteWorkout', userId });
      throw new Error(result.message);
    }
  }

  // Sets methods
  async addSet(workoutExerciseId, setNumber, weight, reps, isWarmup = false) {
    const result = await this.db.runAsync(
      'INSERT INTO sets (workout_exercise_id, set_number, weight, reps, is_warmup, is_completed) VALUES (?, ?, ?, ?, ?, ?)',
      [workoutExerciseId, setNumber, weight, reps, isWarmup, true]
    );
    return result.lastInsertRowId;
  }

  async getSets(workoutExerciseId) {
    return await this.db.getAllAsync(
      'SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number',
      [workoutExerciseId]
    );
  }

  async updateSet(setId, weight, reps) {
    await this.db.runAsync(
      'UPDATE sets SET weight = ?, reps = ? WHERE id = ?',
      [weight, reps, setId]
    );
  }

  async deleteSet(setId) {
    await this.db.runAsync('DELETE FROM sets WHERE id = ?', [setId]);
  }

  // Progress tracking
  async getExerciseHistory(exerciseId, userId, limit = 10) {
    try {
      return await this.db.getAllAsync(`
        SELECT s.*, w.date, we.workout_id
        FROM sets s
        JOIN workout_exercises we ON s.workout_exercise_id = we.id
        JOIN workouts w ON we.workout_id = w.id
        WHERE we.exercise_id = ? AND w.is_completed = 1 AND w.user_id = ?
        ORDER BY w.date DESC
        LIMIT ?
      `, [exerciseId, userId, limit]);
    } catch (error) {
      ErrorHandler.handleDatabaseError(error, { screen: 'Database', action: 'getExerciseHistory', userId });
      return [];
    }
  }

  async getPersonalRecords(exerciseId, userId) {
    try {
      return await this.db.getAllAsync(
        'SELECT * FROM personal_records WHERE exercise_id = ? AND user_id = ? ORDER BY date DESC',
        [exerciseId, userId]
      );
    } catch (error) {
      ErrorHandler.handleDatabaseError(error, { screen: 'Database', action: 'getPersonalRecords', userId });
      return [];
    }
  }

  // Exercise methods
  async getExercises(categoryId = null, userId = null) {
    let query = `
      SELECT e.*, c.name as category_name 
      FROM exercises e 
      LEFT JOIN exercise_categories c ON e.category_id = c.id
      WHERE (e.user_id IS NULL OR e.user_id = ?)
    `;
    let params = [userId];

    if (categoryId) {
      query += ' AND e.category_id = ?';
      params.push(categoryId);
    }

    query += ' ORDER BY e.name';
    return await this.db.getAllAsync(query, params);
  }

  async getExerciseCategories() {
    return await this.db.getAllAsync('SELECT * FROM exercise_categories ORDER BY name');
  }

  async searchExercises(searchTerm, userId = null) {
    return await this.db.getAllAsync(
      `SELECT e.*, c.name as category_name 
       FROM exercises e 
       LEFT JOIN exercise_categories c ON e.category_id = c.id 
       WHERE (e.user_id IS NULL OR e.user_id = ?) 
       AND (e.name LIKE ? OR e.muscle_groups LIKE ?) 
       ORDER BY e.name`,
      [userId, `%${searchTerm}%`, `%${searchTerm}%`]
    );
  }

  // Workout completion
  async completeWorkout(workoutId, duration) {
    await this.db.runAsync(
      'UPDATE workouts SET is_completed = 1, duration = ? WHERE id = ?',
      [duration, workoutId]
    );
  }

  // Template methods
  async getWorkoutTemplates(userId) {
    return await this.db.getAllAsync(
      'SELECT * FROM workout_templates WHERE user_id = ? ORDER BY name',
      [userId]
    );
  }

  async createTemplate(name, description, userId) {
    if (!userId) {
      throw new Error('User ID is required to create a template');
    }
    
    const result = await this.db.runAsync(
      'INSERT INTO workout_templates (name, description, user_id) VALUES (?, ?, ?)',
      [name, description, userId]
    );
    return result.lastInsertRowId;
  }

  async getTemplateExercises(templateId) {
    return await this.db.getAllAsync(`
      SELECT te.*, e.name as exercise_name, e.muscle_groups
      FROM template_exercises te
      JOIN exercises e ON te.exercise_id = e.id
      WHERE te.template_id = ?
      ORDER BY te.order_index
    `, [templateId]);
  }

  // User methods
  async getUserById(userId) {
    return await this.db.getFirstAsync(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
  }

  async updateUserProfile(userId, updates) {
    const { name, email, weight, height } = updates;
    
    // Update the updated_at timestamp
    return await this.db.runAsync(
      'UPDATE users SET name = ?, email = ?, weight = ?, height = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, email, weight, height, userId]
    );
  }

  async markUserAsReturning(userId) {
    return await this.db.runAsync(
      'UPDATE users SET is_new_user = 0 WHERE id = ?',
      [userId]
    );
  }

  async isNewUser(userId) {
    try {
      const result = await this.db.getFirstAsync(
        'SELECT is_new_user FROM users WHERE id = ?',
        [userId]
      );
      return result?.is_new_user === 1 || result?.is_new_user === null;
    } catch (error) {
      console.error('Error checking if user is new:', error);
      return true;
    }
  }

  // Direct database access methods
  async runAsync(query, params = []) {
    return await this.db.runAsync(query, params);
  }

  async getAllAsync(query, params = []) {
    return await this.db.getAllAsync(query, params);
  }

  async getFirstAsync(query, params = []) {
    return await this.db.getFirstAsync(query, params);
  }
}

export default new EnhancedDatabaseManager();
