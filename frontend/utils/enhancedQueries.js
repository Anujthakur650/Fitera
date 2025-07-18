import DatabaseManager from './database';

export class EnhancedQueries {
  // Get comprehensive workout statistics for analytics
  static async getWorkoutAnalytics(timeframeDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

    const query = `
      SELECT 
        w.id as workout_id,
        w.name as workout_name,
        w.date,
        w.duration,
        COUNT(DISTINCT we.exercise_id) as exercise_count,
        COUNT(s.id) as total_sets,
        SUM(CASE WHEN s.is_warmup = 0 THEN s.weight * s.reps ELSE 0 END) as working_volume,
        SUM(s.weight * s.reps) as total_volume,
        AVG(s.weight) as avg_weight,
        AVG(s.reps) as avg_reps,
        MAX(s.weight) as max_weight,
        MAX(s.reps) as max_reps
      FROM workouts w
      LEFT JOIN workout_exercises we ON w.id = we.workout_id
      LEFT JOIN sets s ON we.id = s.workout_exercise_id AND s.is_completed = 1
      WHERE w.is_completed = 1 
        AND w.date >= ?
      GROUP BY w.id
      ORDER BY w.date DESC
    `;

    return await DatabaseManager.getAllAsync(query, [cutoffDate.toISOString()]);
  }

  // Get muscle group distribution with detailed breakdown
  static async getMuscleGroupAnalytics(timeframeDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

    const query = `
      SELECT 
        c.name as category_name,
        e.muscle_groups,
        COUNT(DISTINCT w.id) as workout_count,
        COUNT(DISTINCT e.id) as exercise_variety,
        COUNT(s.id) as total_sets,
        SUM(s.weight * s.reps) as total_volume,
        AVG(s.weight * s.reps) as avg_set_volume,
        SUM(s.reps) as total_reps,
        AVG(s.weight) as avg_weight,
        MIN(w.date) as first_workout,
        MAX(w.date) as last_workout,
        COUNT(DISTINCT DATE(w.date)) as training_days
      FROM sets s
      JOIN workout_exercises we ON s.workout_exercise_id = we.id
      JOIN workouts w ON we.workout_id = w.id
      JOIN exercises e ON we.exercise_id = e.id
      JOIN exercise_categories c ON e.category_id = c.id
      WHERE w.is_completed = 1 
        AND w.date >= ?
        AND s.is_completed = 1
        AND s.is_warmup = 0
      GROUP BY c.id, c.name
      ORDER BY total_volume DESC
    `;

    return await DatabaseManager.getAllAsync(query, [cutoffDate.toISOString()]);
  }

  // Get exercise progression data
  static async getExerciseProgression(exerciseId, timeframeDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

    const query = `
      SELECT 
        w.date,
        w.id as workout_id,
        e.name as exercise_name,
        s.weight,
        s.reps,
        s.weight * s.reps as volume,
        s.weight * (1 + s.reps / 30) as estimated_1rm,
        s.set_number,
        ROW_NUMBER() OVER (PARTITION BY w.id ORDER BY s.weight DESC, s.reps DESC) as set_rank,
        LAG(s.weight) OVER (ORDER BY w.date, s.set_number) as prev_weight,
        LAG(s.reps) OVER (ORDER BY w.date, s.set_number) as prev_reps
      FROM sets s
      JOIN workout_exercises we ON s.workout_exercise_id = we.id
      JOIN workouts w ON we.workout_id = w.id
      JOIN exercises e ON we.exercise_id = e.id
      WHERE e.id = ?
        AND w.is_completed = 1
        AND w.date >= ?
        AND s.is_completed = 1
        AND s.is_warmup = 0
        AND s.weight > 0
        AND s.reps > 0
      ORDER BY w.date ASC, s.set_number ASC
    `;

    return await DatabaseManager.getAllAsync(query, [exerciseId, cutoffDate.toISOString()]);
  }

