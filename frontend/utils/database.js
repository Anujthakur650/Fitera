import * as SQLite from 'expo-sqlite';

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  async initDatabase() {
    try {
      this.db = await SQLite.openDatabaseAsync('strongclone.db');
      await this.createTables();
      await this.seedExercises();
      return true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      return false;
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

    // Workouts table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        duration INTEGER DEFAULT 0,
        notes TEXT,
        template_id INTEGER,
        is_completed BOOLEAN DEFAULT 0,
        FOREIGN KEY (template_id) REFERENCES workout_templates (id)
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
  async createWorkout(name, templateId = null) {
    const result = await this.db.runAsync(
      'INSERT INTO workouts (name, template_id) VALUES (?, ?)',
      [name, templateId]
    );
    return result.lastInsertRowId;
  }

  async getActiveWorkout() {
    return await this.db.getFirstAsync(
      'SELECT * FROM workouts WHERE is_completed = 0 ORDER BY date DESC LIMIT 1'
    );
  }

  async getWorkoutHistory(limit = 50) {
    return await this.db.getAllAsync(
      'SELECT * FROM workouts WHERE is_completed = 1 ORDER BY date DESC LIMIT ?',
      [limit]
    );
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
  async getExerciseHistory(exerciseId, limit = 10) {
    return await this.db.getAllAsync(`
      SELECT s.*, w.date, we.workout_id
      FROM sets s
      JOIN workout_exercises we ON s.workout_exercise_id = we.id
      JOIN workouts w ON we.workout_id = w.id
      WHERE we.exercise_id = ? AND w.is_completed = 1
      ORDER BY w.date DESC
      LIMIT ?
    `, [exerciseId, limit]);
  }

  async getPersonalRecords(exerciseId) {
    return await this.db.getAllAsync(
      'SELECT * FROM personal_records WHERE exercise_id = ? ORDER BY date DESC',
      [exerciseId]
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

export default new DatabaseManager(); 