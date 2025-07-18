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
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useWorkout } from '../contexts/WorkoutContext';
import DatabaseManager from '../utils/database';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { state, startWorkout, formatTime, completeWorkout } = useWorkout();
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [workoutTemplates, setWorkoutTemplates] = useState([]);
  const [showNewWorkoutModal, setShowNewWorkoutModal] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    thisWeekWorkouts: 0,
    totalVolume: 0,
    favoriteExercise: 'None'
  });

  useEffect(() => {
    loadDashboardData();
  }, [state.dbInitialized]);

  const loadDashboardData = async () => {
    if (!state.dbInitialized) return;

    try {
      // Load recent workouts
      const recent = await DatabaseManager.getWorkoutHistory(5);
      setRecentWorkouts(recent);

      // Load workout templates
      const templates = await DatabaseManager.getWorkoutTemplates();
      setWorkoutTemplates(templates);

      // Calculate stats
      const allWorkouts = await DatabaseManager.getWorkoutHistory(1000);
      const thisWeek = getThisWeekWorkouts(allWorkouts);
      
      setStats({
        totalWorkouts: allWorkouts.length,
        thisWeekWorkouts: thisWeek.length,
        totalVolume: calculateTotalVolume(allWorkouts),
        favoriteExercise: await getFavoriteExercise()
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const getThisWeekWorkouts = (workouts) => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return workouts.filter(workout => new Date(workout.date) >= oneWeekAgo);
  };

  const calculateTotalVolume = async (workouts) => {
    let totalVolume = 0;
    // This would need to be calculated from sets data
    // For now, return a placeholder
    return totalVolume;
  };

  const getFavoriteExercise = async () => {
    // This would query the most frequently used exercise
    return 'Bench Press';
  };

  const handleStartWorkout = async (templateId = null) => {
    const name = workoutName || `Workout ${new Date().toLocaleDateString()}`;
    const workoutId = await startWorkout(name, templateId);
    
    if (workoutId) {
      setShowNewWorkoutModal(false);
      setWorkoutName('');
      navigation.navigate('Workout');
    } else {
      Alert.alert('Error', 'Failed to start workout');
    }
  };

  const handleQuickStart = () => {
    setWorkoutName(`Quick Workout ${new Date().toLocaleDateString()}`);
    handleStartWorkout();
  };

  const renderActiveWorkout = () => {
    if (!state.activeWorkout) return null;

    return (
      <View style={styles.activeWorkoutCard}>
        <View style={styles.activeWorkoutHeader}>
          <Text style={styles.activeWorkoutTitle}>Active Workout</Text>
          <Text style={styles.activeWorkoutTime}>
            {formatTime(state.timer.duration)}
          </Text>
        </View>
        
        <Text style={styles.activeWorkoutName}>{state.activeWorkout.name}</Text>
        
        <View style={styles.activeWorkoutStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{state.workoutExercises.length}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {Object.values(state.exerciseSets).flat().length}
            </Text>
            <Text style={styles.statLabel}>Sets</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {Object.values(state.exerciseSets).flat().reduce((total, set) => 
                total + (set.weight * set.reps), 0
              ).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Volume</Text>
          </View>
        </View>

        <View style={styles.activeWorkoutButtons}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate('Workout')}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.finishButton}
            onPress={() => {
              Alert.alert(
                'Finish Workout',
                'Are you sure you want to finish this workout?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Finish', onPress: completeWorkout }
                ]
              );
            }}
          >
            <Text style={styles.finishButtonText}>Finish</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Quick Start</Text>
      
      <TouchableOpacity
        style={styles.quickStartButton}
        onPress={handleQuickStart}
        disabled={!!state.activeWorkout}
      >
        <Icon name="play-arrow" size={24} color="#fff" />
        <Text style={styles.quickStartText}>Start Empty Workout</Text>
      </TouchableOpacity>

      {workoutTemplates.length > 0 && (
        <TouchableOpacity
          style={styles.templateButton}
          onPress={() => setShowNewWorkoutModal(true)}
          disabled={!!state.activeWorkout}
        >
          <Icon name="library-books" size={24} color="#007AFF" />
          <Text style={styles.templateButtonText}>Start from Template</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Your Progress</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalWorkouts}</Text>
          <Text style={styles.statLabel}>Total Workouts</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.thisWeekWorkouts}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalVolume.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Volume</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.favoriteExercise}</Text>
          <Text style={styles.statLabel}>Top Exercise</Text>
        </View>
      </View>
    </View>
  );

  const renderRecentWorkouts = () => (
    <View style={styles.recentWorkoutsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Workouts</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      {recentWorkouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="fitness-center" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>No workouts yet</Text>
          <Text style={styles.emptyStateSubtext}>Start your first workout to see it here</Text>
        </View>
      ) : (
        <FlatList
          data={recentWorkouts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.workoutHistoryItem}>
              <View style={styles.workoutHistoryLeft}>
                <Text style={styles.workoutHistoryName}>{item.name}</Text>
                <Text style={styles.workoutHistoryDate}>
                  {new Date(item.date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.workoutHistoryRight}>
                <Text style={styles.workoutHistoryDuration}>
                  {formatTime(item.duration)}
                </Text>
                <Icon name="chevron-right" size={20} color="#999" />
              </View>
            </TouchableOpacity>
          )}
          scrollEnabled={false}
        />
      )}
    </View>
  );

  const renderNewWorkoutModal = () => (
    <Modal
      visible={showNewWorkoutModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowNewWorkoutModal(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>New Workout</Text>
          <TouchableOpacity onPress={() => handleStartWorkout()}>
            <Text style={styles.modalDoneText}>Start</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Workout Name</Text>
            <TextInput
              style={styles.textInput}
              value={workoutName}
              onChangeText={setWorkoutName}
              placeholder="Enter workout name"
              autoFocus
            />
          </View>

          {workoutTemplates.length > 0 && (
            <View style={styles.templatesSection}>
              <Text style={styles.inputLabel}>Templates</Text>
              {workoutTemplates.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateItem}
                  onPress={() => handleStartWorkout(template.id)}
                >
                  <View>
                    <Text style={styles.templateName}>{template.name}</Text>
                    {template.description && (
                      <Text style={styles.templateDescription}>
                        {template.description}
                      </Text>
                    )}
                  </View>
                  <Icon name="chevron-right" size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back!</Text>
        <Text style={styles.dateText}>{new Date().toDateString()}</Text>
      </View>

      {renderActiveWorkout()}
      {!state.activeWorkout && renderQuickActions()}
      {renderStats()}
      {renderRecentWorkouts()}
      {renderNewWorkoutModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  activeWorkoutCard: {
    backgroundColor: '#007AFF',
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  activeWorkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeWorkoutTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  activeWorkoutTime: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  activeWorkoutName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  activeWorkoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  activeWorkoutButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  finishButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionsContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  quickStartButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  quickStartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  templateButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    gap: 8,
  },
  templateButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: (width - 56) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentWorkoutsContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  workoutHistoryItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  workoutHistoryLeft: {
    flex: 1,
  },
  workoutHistoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  workoutHistoryDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  workoutHistoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workoutHistoryDuration: {
    fontSize: 14,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  modalDoneText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  templatesSection: {
    marginBottom: 24,
  },
  templateItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default HomeScreen;