  // Get personal records with detailed history
  static async getPersonalRecordsDetailed() {
    const query = `
      SELECT 
        e.id as exercise_id,
        e.name as exercise_name,
        c.name as category_name,
        e.muscle_groups,
        MAX(s.weight) as max_weight,
        MAX(s.reps) as max_reps,
        MAX(s.weight * s.reps) as max_volume,
        MAX(s.weight * (1 + s.reps / 30)) as estimated_1rm,
        COUNT(DISTINCT w.id) as workout_count,
        COUNT(s.id) as total_sets,
        AVG(s.weight) as avg_weight,
        AVG(s.reps) as avg_reps,
        MIN(w.date) as first_performed,
        MAX(w.date) as last_performed,
        CASE 
          WHEN MAX(w.date) >= date('now', '-7 days') THEN 'recent'
          WHEN MAX(w.date) >= date('now', '-30 days') THEN 'moderate'
          ELSE 'old'
        END as recency_status
      FROM exercises e
      JOIN exercise_categories c ON e.category_id = c.id
      LEFT JOIN workout_exercises we ON e.id = we.exercise_id
      LEFT JOIN workouts w ON we.workout_id = w.id AND w.is_completed = 1
      LEFT JOIN sets s ON we.id = s.workout_exercise_id 
        AND s.is_completed = 1 
        AND s.is_warmup = 0
        AND s.weight > 0 
        AND s.reps > 0
      WHERE w.id IS NOT NULL
      GROUP BY e.id
      HAVING COUNT(s.id) > 0
      ORDER BY estimated_1rm DESC
    `;

    return await DatabaseManager.getAllAsync(query);
  }

  // Get strength ratios data
  static async getStrengthRatioData() {
    const exerciseMaxes = {};
    
    // Get max estimated 1RM for each exercise
    const query = `
      SELECT 
        e.name as exercise_name,
        MAX(s.weight * (1 + s.reps / 30)) as estimated_1rm,
        MAX(s.weight) as max_weight,
        MAX(s.reps) as max_reps_at_max_weight,
        COUNT(s.id) as total_sets
      FROM sets s
      JOIN workout_exercises we ON s.workout_exercise_id = we.id
      JOIN workouts w ON we.workout_id = w.id
      JOIN exercises e ON we.exercise_id = e.id
      WHERE w.is_completed = 1
        AND s.is_completed = 1
        AND s.is_warmup = 0
        AND s.weight > 0
        AND s.reps > 0
      GROUP BY e.id, e.name
      HAVING COUNT(s.id) >= 3
      ORDER BY estimated_1rm DESC
    `;

    const results = await DatabaseManager.getAllAsync(query);
    
    results.forEach(result => {
      exerciseMaxes[result.exercise_name] = {
        estimated1RM: Math.round(result.estimated_1rm),
        maxWeight: result.max_weight,
        maxReps: result.max_reps_at_max_weight,
        totalSets: result.total_sets
      };
    });

    return exerciseMaxes;
  }

  // Get volume distribution over time
  static async getVolumeDistributionOverTime(timeframeDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

    const query = `
      SELECT 
        DATE(w.date) as workout_date,
        strftime('%Y-%W', w.date) as week_year,
        strftime('%Y-%m', w.date) as month_year,
        c.name as category_name,
        e.name as exercise_name,
        COUNT(s.id) as set_count,
        SUM(s.weight * s.reps) as daily_volume,
        AVG(s.weight) as avg_weight,
        AVG(s.reps) as avg_reps,
        SUM(s.reps) as total_reps
      FROM sets s
      JOIN workout_exercises we ON s.workout_exercise_id = we.id
      JOIN workouts w ON we.workout_id = w.id
      JOIN exercises e ON we.exercise_id = e.id
      JOIN exercise_categories c ON e.category_id = c.id
      WHERE w.is_completed = 1 
        AND w.date >= ?
        AND s.is_completed = 1
        AND s.is_warmup = 0
      GROUP BY DATE(w.date), e.id
      ORDER BY w.date ASC
    `;

    return await DatabaseManager.getAllAsync(query, [cutoffDate.toISOString()]);
  }

  // Get workout frequency patterns
  static async getWorkoutFrequencyPatterns(timeframeDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

    const query = `
      SELECT 
        DATE(date) as workout_date,
        strftime('%w', date) as day_of_week,
        strftime('%H', date) as hour_of_day,
        strftime('%Y-%W', date) as week_year,
        COUNT(*) as workout_count,
        AVG(duration) as avg_duration,
        SUM(duration) as total_duration,
        GROUP_CONCAT(name, ', ') as workout_names
      FROM workouts
      WHERE is_completed = 1
        AND date >= ?
      GROUP BY DATE(date)
      ORDER BY date ASC
    `;

    return await DatabaseManager.getAllAsync(query, [cutoffDate.toISOString()]);
  }

