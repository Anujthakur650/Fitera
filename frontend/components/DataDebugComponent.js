import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import DatabaseManager from '../utils/database';

const DataDebugComponent = () => {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState({
    userId: null,
    workoutCount: 0,
    completedWorkoutCount: 0,
    exerciseCount: 0,
    setCount: 0
  });

  useEffect(() => {
    if (user?.id) {
      checkUserData();
    }
  }, [user?.id]);

  const checkUserData = async () => {
    try {
      // Get workout counts
      const workoutCountResult = await DatabaseManager.getFirstAsync(
        'SELECT COUNT(*) as count FROM workouts WHERE user_id = ?',
        [user.id]
      );

      // Get completed workout counts
      const completedCountResult = await DatabaseManager.getFirstAsync(
        'SELECT COUNT(*) as count FROM workouts WHERE user_id = ? AND is_completed = 1',
        [user.id]
      );

      // Get exercise count
      const exerciseCountResult = await DatabaseManager.getFirstAsync(`
        SELECT COUNT(DISTINCT we.exercise_id) as count 
        FROM workout_exercises we
        JOIN workouts w ON we.workout_id = w.id
        WHERE w.user_id = ? AND w.is_completed = 1
      `, [user.id]);

      // Get set count
      const setCountResult = await DatabaseManager.getFirstAsync(`
        SELECT COUNT(s.id) as count 
        FROM sets s
        JOIN workout_exercises we ON s.workout_exercise_id = we.id
        JOIN workouts w ON we.workout_id = w.id
        WHERE w.user_id = ? AND w.is_completed = 1 AND s.is_completed = 1
      `, [user.id]);

      setDebugInfo({
        userId: user.id,
        workoutCount: workoutCountResult?.count || 0,
        completedWorkoutCount: completedCountResult?.count || 0,
        exerciseCount: exerciseCountResult?.count || 0,
        setCount: setCountResult?.count || 0
      });
    } catch (error) {
      console.error('Error checking user data:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debug Info</Text>
      <Text style={styles.info}>User ID: {debugInfo.userId || 'Not logged in'}</Text>
      <Text style={styles.info}>Total Workouts: {debugInfo.workoutCount}</Text>
      <Text style={styles.info}>Completed Workouts: {debugInfo.completedWorkoutCount}</Text>
      <Text style={styles.info}>Unique Exercises: {debugInfo.exerciseCount}</Text>
      <Text style={styles.info}>Completed Sets: {debugInfo.setCount}</Text>
      {debugInfo.completedWorkoutCount === 0 && (
        <Text style={styles.warning}>
          Complete at least one workout to see analytics data!
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff3cd',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    marginBottom: 4,
  },
  warning: {
    fontSize: 14,
    color: '#856404',
    marginTop: 8,
    fontWeight: '500',
  },
});

export default DataDebugComponent;
