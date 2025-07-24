import DatabaseManager from './database';

export class DebugDatabase {
  /**
   * Generate test workout data for debugging
   * This helps test the workout history screen with proper data
   */
  static async generateTestWorkoutData(userId = 1) {
    try {
      console.log('🔧 Generating test workout data for user:', userId);
      
      // Get some exercises to use
      const exercises = await DatabaseManager.getExercises();
      if (exercises.length === 0) {
        console.error('No exercises found in database');
        return;
      }
      
      // Create completed workouts with different dates and times to avoid duplicates
      const now = new Date();
      const workoutDates = [
        new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago today
        new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000), // Yesterday afternoon
        new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000), // 2 days ago
        new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000), // 5 days ago
        new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000), // 10 days ago
        new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000 - 6 * 60 * 60 * 1000), // 20 days ago
        new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000), // 45 days ago
        new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000), // 100 days ago
      ];
      
      for (let i = 0; i < workoutDates.length; i++) {
        const date = workoutDates[i];
        
        // Create workout with a temporary name first
        const tempName = `Temp Workout ${i}`;
        const workoutId = await DatabaseManager.createWorkout(tempName, null, userId);
        
        // Update the date to match our test date
        await DatabaseManager.runAsync(
          'UPDATE workouts SET date = ? WHERE id = ?',
          [date.toISOString(), workoutId]
        );
        
        // Now generate the workout name based on the actual stored date
        // This ensures the name matches the date
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const monthName = monthNames[date.getMonth()];
        const dayNum = date.getDate();
        const workoutName = `Workout - ${monthName} ${dayNum}`;
        
        // Update the workout with the correct name
        await DatabaseManager.runAsync(
          'UPDATE workouts SET name = ? WHERE id = ?',
          [workoutName, workoutId]
        );
        
        // Add 3-4 exercises to each workout
        const exerciseCount = 3 + Math.floor(Math.random() * 2);
        const selectedExercises = exercises
          .sort(() => Math.random() - 0.5)
          .slice(0, exerciseCount);
        
        for (let j = 0; j < selectedExercises.length; j++) {
          const exercise = selectedExercises[j];
          
          // Add exercise to workout
          const workoutExerciseId = await DatabaseManager.addExerciseToWorkout(
            workoutId,
            exercise.id,
            j
          );
          
          // Add 3-4 sets for each exercise
          const setCount = 3 + Math.floor(Math.random() * 2);
          for (let k = 0; k < setCount; k++) {
            const weight = 50 + Math.floor(Math.random() * 100);
            const reps = 8 + Math.floor(Math.random() * 8);
            const isWarmup = k === 0 && Math.random() > 0.5;
            
            await DatabaseManager.addSet(
              workoutExerciseId,
              k + 1,
              weight,
              reps,
              isWarmup
            );
          }
        }
        
        // Complete the workout with a random duration
        const duration = 1800 + Math.floor(Math.random() * 3600); // 30-90 minutes
        await DatabaseManager.completeWorkout(workoutId, duration);
        
        console.log(`✅ Created test workout: ${workoutName} with ${exerciseCount} exercises`);
      }
      
      console.log('🎉 Test workout data generation complete!');
      
    } catch (error) {
      console.error('Error generating test workout data:', error);
    }
  }
  
  /**
   * Clear all workout data for a user (for testing)
   */
  static async clearUserWorkouts(userId = 1) {
    try {
      console.log('🗑️ Clearing all workouts for user:', userId);
      
      // Get all workout IDs for the user
      const workouts = await DatabaseManager.getAllAsync(
        'SELECT id FROM workouts WHERE user_id = ?',
        [userId]
      );
      
      for (const workout of workouts) {
        await DatabaseManager.deleteWorkout(workout.id, userId);
      }
      
      console.log(`✅ Cleared ${workouts.length} workouts`);
      
    } catch (error) {
      console.error('Error clearing user workouts:', error);
    }
  }
  
  /**
   * Get debug info about the database state
   */
  static async getDatabaseStats() {
    try {
      const stats = {
        users: await DatabaseManager.getFirstAsync('SELECT COUNT(*) as count FROM users'),
        exercises: await DatabaseManager.getFirstAsync('SELECT COUNT(*) as count FROM exercises'),
        categories: await DatabaseManager.getFirstAsync('SELECT COUNT(*) as count FROM exercise_categories'),
        totalWorkouts: await DatabaseManager.getFirstAsync('SELECT COUNT(*) as count FROM workouts'),
        completedWorkouts: await DatabaseManager.getFirstAsync('SELECT COUNT(*) as count FROM workouts WHERE is_completed = 1'),
        activeWorkouts: await DatabaseManager.getFirstAsync('SELECT COUNT(*) as count FROM workouts WHERE is_completed = 0'),
        totalSets: await DatabaseManager.getFirstAsync('SELECT COUNT(*) as count FROM sets'),
        workoutsWithData: await DatabaseManager.getFirstAsync(`
          SELECT COUNT(DISTINCT w.id) as count
          FROM workouts w
          JOIN workout_exercises we ON w.id = we.workout_id
          JOIN sets s ON we.id = s.workout_exercise_id
          WHERE w.is_completed = 1
        `)
      };
      
      console.log('📊 Database Statistics:');
      console.log(`  - Users: ${stats.users.count}`);
      console.log(`  - Exercises: ${stats.exercises.count}`);
      console.log(`  - Categories: ${stats.categories.count}`);
      console.log(`  - Total Workouts: ${stats.totalWorkouts.count}`);
      console.log(`  - Completed Workouts: ${stats.completedWorkouts.count}`);
      console.log(`  - Active Workouts: ${stats.activeWorkouts.count}`);
      console.log(`  - Total Sets: ${stats.totalSets.count}`);
      console.log(`  - Workouts with exercise data: ${stats.workoutsWithData.count}`);
      
      return stats;
      
    } catch (error) {
      console.error('Error getting database stats:', error);
      return null;
    }
  }
}

export default DebugDatabase;
