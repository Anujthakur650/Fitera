import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import DatabaseManager from '../utils/database';

const WorkoutContext = createContext();

// Reducer for workout state management
const workoutReducer = (state, action) => {
  switch (action.type) {
    case 'INIT_DATABASE':
      return { ...state, dbInitialized: action.payload };
    
    case 'SET_ACTIVE_WORKOUT':
      return { ...state, activeWorkout: action.payload };
    
    case 'SET_WORKOUT_EXERCISES':
      return { ...state, workoutExercises: action.payload };
    
    case 'ADD_EXERCISE_TO_WORKOUT':
      return {
        ...state,
        workoutExercises: [...state.workoutExercises, action.payload]
      };
    
    case 'UPDATE_EXERCISE_SETS':
      return {
        ...state,
        exerciseSets: {
          ...state.exerciseSets,
          [action.exerciseId]: action.sets
        }
      };
    
    case 'ADD_SET':
      const currentSets = state.exerciseSets[action.exerciseId] || [];
      return {
        ...state,
        exerciseSets: {
          ...state.exerciseSets,
          [action.exerciseId]: [...currentSets, action.set]
        }
      };
    
    case 'UPDATE_SET':
      const updatedSets = state.exerciseSets[action.exerciseId].map(set =>
        set.id === action.setId ? { ...set, ...action.updates } : set
      );
      return {
        ...state,
        exerciseSets: {
          ...state.exerciseSets,
          [action.exerciseId]: updatedSets
        }
      };
    
    case 'DELETE_SET':
      const filteredSets = state.exerciseSets[action.exerciseId].filter(
        set => set.id !== action.setId
      );
      return {
        ...state,
        exerciseSets: {
          ...state.exerciseSets,
          [action.exerciseId]: filteredSets
        }
      };
    
    case 'START_TIMER':
      return {
        ...state,
        timer: {
          isRunning: true,
          startTime: Date.now(),
          duration: 0
        }
      };
    
    case 'UPDATE_TIMER':
      return {
        ...state,
        timer: {
          ...state.timer,
          duration: action.duration
        }
      };
    
    case 'STOP_TIMER':
      return {
        ...state,
        timer: {
          isRunning: false,
          startTime: null,
          duration: state.timer.duration
        }
      };
    
    case 'RESET_TIMER':
      return {
        ...state,
        timer: {
          isRunning: false,
          startTime: null,
          duration: 0
        }
      };
    
    case 'SET_REST_TIMER':
      return {
        ...state,
        restTimer: {
          isActive: true,
          duration: action.duration,
          startTime: Date.now()
        }
      };
    
    case 'CLEAR_REST_TIMER':
      return {
        ...state,
        restTimer: {
          isActive: false,
          duration: 0,
          startTime: null
        }
      };
    
    case 'COMPLETE_WORKOUT':
      return {
        ...state,
        activeWorkout: null,
        workoutExercises: [],
        exerciseSets: {},
        timer: {
          isRunning: false,
          startTime: null,
          duration: 0
        }
      };
    
    default:
      return state;
  }
};

const initialState = {
  dbInitialized: false,
  activeWorkout: null,
  workoutExercises: [],
  exerciseSets: {},
  timer: {
    isRunning: false,
    startTime: null,
    duration: 0
  },
  restTimer: {
    isActive: false,
    duration: 0,
    startTime: null
  }
};