  // Get exercise variety and frequency
  static async getExerciseVarietyAnalysis(timeframeDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

    const query = `
      SELECT 
        e.id as exercise_id,
        e.name as exercise_name,
        c.name as category_name,
        e.muscle_groups,
        COUNT(DISTINCT w.id) as workout_frequency,
        COUNT(DISTINCT DATE(w.date)) as days_performed,
        COUNT(s.id) as total_sets,
        SUM(s.weight * s.reps) as total_volume,
        AVG(s.weight * s.reps) as avg_set_volume,
        MIN(w.date) as first_performed,
        MAX(w.date) as last_performed,
        ROUND(
          CAST(COUNT(DISTINCT w.id) AS FLOAT) / 
          CAST((julianday('now') - julianday(?)) / 7 AS FLOAT), 2
        ) as weekly_frequency
      FROM exercises e
      JOIN exercise_categories c ON e.category_id = c.id
      LEFT JOIN workout_exercises we ON e.id = we.exercise_id
      LEFT JOIN workouts w ON we.workout_id = w.id AND w.is_completed = 1 AND w.date >= ?
      LEFT JOIN sets s ON we.id = s.workout_exercise_id 
        AND s.is_completed = 1 
        AND s.is_warmup = 0
      WHERE w.id IS NOT NULL
      GROUP BY e.id
      HAVING COUNT(s.id) > 0
      ORDER BY workout_frequency DESC, total_volume DESC
    `;

    return await DatabaseManager.getAllAsync(query, [cutoffDate.toISOString(), cutoffDate.toISOString()]);
  }

  // Get performance consistency metrics
  static async getPerformanceConsistency(exerciseId, timeframeDays = 60) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

    const query = `
      SELECT 
        w.date,
        s.weight,
        s.reps,
        s.weight * s.reps as volume,
        s.weight * (1 + s.reps / 30) as estimated_1rm,
        AVG(s.weight * s.reps) OVER (
          ORDER BY w.date 
          ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING
        ) as rolling_avg_volume,
        LAG(s.weight * s.reps, 1) OVER (ORDER BY w.date) as prev_volume,
        (s.weight * s.reps - LAG(s.weight * s.reps, 1) OVER (ORDER BY w.date)) as volume_change
      FROM sets s
      JOIN workout_exercises we ON s.workout_exercise_id = we.id
      JOIN workouts w ON we.workout_id = w.id
      WHERE we.exercise_id = ?
        AND w.is_completed = 1
        AND w.date >= ?
        AND s.is_completed = 1
        AND s.is_warmup = 0
        AND s.weight > 0
        AND s.reps > 0
      ORDER BY w.date ASC
    `;

    return await DatabaseManager.getAllAsync(query, [exerciseId, cutoffDate.toISOString()]);
  }

  // Get body measurement trends
  static async getBodyMeasurementTrends(timeframeDays = 180) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

    const query = `
      SELECT 
        measurement_type,
        value,
        unit,
        date,
        notes,
        LAG(value, 1) OVER (
          PARTITION BY measurement_type 
          ORDER BY date
        ) as prev_value,
        value - LAG(value, 1) OVER (
          PARTITION BY measurement_type 
          ORDER BY date
        ) as change_from_prev
      FROM body_measurements
      WHERE date >= ?
      ORDER BY measurement_type, date ASC
    `;

    return await DatabaseManager.getAllAsync(query, [cutoffDate.toISOString()]);
  }

  // Get workout intensity analysis
  static async getWorkoutIntensityAnalysis(timeframeDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

    const query = `
      SELECT 
        w.id as workout_id,
        w.name as workout_name,
        w.date,
        w.duration,
        COUNT(DISTINCT we.exercise_id) as exercise_count,
        COUNT(s.id) as total_sets,
        SUM(s.weight * s.reps) as total_volume,
        SUM(s.weight * s.reps) / w.duration as volume_per_minute,
        AVG(s.weight / (SELECT MAX(weight) FROM sets s2 
             JOIN workout_exercises we2 ON s2.workout_exercise_id = we2.id 
             WHERE we2.exercise_id = we.exercise_id)) * 100 as avg_intensity_percent,
        COUNT(CASE WHEN s.is_warmup = 0 THEN 1 END) as working_sets,
        COUNT(CASE WHEN s.is_warmup = 1 THEN 1 END) as warmup_sets
      FROM workouts w
      LEFT JOIN workout_exercises we ON w.id = we.workout_id
      LEFT JOIN sets s ON we.id = s.workout_exercise_id AND s.is_completed = 1
      WHERE w.is_completed = 1 
        AND w.date >= ?
        AND w.duration > 0
      GROUP BY w.id
      HAVING COUNT(s.id) > 0
      ORDER BY w.date DESC
    `;

    return await DatabaseManager.getAllAsync(query, [cutoffDate.toISOString()]);
  }
}

export default EnhancedQueries; 