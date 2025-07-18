import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  FlatList,
  SafeAreaView,
  Animated,
  Vibration
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useWorkout } from '../contexts/WorkoutContext';
import DatabaseManager from '../utils/database';

const WorkoutScreen = ({ navigation }) => {
  const {
    state,
    addExerciseToWorkout,
    addSet,
    updateSet,
    deleteSet,
    completeWorkout,
    startRestTimer,
    clearRestTimer,
    formatTime
  } = useWorkout();

  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [setInputs, setSetInputs] = useState({});
  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const fadeAnim = new Animated.Value(0);
  const [showWorkoutNotesModal, setShowWorkoutNotesModal] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [showPlateCalculator, setShowPlateCalculator] = useState(false);
  const [targetWeight, setTargetWeight] = useState('');
  const [exerciseInstructions, setExerciseInstructions] = useState({});
  const [previousWorkoutData, setPreviousWorkoutData] = useState({});

  useEffect(() => {
    if (!state.activeWorkout) {
      navigation.navigate('Home');
    }
  }, [state.activeWorkout]);

  useEffect(() => {
    if (state.restTimer.isActive) {
      setRestTimerVisible(true);
      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - state.restTimer.startTime) / 1000);
        const remaining = Math.max(0, state.restTimer.duration - elapsed);
        setRestTimeRemaining(remaining);
        
        if (remaining === 0) {
          setRestTimerVisible(false);
          Vibration.vibrate([500, 500, 500]);
        }
      };
      
      const interval = setInterval(updateTimer, 1000);
      updateTimer();
      
      return () => clearInterval(interval);
    } else {
      setRestTimerVisible(false);
    }
  }, [state.restTimer]);

  // Load previous workout data when exercise is expanded
  useEffect(() => {
    if (expandedExercise && state.activeWorkout?.exercises) {
      const exercise = state.activeWorkout.exercises.find(ex => ex.id === expandedExercise);
      if (exercise && !previousWorkoutData[exercise.exercise_id]) {
        loadPreviousWorkoutData(exercise.exercise_id);
      }
    }
  }, [expandedExercise, state.activeWorkout?.exercises]);

  const loadExercises = async () => {
    try {
      const allExercises = await DatabaseManager.getExercises();
      const allCategories = await DatabaseManager.getExerciseCategories();
      setExercises(allExercises);
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading exercises:', error);
    }
  };

  const filterExercises = () => {
    let filtered = exercises;
    
    if (selectedCategory) {
      filtered = filtered.filter(ex => ex.category_id === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(ex => 
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.muscle_groups.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const handleAddExercise = async (exercise) => {
    const workoutExerciseId = await addExerciseToWorkout(exercise.id, exercise.name);
    if (workoutExerciseId) {
      setShowExerciseModal(false);
      setSearchQuery('');
      setSelectedCategory(null);
    }
  };

  const handleAddSet = async (workoutExerciseId) => {
    const input = setInputs[workoutExerciseId];
    if (!input?.weight || !input?.reps) {
      Alert.alert('Error', 'Please enter weight and reps');
      return;
    }

    const weight = parseFloat(input.weight);
    const reps = parseInt(input.reps);
    
    if (isNaN(weight) || isNaN(reps) || weight <= 0 || reps <= 0) {
      Alert.alert('Error', 'Please enter valid weight and reps');
      return;
    }

    await addSet(workoutExerciseId, weight, reps, input.isWarmup);
    
    // Clear inputs
    setSetInputs(prev => ({
      ...prev,
      [workoutExerciseId]: { weight: '', reps: '', isWarmup: false }
    }));

    // Start rest timer if not warmup
    if (!input.isWarmup) {
      startRestTimer(90); // 90 seconds default
    }
  };

  const handleSetInputChange = (workoutExerciseId, field, value) => {
    setSetInputs(prev => ({
      ...prev,
      [workoutExerciseId]: {
        ...prev[workoutExerciseId],
        [field]: value
      }
    }));
  };

  const getSetInputValue = (workoutExerciseId, field) => {
    return setInputs[workoutExerciseId]?.[field] || '';
  };

  const handleCompleteWorkout = () => {
    Alert.alert(
      'Finish Workout',
      'Are you sure you want to finish this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            // Save workout notes if any
            if (workoutNotes.trim()) {
              await DatabaseManager.runAsync(
                'UPDATE workouts SET notes = ? WHERE id = ?',
                [workoutNotes, state.activeWorkout.id]
              );
            }
            await completeWorkout();
            navigation.navigate('Home');
          }
        }
      ]
    );
  };

  const calculatePlates = (targetWeight) => {
    const barWeight = 45; // Standard Olympic barbell
    const availablePlates = [45, 35, 25, 10, 5, 2.5];
    const weightPerSide = (targetWeight - barWeight) / 2;
    
    if (weightPerSide <= 0) {
      return [{ weight: 'Bar only', count: 1, total: barWeight }];
    }
    
    const plates = [];
    let remaining = weightPerSide;
    
    for (const plate of availablePlates) {
      if (remaining >= plate) {
        const count = Math.floor(remaining / plate);
        plates.push({ weight: plate, count, total: plate * count * 2 });
        remaining -= plate * count;
      }
    }
    
    return plates;
  };

  const loadPreviousWorkoutData = async (exerciseId) => {
    try {
      const lastWorkout = await DatabaseManager.getFirstAsync(`
        SELECT s.weight, s.reps, s.set_number, w.date
        FROM sets s
        JOIN workout_exercises we ON s.workout_exercise_id = we.id
        JOIN workouts w ON we.workout_id = w.id
        WHERE we.exercise_id = ? AND w.is_completed = 1 AND w.id != ?
        ORDER BY w.date DESC, s.set_number ASC
        LIMIT 1
      `, [exerciseId, state.activeWorkout.id]);
      
      if (lastWorkout) {
        setPreviousWorkoutData(prev => ({
          ...prev,
          [exerciseId]: lastWorkout
        }));
      }
    } catch (error) {
      console.error('Error loading previous workout data:', error);
    }
  };

  const getSetPerformanceIndicator = (currentSet, exerciseId) => {
    const previousData = previousWorkoutData[exerciseId];
    if (!previousData) return null;
    
    const currentVolume = currentSet.weight * currentSet.reps;
    const previousVolume = previousData.weight * previousData.reps;
    
    if (currentVolume > previousVolume) return 'PR'; // Personal Record
    if (currentSet.weight > previousData.weight) return 'HW'; // Heavier Weight
    if (currentSet.reps > previousData.reps) return 'MR'; // More Reps
    return null;
  };

  const renderWorkoutHeader = () => {
    const totalSets = Object.values(state.exerciseSets).flat().length;
    const totalVolume = Object.values(state.exerciseSets).flat()
      .reduce((sum, set) => sum + (set.weight * set.reps), 0);

    return (
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.workoutTitle}>{state.activeWorkout?.name}</Text>
            <Text style={styles.workoutTimer}>{formatTime(state.timer.duration)}</Text>
          </View>
          
          <TouchableOpacity onPress={handleCompleteWorkout}>
            <Text style={styles.finishText}>Finish</Text>
          </TouchableOpacity>
        </View>

        {/* Workout Stats */}
        <View style={styles.workoutStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{state.workoutExercises.length}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalSets}</Text>
            <Text style={styles.statLabel}>Sets</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{Math.round(totalVolume)}</Text>
            <Text style={styles.statLabel}>Volume (lbs)</Text>
          </View>
          <TouchableOpacity 
            style={styles.notesButton}
            onPress={() => setShowWorkoutNotesModal(true)}
          >
            <Icon name="note-add" size={16} color="#007AFF" />
            <Text style={styles.notesButtonText}>Notes</Text>
          </TouchableOpacity>
        </View>

        {restTimerVisible && (
          <View style={styles.restTimer}>
            <Text style={styles.restTimerLabel}>Rest</Text>
            <Text style={styles.restTimerTime}>{formatTime(restTimeRemaining)}</Text>
            <TouchableOpacity onPress={clearRestTimer}>
              <Icon name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderSetRow = (set, exerciseId, setIndex) => {
    const performanceIndicator = getSetPerformanceIndicator(set, exerciseId);
    const previousData = previousWorkoutData[exerciseId];

    return (
      <View key={set.id} style={styles.setRow}>
        <View style={styles.setNumber}>
          <Text style={[styles.setNumberText, set.is_warmup && styles.warmupText]}>
            {set.is_warmup ? 'W' : set.set_number}
          </Text>
          {performanceIndicator && (
            <View style={[
              styles.performanceBadge,
              performanceIndicator === 'PR' && styles.prBadge
            ]}>
              <Text style={styles.performanceBadgeText}>{performanceIndicator}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.setData}>
          <View style={styles.setDataRow}>
            <Text style={styles.setWeight}>{set.weight} lbs</Text>
            <Text style={styles.setReps}>{set.reps} reps</Text>
            <TouchableOpacity
              style={styles.plateCalcButton}
              onPress={() => {
                setTargetWeight(set.weight.toString());
                setShowPlateCalculator(true);
              }}
            >
              <Icon name="calculate" size={14} color="#666" />
            </TouchableOpacity>
          </View>
          {previousData && (
            <Text style={styles.previousSetData}>
              Last: {previousData.weight} lbs × {previousData.reps}
            </Text>
          )}
        </View>
        
        <View style={styles.setActions}>
          <TouchableOpacity
            style={styles.setActionButton}
            onPress={() => {
              // Pre-fill for next set
              handleSetInputChange(exerciseId, 'weight', set.weight.toString());
              handleSetInputChange(exerciseId, 'reps', set.reps.toString());
            }}
          >
            <Icon name="content-copy" size={16} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.setActionButton}
            onPress={() => deleteSet(exerciseId, set.id)}
          >
            <Icon name="delete" size={16} color="#ff4757" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderExercise = ({ item: exercise }) => {
    const sets = state.exerciseSets[exercise.id] || [];
    const isExpanded = expandedExercise === exercise.id;

    return (
      <View style={styles.exerciseCard}>
        <TouchableOpacity
          style={styles.exerciseHeader}
          onPress={() => setExpandedExercise(isExpanded ? null : exercise.id)}
        >
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
            <Text style={styles.exerciseMuscles}>{exercise.muscle_groups}</Text>
          </View>
          
          <View style={styles.exerciseStats}>
            <Text style={styles.exerciseSetCount}>{sets.length} sets</Text>
            <Icon 
              name={isExpanded ? "expand-less" : "expand-more"} 
              size={24} 
              color="#666" 
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.exerciseContent}>
            {/* Previous Sets */}
            {sets.map((set, index) => renderSetRow(set, exercise.id, index))}

            {/* Add New Set */}
            <View style={styles.newSetRow}>
              <View style={styles.setNumber}>
                <Text style={styles.setNumberText}>{sets.length + 1}</Text>
              </View>
              
              <View style={styles.newSetInputs}>
                <TextInput
                  style={styles.setInput}
                  placeholder="Weight"
                  value={getSetInputValue(exercise.id, 'weight')}
                  onChangeText={(value) => handleSetInputChange(exercise.id, 'weight', value)}
                  keyboardType="numeric"
                />
                
                <TextInput
                  style={styles.setInput}
                  placeholder="Reps"
                  value={getSetInputValue(exercise.id, 'reps')}
                  onChangeText={(value) => handleSetInputChange(exercise.id, 'reps', value)}
                  keyboardType="numeric"
                />
                
                <TouchableOpacity
                  style={[
                    styles.warmupButton,
                    getSetInputValue(exercise.id, 'isWarmup') && styles.warmupButtonActive
                  ]}
                  onPress={() => 
                    handleSetInputChange(
                      exercise.id, 
                      'isWarmup', 
                      !getSetInputValue(exercise.id, 'isWarmup')
                    )
                  }
                >
                  <Text style={[
                    styles.warmupButtonText,
                    getSetInputValue(exercise.id, 'isWarmup') && styles.warmupButtonTextActive
                  ]}>
                    W
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.addSetButton}
                onPress={() => handleAddSet(exercise.id)}
              >
                <Icon name="add" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderExerciseModal = () => (
    <Modal
      visible={showExerciseModal}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowExerciseModal(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add Exercise</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryChip, selectedCategory === category.id && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category.id && styles.categoryChipTextActive
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          data={filterExercises()}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.exerciseListItem}
              onPress={() => handleAddExercise(item)}
            >
              <View style={styles.exerciseListInfo}>
                <Text style={styles.exerciseListName}>{item.name}</Text>
                <Text style={styles.exerciseListMuscles}>{item.muscle_groups}</Text>
                {item.equipment && (
                  <Text style={styles.exerciseListEquipment}>{item.equipment}</Text>
                )}
              </View>
              <Icon name="add" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
          style={styles.exerciseList}
        />
      </SafeAreaView>
    </Modal>
  );



  if (!state.activeWorkout) {
    return (
      <View style={styles.noWorkoutContainer}>
        <Text style={styles.noWorkoutText}>No active workout</Text>
        <TouchableOpacity
          style={styles.startWorkoutButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.startWorkoutButtonText}>Start a Workout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderWorkoutHeader()}
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {state.workoutExercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="fitness-center" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No exercises yet</Text>
            <Text style={styles.emptyStateText}>
              Add your first exercise to get started
            </Text>
          </View>
        ) : (
          <FlatList
            data={state.workoutExercises}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderExercise}
            scrollEnabled={false}
            contentContainerStyle={styles.exercisesList}
          />
        )}
        
        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => {
            loadExercises();
            setShowExerciseModal(true);
          }}
        >
          <Icon name="add" size={24} color="#007AFF" />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      {renderExerciseModal()}
      {/* Workout Notes Modal - temporarily disabled */}
      {/* Plate Calculator Modal - temporarily disabled */}
    </SafeAreaView>
  );

  const renderWorkoutNotesModal = () => (
    <Modal
      visible={showWorkoutNotesModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowWorkoutNotesModal(false)}>
            <Text style={styles.modalCancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Workout Notes</Text>
          <TouchableOpacity onPress={() => setShowWorkoutNotesModal(false)}>
            <Text style={styles.modalSaveButton}>Done</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalContent}>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes about your workout..."
            value={workoutNotes}
            onChangeText={setWorkoutNotes}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
          />
        </View>
      </View>
    </Modal>
  );

  const renderPlateCalculatorModal = () => {
    const plates = targetWeight ? calculatePlates(parseFloat(targetWeight) || 0) : [];
    
    return (
      <Modal
        visible={showPlateCalculator}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPlateCalculator(false)}>
              <Text style={styles.modalCancelButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Plate Calculator</Text>
            <View style={styles.modalRightSpace} />
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.plateInputContainer}>
              <Text style={styles.plateInputLabel}>Target Weight:</Text>
              <TextInput
                style={styles.plateInput}
                value={targetWeight}
                onChangeText={setTargetWeight}
                placeholder="Enter weight"
                keyboardType="numeric"
              />
              <Text style={styles.plateInputUnit}>lbs</Text>
            </View>
            
            <View style={styles.plateBreakdown}>
              <Text style={styles.plateBreakdownTitle}>Plate Breakdown:</Text>
              {plates.map((plate, index) => (
                <View key={index} style={styles.plateRow}>
                  <Text style={styles.plateWeight}>{plate.weight} lbs</Text>
                  <Text style={styles.plateCount}>× {plate.count} each side</Text>
                  <Text style={styles.plateTotal}>{plate.total} lbs total</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    );
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  workoutTimer: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  finishText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  restTimer: {
    backgroundColor: '#ff6b6b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  restTimerLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  restTimerTime: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  exercisesList: {
    padding: 16,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  exerciseMuscles: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  exerciseStats: {
    alignItems: 'flex-end',
  },
  exerciseSetCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  exerciseContent: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 16,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  newSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  setNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  setNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  warmupText: {
    color: '#ff6b6b',
  },
  setData: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  setWeight: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  setReps: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  setActions: {
    flexDirection: 'row',
    gap: 8,
  },
  setActionButton: {
    padding: 8,
  },
  newSetInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  setInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  warmupButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warmupButtonActive: {
    backgroundColor: '#ff6b6b',
  },
  warmupButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  warmupButtonTextActive: {
    color: '#fff',
  },
  addSetButton: {
    padding: 8,
    marginLeft: 8,
  },
  addExerciseButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    gap: 8,
  },
  addExerciseText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  exerciseList: {
    flex: 1,
  },
  exerciseListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  exerciseListInfo: {
    flex: 1,
  },
  exerciseListName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  exerciseListMuscles: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  exerciseListEquipment: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  noWorkoutContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  noWorkoutText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 20,
  },
  startWorkoutButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startWorkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for enhanced features
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  notesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  notesButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  performanceBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff9500',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  prBadge: {
    backgroundColor: '#ff3b30',
  },
  performanceBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  setDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plateCalcButton: {
    marginLeft: 8,
    padding: 4,
  },
  previousSetData: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCancelButton: {
    fontSize: 16,
    color: '#666',
  },
  modalSaveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalRightSpace: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 200,
  },
  plateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  plateInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
  },
  plateInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    textAlign: 'center',
  },
  plateInputUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  plateBreakdown: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    padding: 16,
  },
  plateBreakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  plateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  plateWeight: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  plateCount: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'center',
  },
  plateTotal: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
});

export default WorkoutScreen;