export const WorkoutProvider = ({ children }) => {
  const [state, dispatch] = useReducer(workoutReducer, initialState);
  const timerInterval = useRef(null);
  const restTimerInterval = useRef(null);

  // Initialize database on app start
  useEffect(() => {
    const initDB = async () => {
      const success = await DatabaseManager.initDatabase();
      dispatch({ type: 'INIT_DATABASE', payload: success });
      
      if (success) {
        // Check for active workout
        const activeWorkout = await DatabaseManager.getActiveWorkout();
        if (activeWorkout) {
          dispatch({ type: 'SET_ACTIVE_WORKOUT', payload: activeWorkout });
          loadWorkoutData(activeWorkout.id);
        }
      }
    };
    
    initDB();
  }, []);

  // Timer management
  useEffect(() => {
    if (state.timer.isRunning) {
      timerInterval.current = setInterval(() => {
        const duration = Math.floor((Date.now() - state.timer.startTime) / 1000);
        dispatch({ type: 'UPDATE_TIMER', duration });
      }, 1000);
    } else {
      clearInterval(timerInterval.current);
    }

    return () => clearInterval(timerInterval.current);
  }, [state.timer.isRunning, state.timer.startTime]);

  // Rest timer management
  useEffect(() => {
    if (state.restTimer.isActive) {
      restTimerInterval.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.restTimer.startTime) / 1000);
        if (elapsed >= state.restTimer.duration) {
          dispatch({ type: 'CLEAR_REST_TIMER' });
          // Could add notification/sound here
        }
      }, 1000);
    } else {
      clearInterval(restTimerInterval.current);
    }

    return () => clearInterval(restTimerInterval.current);
  }, [state.restTimer.isActive, state.restTimer.startTime]);

  const loadWorkoutData = async (workoutId) => {
    try {
      const exercises = await DatabaseManager.getWorkoutExercises(workoutId);
      dispatch({ type: 'SET_WORKOUT_EXERCISES', payload: exercises });

      // Load sets for each exercise
      for (const exercise of exercises) {
        const sets = await DatabaseManager.getSets(exercise.id);
        dispatch({
          type: 'UPDATE_EXERCISE_SETS',
          exerciseId: exercise.id,
          sets
        });
      }
    } catch (error) {
      console.error('Error loading workout data:', error);
    }
  };

  const startWorkout = async (name, templateId = null) => {
    try {
      const workoutId = await DatabaseManager.createWorkout(name, templateId);
      const workout = { id: workoutId, name, date: new Date(), is_completed: 0 };
      
      dispatch({ type: 'SET_ACTIVE_WORKOUT', payload: workout });
      dispatch({ type: 'START_TIMER' });
      
      return workoutId;
    } catch (error) {
      console.error('Error starting workout:', error);
      return null;
    }
  };

  const addExerciseToWorkout = async (exerciseId, exerciseName) => {
    if (!state.activeWorkout) return null;

    try {
      const orderIndex = state.workoutExercises.length;
      const workoutExerciseId = await DatabaseManager.addExerciseToWorkout(
        state.activeWorkout.id,
        exerciseId,
        orderIndex
      );

      const newExercise = {
        id: workoutExerciseId,
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        order_index: orderIndex
      };

      dispatch({ type: 'ADD_EXERCISE_TO_WORKOUT', payload: newExercise });
      return workoutExerciseId;
    } catch (error) {
      console.error('Error adding exercise to workout:', error);
      return null;
    }
  };

  const addSet = async (workoutExerciseId, weight, reps, isWarmup = false) => {
    try {
      const setNumber = (state.exerciseSets[workoutExerciseId]?.length || 0) + 1;
      const setId = await DatabaseManager.addSet(workoutExerciseId, setNumber, weight, reps, isWarmup);
      
      const newSet = {
        id: setId,
        set_number: setNumber,
        weight,
        reps,
        is_warmup: isWarmup,
        is_completed: true
      };

      dispatch({
        type: 'ADD_SET',
        exerciseId: workoutExerciseId,
        set: newSet
      });

      return setId;
    } catch (error) {
      console.error('Error adding set:', error);
      return null;
    }
  };

  const updateSet = async (workoutExerciseId, setId, weight, reps) => {
    try {
      await DatabaseManager.updateSet(setId, weight, reps);
      dispatch({
        type: 'UPDATE_SET',
        exerciseId: workoutExerciseId,
        setId,
        updates: { weight, reps }
      });
    } catch (error) {
      console.error('Error updating set:', error);
    }
  };

  const deleteSet = async (workoutExerciseId, setId) => {
    try {
      await DatabaseManager.deleteSet(setId);
      dispatch({
        type: 'DELETE_SET',
        exerciseId: workoutExerciseId,
        setId
      });
    } catch (error) {
      console.error('Error deleting set:', error);
    }
  };

  const completeWorkout = async () => {
    if (!state.activeWorkout) return;

    try {
      await DatabaseManager.completeWorkout(state.activeWorkout.id, state.timer.duration);
      dispatch({ type: 'COMPLETE_WORKOUT' });
    } catch (error) {
      console.error('Error completing workout:', error);
    }
  };

  const startRestTimer = (duration = 90) => {
    dispatch({ type: 'SET_REST_TIMER', duration });
  };

  const clearRestTimer = () => {
    dispatch({ type: 'CLEAR_REST_TIMER' });
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const value = {
    state,
    dispatch,
    startWorkout,
    addExerciseToWorkout,
    addSet,
    updateSet,
    deleteSet,
    completeWorkout,
    startRestTimer,
    clearRestTimer,
    formatTime,
    loadWorkoutData
  };

  return (
    <WorkoutContext.Provider value={value}>
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
};

export default WorkoutContext; 