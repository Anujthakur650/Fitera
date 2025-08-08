import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  Animated
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { useWorkout } from '../contexts/WorkoutContext';
import { useAuth } from '../contexts/FirebaseAuthContext';
import database from '../utils/firebaseDatabase';
import THEME from '../constants/theme';
import { getRelativeTime, formatDateShort } from '../utils/dateFormatter';
import { parseSQLiteDate } from '../utils/dateFormatter';

const WorkoutHistoryScreen = ({ navigation }) => {
  const { state } = useWorkout();
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, week, month, year
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [workoutDetails, setWorkoutDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedWorkouts, setSelectedWorkouts] = useState(new Set());

  useEffect(() => {
    if (state.dbInitialized && user) {
      // Run migration to fix workout names before loading
      fixWorkoutNames().then(() => {
        loadWorkouts();
      });
    }
  }, [state.dbInitialized, user, selectedFilter]);

  const fixWorkoutNames = async () => {
    try {
      await database.migrateWorkoutNaming(user.id);
    } catch (error) {
      console.error('Error fixing workout names:', error);
    }
  };

  const loadWorkouts = async () => {
    if (!user || !user.id) {
      console.log('No authenticated user, skipping workout history load');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const userId = user.id;
      
      const allWorkouts = await database.getWorkoutHistory(userId, 1000);
      
      // Apply filter based on selected time period
      let filteredWorkouts = allWorkouts;
      const now = new Date();
      now.setHours(23, 59, 59, 999); // End of today
      
      switch (selectedFilter) {
        case 'week':
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          weekAgo.setHours(0, 0, 0, 0);
          filteredWorkouts = allWorkouts.filter(w => {
            const workoutDate = parseSQLiteDate(w.date);
            return workoutDate >= weekAgo && workoutDate <= now;
          });
          break;
        case 'month':
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          monthAgo.setHours(0, 0, 0, 0);
          filteredWorkouts = allWorkouts.filter(w => {
            const workoutDate = parseSQLiteDate(w.date);
            return workoutDate >= monthAgo && workoutDate <= now;
          });
          break;
        case 'year':
          const yearAgo = new Date(now);
          yearAgo.setFullYear(now.getFullYear() - 1);
          yearAgo.setHours(0, 0, 0, 0);
          filteredWorkouts = allWorkouts.filter(w => {
            const workoutDate = parseSQLiteDate(w.date);
            return workoutDate >= yearAgo && workoutDate <= now;
          });
          break;
        default:
          // 'all' - show all workouts
          break;
      }
      
      // Sort workouts by date (newest first) to ensure consistent ordering
      const sortedWorkouts = filteredWorkouts.sort((a, b) => {
        return parseSQLiteDate(b.date) - parseSQLiteDate(a.date);
      });
      
      console.log(`WorkoutHistory - Loaded ${allWorkouts.length} total workouts, showing ${sortedWorkouts.length} for filter: ${selectedFilter}`);
      
      // Debug: Log workout details including exercise and set counts
      if (__DEV__) {
        console.log('WorkoutHistory - Workout details:');
        sortedWorkouts.slice(0, 10).forEach(w => {
          console.log(`- ${w.name}: ${w.date} (${formatDate(w.date)}) - Exercises: ${w.exercise_count}, Sets: ${w.set_count}`);
        });
      }
      
      setWorkouts(sortedWorkouts);
    } catch (error) {
      console.error('Error loading workouts:', error);
      Alert.alert('Error', 'Failed to load workout history');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  };

  // Use the consistent date formatting from dateFormatter utils
  const formatDate = (dateString) => {
    return getRelativeTime(dateString);
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const loadWorkoutDetails = async (workout) => {
    setDetailsLoading(true);
    try {
      // Get all exercises for this workout
      const exercisesWithSets = await database.getWorkoutDetails(workout.id);

      // Calculate workout statistics
      let totalSets = 0;
      let totalVolume = 0;
      let completedSets = 0;
      let maxWeight = 0;

      exercisesWithSets.forEach(exercise => {
        exercise.sets.forEach(set => {
          totalSets++;
          if (set.is_completed) {
            completedSets++;
            const volume = (set.weight || 0) * (set.reps || 0);
            totalVolume += volume;
            if (set.weight > maxWeight) {
              maxWeight = set.weight;
            }
          }
        });
      });

      setWorkoutDetails({
        ...workout,
        exercises: exercisesWithSets,
        stats: {
          totalExercises: exercisesWithSets.length,
          totalSets,
          completedSets,
          totalVolume: Math.round(totalVolume),
          maxWeight,
          completionRate: totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0
        }
      });
    } catch (error) {
      console.error('Error loading workout details:', error);
      Alert.alert('Error', 'Failed to load workout details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleWorkoutPress = async (workout) => {
    if (isEditMode) {
      // In edit mode, toggle selection
      const newSelected = new Set(selectedWorkouts);
      if (newSelected.has(workout.id)) {
        newSelected.delete(workout.id);
      } else {
        newSelected.add(workout.id);
      }
      setSelectedWorkouts(newSelected);
    } else {
      // Normal mode, show details
      setSelectedWorkout(workout);
      setShowDetailsModal(true);
      await loadWorkoutDetails(workout);
    }
  };

  const deleteWorkout = async (workoutId) => {
    try {
      await database.deleteWorkout(workoutId, user.id);
      await loadWorkouts();
      Alert.alert('Success', 'Workout deleted successfully');
    } catch (error) {
      console.error('Error deleting workout:', error);
      Alert.alert('Error', 'Failed to delete workout');
    }
  };

  const deleteSelectedWorkouts = async () => {
    Alert.alert(
      'Delete Selected Workouts',
      `Are you sure you want to delete ${selectedWorkouts.size} workout${selectedWorkouts.size > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteSelectedWorkouts(Array.from(selectedWorkouts), user.id);
              setSelectedWorkouts(new Set());
              setIsEditMode(false);
              await loadWorkouts();
              Alert.alert('Success', 'Selected workouts deleted successfully');
            } catch (error) {
              console.error('Error deleting workouts:', error);
              Alert.alert('Error', 'Failed to delete some workouts');
            }
          }
        }
      ]
    );
  };

  const deleteAllWorkouts = async () => {
    Alert.alert(
      'Delete All Workouts',
      'Are you sure you want to delete ALL your workout history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteAllWorkouts(user.id);
              setIsEditMode(false);
              await loadWorkouts();
              Alert.alert('Success', 'All workouts deleted successfully');
            } catch (error) {
              console.error('Error deleting all workouts:', error);
              Alert.alert('Error', 'Failed to delete workouts');
            }
          }
        }
      ]
    );
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setSelectedWorkouts(new Set());
  };

  const renderFilterButton = (filter, label) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderRightActions = (progress, dragX, item) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          Alert.alert(
            'Delete Workout',
            'Are you sure you want to delete this workout?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Delete', 
                style: 'destructive',
                onPress: () => deleteWorkout(item.id)
              }
            ]
          );
        }}
      >
        <Animated.View
          style={[
            styles.deleteActionContent,
            {
              transform: [{ translateX: trans }],
            },
          ]}
        >
          <MaterialIcons name="delete" size={24} color={THEME.colors.white} />
          <Text style={styles.deleteActionText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderWorkoutItem = ({ item }) => {
    const isSelected = selectedWorkouts.has(item.id);
    
    const workoutContent = (
      <TouchableOpacity 
        style={[
          styles.workoutCard,
          isEditMode && isSelected && styles.workoutCardSelected
        ]}
        onPress={() => handleWorkoutPress(item)}
      >
        <View style={styles.workoutHeader}>
          {isEditMode && (
            <View style={[
              styles.checkbox,
              isSelected && styles.checkboxSelected
            ]}>
              {isSelected && (
                <MaterialIcons name="check" size={16} color={THEME.colors.white} />
              )}
            </View>
          )}
          <View style={styles.workoutHeaderLeft}>
            <Text style={styles.workoutName}>{item.name || 'Unnamed Workout'}</Text>
            <Text style={styles.workoutDate}>{formatDate(item.date)}</Text>
          </View>
          {!isEditMode && (
            <MaterialIcons name="chevron-right" size={24} color={THEME.colors.gray500} />
          )}
        </View>
        
        <View style={styles.workoutStats}>
          <View style={styles.statItem}>
            <MaterialIcons name="timer" size={16} color={THEME.colors.primary} />
            <Text style={styles.statText}>{formatDuration(item.duration || 0)}</Text>
          </View>
          {item.exercise_count > 0 && (
            <View style={styles.statItem}>
              <MaterialIcons name="fitness-center" size={16} color={THEME.colors.primary} />
              <Text style={styles.statText}>{item.exercise_count} exercises</Text>
            </View>
          )}
          {item.set_count > 0 && (
            <View style={styles.statItem}>
              <MaterialIcons name="format-list-numbered" size={16} color={THEME.colors.primary} />
              <Text style={styles.statText}>{item.set_count} sets</Text>
            </View>
          )}
          {item.total_volume > 0 && (
            <View style={styles.statItem}>
              <MaterialIcons name="trending-up" size={16} color={THEME.colors.primary} />
              <Text style={styles.statText}>{Math.round(item.total_volume).toLocaleString()} lbs</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );

    if (isEditMode) {
      return workoutContent;
    }

    return (
      <Swipeable
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
        rightThreshold={40}
      >
        {workoutContent}
      </Swipeable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="fitness-center" size={64} color={THEME.colors.gray400} />
      <Text style={styles.emptyStateTitle}>No Workouts Found</Text>
      <Text style={styles.emptyStateText}>
        {selectedFilter === 'all' 
          ? "You haven't completed any workouts yet"
          : `No workouts in the selected time period`}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {isEditMode ? (
        <TouchableOpacity 
          style={styles.backButton}
          onPress={toggleEditMode}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={THEME.colors.white} />
        </TouchableOpacity>
      )}
      
      <Text style={styles.headerTitle}>
        {isEditMode ? `${selectedWorkouts.size} Selected` : 'Workout History'}
      </Text>
      
      {isEditMode ? (
        <TouchableOpacity 
          style={styles.editButton}
          onPress={selectedWorkouts.size > 0 ? deleteSelectedWorkouts : deleteAllWorkouts}
        >
          <Text style={styles.deleteText}>
            {selectedWorkouts.size > 0 ? 'Delete' : 'Delete All'}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={styles.editButton}
          onPress={toggleEditMode}
          disabled={workouts.length === 0}
        >
          {workouts.length > 0 && (
            <Text style={styles.editText}>Edit</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filterContainer}>
      {renderFilterButton('all', 'All Time')}
      {renderFilterButton('week', 'This Week')}
      {renderFilterButton('month', 'This Month')}
      {renderFilterButton('year', 'This Year')}
    </View>
  );

  const renderWorkoutDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        setShowDetailsModal(false);
        setWorkoutDetails(null);
      }}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => {
              setShowDetailsModal(false);
              setWorkoutDetails(null);
            }}
            style={styles.modalCloseButton}
          >
            <MaterialIcons name="close" size={24} color={THEME.colors.gray700} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Workout Details</Text>
          <View style={styles.modalHeaderRight} />
        </View>

        {detailsLoading ? (
          <View style={styles.modalLoadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Loading workout details...</Text>
          </View>
        ) : workoutDetails ? (
          <ScrollView 
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Workout Header Info */}
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsWorkoutName}>{workoutDetails.name}</Text>
              <Text style={styles.detailsDate}>
                {formatDateShort(workoutDetails.date)} • {getRelativeTime(workoutDetails.date)}
              </Text>
            </View>

            {/* Workout Stats Summary */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <MaterialIcons name="timer" size={20} color={THEME.colors.primary} />
                <Text style={styles.statValue}>{formatDuration(workoutDetails.duration || 0)}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              <View style={styles.statBox}>
                <MaterialIcons name="fitness-center" size={20} color={THEME.colors.primary} />
                <Text style={styles.statValue}>{workoutDetails.stats.totalExercises}</Text>
                <Text style={styles.statLabel}>Exercises</Text>
              </View>
              <View style={styles.statBox}>
                <MaterialIcons name="format-list-numbered" size={20} color={THEME.colors.primary} />
                <Text style={styles.statValue}>{workoutDetails.stats.completedSets}/{workoutDetails.stats.totalSets}</Text>
                <Text style={styles.statLabel}>Sets</Text>
              </View>
              <View style={styles.statBox}>
                <MaterialIcons name="trending-up" size={20} color={THEME.colors.primary} />
                <Text style={styles.statValue}>{workoutDetails.stats.totalVolume.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Volume (lbs)</Text>
              </View>
            </View>

            {/* Additional Stats */}
            <View style={styles.additionalStats}>
              <View style={styles.additionalStatRow}>
                <Text style={styles.additionalStatLabel}>Max Weight</Text>
                <Text style={styles.additionalStatValue}>{workoutDetails.stats.maxWeight} lbs</Text>
              </View>
              <View style={styles.additionalStatRow}>
                <Text style={styles.additionalStatLabel}>Completion Rate</Text>
                <Text style={styles.additionalStatValue}>{workoutDetails.stats.completionRate}%</Text>
              </View>
            </View>

            {/* Exercises List */}
            <View style={styles.exercisesSection}>
              <Text style={styles.sectionTitle}>Exercises</Text>
              {workoutDetails.exercises.map((exercise, index) => (
                <View key={exercise.workout_exercise_id} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
                      <Text style={styles.exerciseMuscles}>{exercise.muscle_groups}</Text>
                    </View>
                    <Text style={styles.exerciseCategory}>{exercise.category_name}</Text>
                  </View>

                  {exercise.exercise_notes && (
                    <Text style={styles.exerciseNotes}>{exercise.exercise_notes}</Text>
                  )}

                  {/* Sets Table */}
                  <View style={styles.setsTable}>
                    <View style={styles.setsTableHeader}>
                      <Text style={[styles.setHeaderText, styles.setNumberColumn]}>Set</Text>
                      <Text style={[styles.setHeaderText, styles.weightColumn]}>Weight</Text>
                      <Text style={[styles.setHeaderText, styles.repsColumn]}>Reps</Text>
                      <Text style={[styles.setHeaderText, styles.volumeColumn]}>Volume</Text>
                    </View>
                    {exercise.sets.map((set) => (
                      <View 
                        key={set.id} 
                        style={[
                          styles.setRow,
                          !set.is_completed && styles.incompleteSetRow
                        ]}
                      >
                        <Text style={[styles.setCellText, styles.setNumberColumn]}>
                          {set.is_warmup ? 'W' : set.set_number}
                        </Text>
                        <Text style={[styles.setCellText, styles.weightColumn]}>
                          {set.weight || '-'} lbs
                        </Text>
                        <Text style={[styles.setCellText, styles.repsColumn]}>
                          {set.reps || '-'}
                        </Text>
                        <Text style={[styles.setCellText, styles.volumeColumn]}>
                          {set.is_completed ? ((set.weight || 0) * (set.reps || 0)).toLocaleString() : '-'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {/* Workout Notes */}
            {workoutDetails.notes && (
              <View style={styles.notesSection}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={styles.notesText}>{workoutDetails.notes}</Text>
              </View>
            )}

            <View style={styles.modalFooterSpace} />
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primary} />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading workout history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primary} />
      {renderHeader()}
      {renderFilters()}
      
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderWorkoutItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          workouts.length === 0 && styles.emptyListContent
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      {renderWorkoutDetailsModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.gray100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    paddingTop: THEME.spacing.xl,
  },
  backButton: {
    padding: THEME.spacing.xs,
  },
  headerTitle: {
    fontSize: THEME.typography.fontSize.xl,
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.white,
  },
  headerRight: {
    width: 32, // To balance the header
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.gray200,
  },
  filterButton: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    marginRight: THEME.spacing.sm,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.gray100,
  },
  filterButtonActive: {
    backgroundColor: THEME.colors.primary,
  },
  filterButtonText: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: THEME.typography.fontWeight.medium,
    color: THEME.colors.gray700,
  },
  filterButtonTextActive: {
    color: THEME.colors.white,
  },
  listContent: {
    padding: THEME.spacing.lg,
  },
  emptyListContent: {
    flex: 1,
  },
  workoutCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  workoutHeaderLeft: {
    flex: 1,
  },
  workoutName: {
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: THEME.typography.fontWeight.semibold,
    color: THEME.colors.gray900,
    marginBottom: THEME.spacing.xs,
  },
  workoutDate: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.gray600,
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
    marginBottom: THEME.spacing.xs,
  },
  statText: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.gray700,
    fontWeight: THEME.typography.fontWeight.medium,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing['2xl'],
  },
  emptyStateTitle: {
    fontSize: THEME.typography.fontSize.xl,
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.gray900,
    marginTop: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
  },
  emptyStateText: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.gray600,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: THEME.spacing.md,
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.gray600,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: THEME.colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.gray200,
  },
  modalCloseButton: {
    padding: THEME.spacing.xs,
  },
  modalTitle: {
    fontSize: THEME.typography.fontSize.xl,
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.gray900,
  },
  modalHeaderRight: {
    width: 32,
  },
  modalLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
  },
  detailsHeader: {
    padding: THEME.spacing.lg,
    paddingBottom: THEME.spacing.md,
  },
  detailsWorkoutName: {
    fontSize: THEME.typography.fontSize['2xl'],
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.gray900,
    marginBottom: THEME.spacing.xs,
  },
  detailsDate: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.gray600,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
    backgroundColor: THEME.colors.gray50,
    marginHorizontal: THEME.spacing.xs,
    borderRadius: THEME.radius.lg,
  },
  statValue: {
    fontSize: THEME.typography.fontSize.xl,
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.gray900,
    marginTop: THEME.spacing.xs,
  },
  statLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.gray600,
    marginTop: THEME.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  additionalStats: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },
  additionalStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.gray200,
  },
  additionalStatLabel: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.gray700,
  },
  additionalStatValue: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: THEME.typography.fontWeight.semibold,
    color: THEME.colors.gray900,
  },
  exercisesSection: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
  },
  sectionTitle: {
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.gray900,
    marginBottom: THEME.spacing.md,
  },
  exerciseCard: {
    backgroundColor: THEME.colors.gray50,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.md,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: THEME.typography.fontWeight.semibold,
    color: THEME.colors.gray900,
    marginBottom: THEME.spacing.xs,
  },
  exerciseMuscles: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.gray600,
  },
  exerciseCategory: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.primary,
    fontWeight: THEME.typography.fontWeight.medium,
  },
  exerciseNotes: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.gray700,
    fontStyle: 'italic',
    marginBottom: THEME.spacing.md,
  },
  setsTable: {
    borderRadius: THEME.radius.md,
    overflow: 'hidden',
  },
  setsTableHeader: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.gray200,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
  },
  setHeaderText: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: THEME.typography.fontWeight.semibold,
    color: THEME.colors.gray700,
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.gray100,
  },
  incompleteSetRow: {
    opacity: 0.5,
  },
  setCellText: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.gray900,
  },
  setNumberColumn: {
    width: 50,
  },
  weightColumn: {
    flex: 1,
  },
  repsColumn: {
    flex: 1,
  },
  volumeColumn: {
    flex: 1,
    textAlign: 'right',
  },
  notesSection: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
  },
  notesText: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.gray700,
    lineHeight: 22,
  },
  modalFooterSpace: {
    height: THEME.spacing['2xl'],
  },
  // Edit mode styles
  editButton: {
    padding: THEME.spacing.xs,
  },
  editText: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.white,
    fontWeight: THEME.typography.fontWeight.medium,
  },
  cancelText: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.white,
    fontWeight: THEME.typography.fontWeight.medium,
  },
  deleteText: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.white,
    fontWeight: THEME.typography.fontWeight.semibold,
  },
  workoutCardSelected: {
    borderWidth: 2,
    borderColor: THEME.colors.primary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.colors.gray400,
    marginRight: THEME.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  // Swipe action styles
  deleteAction: {
    backgroundColor: THEME.colors.error || '#dc3545',
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 100,
    marginBottom: THEME.spacing.md,
    borderRadius: THEME.radius.lg,
    marginLeft: THEME.spacing.sm,
  },
  deleteActionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: THEME.spacing.lg,
  },
  deleteActionText: {
    color: THEME.colors.white,
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: THEME.typography.fontWeight.medium,
    marginTop: THEME.spacing.xs,
  },
});

export default WorkoutHistoryScreen;
