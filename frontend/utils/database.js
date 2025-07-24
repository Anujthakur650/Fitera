import * as SQLite from 'expo-sqlite';
import ErrorHandler from './errorHandler';

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  async initDatabase() {
    try {
      this.db = await SQLite.openDatabaseAsync('strongclone.db');
      
      // Enable foreign key constraints - CRITICAL for data integrity
      await this.enableForeignKeyConstraints();
      
      await this.createTables();
      await this.migrateToUserAssociation(); // Add user association migration
      await this.seedExercises();
      
      // Verify database integrity
      await this.verifyDatabaseIntegrity();
      
      return true;
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'Database', action: 'initDatabase' }, 'CRITICAL');
      return false;
    }
  }

  async enableForeignKeyConstraints() {
    try {
      // Enable foreign key constraints
      await this.db.execAsync('PRAGMA foreign_keys = ON');
      
      // Enable Write-Ahead Logging for better concurrency
      await this.db.execAsync('PRAGMA journal_mode = WAL');
      
      // Set synchronous mode for data integrity
      await this.db.execAsync('PRAGMA synchronous = NORMAL');
      
      // Verify foreign keys are enabled
      const fkStatus = await this.db.getFirstAsync('PRAGMA foreign_keys');
      
      if (fkStatus.foreign_keys !== 1) {
        throw new Error('Failed to enable foreign key constraints');
      }
      
      // Add database optimization pragmas
      await this.db.execAsync('PRAGMA optimize');
      await this.db.execAsync('PRAGMA cache_size = 10000');
      await this.db.execAsync('PRAGMA temp_store = MEMORY');
      
      console.log('✅ Database security settings enabled:');
      console.log('  - Foreign key constraints: ENABLED');
      console.log('  - WAL mode: ENABLED');
      console.log('  - Optimization: ENABLED');
      
    } catch (error) {
      ErrorHandler.logError(error, { screen: 'Database', action: 'enableForeignKeyConstraints' }, 'CRITICAL');
      throw error;
    }
  }

  async verifyDatabaseIntegrity() {
    try {
      // Check for orphaned data
      const orphanChecks = [
        {
          name: 'Orphaned workouts',
          query: 'SELECT COUNT(*) as count FROM workouts WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users)'
        },
        {
          name: 'Orphaned personal records',
          query: 'SELECT COUNT(*) as count FROM personal_records WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users)'
        },
        {
          name: 'Orphaned body measurements',
          query: 'SELECT COUNT(*) as count FROM body_measurements WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users)'
        }
      ];

      let hasOrphans = false;
      for (const check of orphanChecks) {
        try {
          const result = await this.db.getFirstAsync(check.query);
          if (result && result.count > 0) {
            hasOrphans = true;
            console.error(`❌ ${check.name}: ${result.count}`);
            ErrorHandler.logError(
              new Error(`${check.name} detected`),
              { count: result.count, check: check.name },
              'HIGH'
            );
          }
        } catch (error) {
          // Table might not exist yet during initial setup
          console.log(`Skipping check for ${check.name} - table may not exist yet`);
        }
      }

      if (!hasOrphans) {
        console.log('✅ Database integrity check passed - no orphaned data');
      }

    } catch (error) {
      ErrorHandler.logError(error, { screen: 'Database', action: 'verifyDatabaseIntegrity' }, 'MEDIUM');
    }
  }

  async createTables() {
    // Users table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        weight REAL,
        height REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Exercise categories
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercise_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon TEXT
      );
    `);

    // Exercises table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER,
        muscle_groups TEXT,
        equipment TEXT,
        instructions TEXT,
        is_custom BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES exercise_categories (id)
      );
    `);

    // Workout templates
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS workout_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Template exercises
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS template_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER,
        exercise_id INTEGER,
        order_index INTEGER,
        FOREIGN KEY (template_id) REFERENCES workout_templates (id),
        FOREIGN KEY (exercise_id) REFERENCES exercises (id)
      );
    `);

    // Workouts table (with user association)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        duration INTEGER DEFAULT 0,
        notes TEXT,
        template_id INTEGER,
        is_completed BOOLEAN DEFAULT 0,
        FOREIGN KEY (template_id) REFERENCES workout_templates (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `);

    // Workout exercises
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS workout_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER,
        exercise_id INTEGER,
        order_index INTEGER,
        notes TEXT,
        FOREIGN KEY (workout_id) REFERENCES workouts (id),
        FOREIGN KEY (exercise_id) REFERENCES exercises (id)
      );
    `);

    // Sets table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_exercise_id INTEGER,
        set_number INTEGER,
        weight REAL,
        reps INTEGER,
        duration INTEGER,
        distance REAL,
        is_completed BOOLEAN DEFAULT 0,
        is_warmup BOOLEAN DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises (id)
      );
    `);

    // Personal records
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS personal_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_id INTEGER,
        record_type TEXT, -- '1RM', 'volume', 'max_weight', 'max_reps'
        value REAL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        workout_id INTEGER,
        FOREIGN KEY (exercise_id) REFERENCES exercises (id),
        FOREIGN KEY (workout_id) REFERENCES workouts (id)
      );
    `);

    // Body measurements
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS body_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        measurement_type TEXT, -- 'weight', 'body_fat', 'muscle_mass'
        value REAL,
        unit TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      );
    `);
  }

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

      // Check if user_id column already exists in workouts table
      const tableInfo = await this.db.getAllAsync("PRAGMA table_info(workouts)");
      const hasUserIdColumn = tableInfo.some(column => column.name === 'user_id');
      
      if (!hasUserIdColumn) {
        console.log('Adding user_id column to workouts table...');
        await this.db.execAsync('ALTER TABLE workouts ADD COLUMN user_id INTEGER');
        
        // For existing workouts, we'll set user_id to 1 (default user)
        // This ensures backward compatibility
        await this.db.execAsync('UPDATE workouts SET user_id = 1 WHERE user_id IS NULL');
        
        console.log('Migration completed: workouts now associated with users');
      }

      // Update body_measurements table as well
      const measurementsInfo = await this.db.getAllAsync("PRAGMA table_info(body_measurements)");
      const hasUserIdInMeasurements = measurementsInfo.some(column => column.name === 'user_id');
      
      if (!hasUserIdInMeasurements) {
        await this.db.execAsync('ALTER TABLE body_measurements ADD COLUMN user_id INTEGER');
        await this.db.execAsync('UPDATE body_measurements SET user_id = 1 WHERE user_id IS NULL');
      }

      // Update personal_records table as well
      const recordsInfo = await this.db.getAllAsync("PRAGMA table_info(personal_records)");
      const hasUserIdInRecords = recordsInfo.some(column => column.name === 'user_id');
      
      if (!hasUserIdInRecords) {
        await this.db.execAsync('ALTER TABLE personal_records ADD COLUMN user_id INTEGER');
        await this.db.execAsync('UPDATE personal_records SET user_id = 1 WHERE user_id IS NULL');
      }
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }

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

    // Insert exercises
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

  // Exercise methods
  async getExercises(categoryId = null) {
    let query = `
      SELECT e.*, c.name as category_name 
      FROM exercises e 
      LEFT JOIN exercise_categories c ON e.category_id = c.id
    `;
    let params = [];

    if (categoryId) {
      query += ' WHERE e.category_id = ?';
      params.push(categoryId);
    }

    query += ' ORDER BY e.name';
    return await this.db.getAllAsync(query, params);
  }

  async getExerciseCategories() {
    return await this.db.getAllAsync('SELECT * FROM exercise_categories ORDER BY name');
  }

  async searchExercises(searchTerm) {
    return await this.db.getAllAsync(
      'SELECT e.*, c.name as category_name FROM exercises e LEFT JOIN exercise_categories c ON e.category_id = c.id WHERE e.name LIKE ? OR e.muscle_groups LIKE ? ORDER BY e.name',
      [`%${searchTerm}%`, `%${searchTerm}%`]
    );
  }

  // Workout methods
  async createWorkout(name, templateId = null, userId = 1) {
    const result = await this.db.runAsync(
      'INSERT INTO workouts (name, template_id, user_id) VALUES (?, ?, ?)',
      [name, templateId, userId]
    );
    return result.lastInsertRowId;
  }

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
      
      // Delete sets first
      await this.db.runAsync(`
        DELETE FROM sets 
        WHERE workout_exercise_id IN (
          SELECT id FROM workout_exercises WHERE workout_id = ?
        )
      `, [workoutId]);
      
      // Delete workout exercises
      await this.db.runAsync('DELETE FROM workout_exercises WHERE workout_id = ?', [workoutId]);
      
      // Delete workout
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

  // Workout completion
  async completeWorkout(workoutId, duration) {
    await this.db.runAsync(
      'UPDATE workouts SET is_completed = 1, duration = ? WHERE id = ?',
      [duration, workoutId]
    );
  }

  // Template methods
  async getWorkoutTemplates() {
    return await this.db.getAllAsync('SELECT * FROM workout_templates ORDER BY name');
  }

  async createTemplate(name, description) {
    const result = await this.db.runAsync(
      'INSERT INTO workout_templates (name, description) VALUES (?, ?)',
      [name, description]
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

  // Additional methods for analytics
  async runAsync(query, params = []) {
    return await this.db.runAsync(query, params);
  }

  async getAllAsync(query, params = []) {
    return await this.db.getAllAsync(query, params);
  }

  async getFirstAsync(query, params = []) {
    return await this.db.getFirstAsync(query, params);
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

  // User methods
  async getUserById(userId) {
    return await this.db.getFirstAsync(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
  }

  async updateUserProfile(userId, updates) {
    const { name, email, weight, height } = updates;
    return await this.db.runAsync(
      'UPDATE users SET name = ?, email = ?, weight = ?, height = ? WHERE id = ?',
      [name, email, weight, height, userId]
    );
  }

  async markUserAsReturning(userId) {
    // Add is_new_user column if it doesn't exist
    try {
      await this.db.execAsync('ALTER TABLE users ADD COLUMN is_new_user BOOLEAN DEFAULT 1');
    } catch (error) {
      // Column might already exist, that's ok
    }
    
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
      return result?.is_new_user === 1 || result?.is_new_user === null; // null means new (no column yet)
    } catch (error) {
      console.error('Error checking if user is new:', error);
      return true; // Default to new user if error
    }
  }
}

export default new DatabaseManager(); 