import React, { useState, useEffect, useCallback } from 'react';
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
  Dimensions,
  StatusBar
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWorkout } from '../contexts/WorkoutContext';
import { useAuth } from '../contexts/FirebaseAuthContext';
import database from '../utils/firebaseDatabase';
import { formatDate } from '../utils/dateUtils';
import { formatDateShort, formatWorkoutDate, getRelativeTime } from '../utils/dateFormatter';
import THEME from '../constants/theme';
import EnhancedButton from '../components/EnhancedButton';
import EnhancedCard from '../components/EnhancedCard';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { state, startWorkout, formatTime, completeWorkout } = useWorkout();
  const { user } = useAuth();
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
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isRecentLoading, setIsRecentLoading] = useState(true);
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(true);
  const [error, setError] = useState(null);
  

  // Initial load when component mounts and dependencies change
  useEffect(() => {
    if (state.dbInitialized && user) {
      loadDashboardData();
    }
  }, [state.dbInitialized, user]);

  useEffect(() => {
    checkIfNewUser();
  }, [user]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      
      // Always refresh when screen gains focus if database is initialized
      if (state.dbInitialized && user) {
        loadDashboardData();
      }
      
      return () => {
        isActive = false;
      };
    }, [state.dbInitialized, user])
  );

  const loadDashboardData = async () => {
    if (!state.dbInitialized || !user || !user.id) {
      console.log('No authenticated user, skipping dashboard data load');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsStatsLoading(true);
    setIsRecentLoading(true);
    setIsTemplatesLoading(true);
    try {
      const userId = user.id;

      // Start all requests but resolve independently so stats can render first
      const statsPromise = database.getUserStats(userId)
        .then((s) => setStats(s))
        .finally(() => setIsStatsLoading(false));

      const recentPromise = database.getRecentWorkouts(userId, 5)
        .then((r) => setRecentWorkouts(r))
        .finally(() => setIsRecentLoading(false));

      const templatesPromise = database.getTemplates(userId)
        .then((t) => setWorkoutTemplates(t))
        .finally(() => setIsTemplatesLoading(false));

      await Promise.allSettled([statsPromise, recentPromise, templatesPromise]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Could not load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getThisWeekWorkouts = (workouts) => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return workouts.filter(workout => new Date(workout.date) >= oneWeekAgo);
  };

  const calculateTotalVolume = async (workouts) => {
    try {
      // Total volume is already calculated in getWorkoutHistory for Firebase
      let totalVolume = 0;
      for (const workout of workouts) {
        totalVolume += workout.total_volume || 0;
      }
      return Math.round(totalVolume);
    } catch (error) {
      console.error('Error calculating total volume:', error);
      return 0;
    }
  };

  const getFavoriteExercise = async (userId) => {
    try {
      // For Firebase, we'll use the getUserStats method which already calculates favorite exercise
      const stats = await database.getUserStats(userId);
      return stats.favoriteExercise || 'None';
    } catch (error) {
      console.error('Error getting favorite exercise:', error);
      return 'None';
    }
  };

  const checkIfNewUser = async () => {
    if (!user?.id) return;
    
    try {
      // For Firebase, check if user has any workouts
      const workouts = await database.getWorkoutHistory(user.id, 1);
      const userIsNew = workouts.length === 0;
      setIsNewUser(userIsNew);
    } catch (error) {
      console.error('Error checking new user status:', error);
    }
  };

  const handleStartWorkout = async (templateId = null) => {
    const name = workoutName || `Workout - ${formatWorkoutDate(new Date())}`;
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
    setWorkoutName(`Quick Workout - ${formatWorkoutDate(new Date())}`);
    handleStartWorkout();
  };

  // ==========================================
  // ACTIVE WORKOUT CARD TEMPORARILY REMOVED
  // ==========================================
  // The Active Workout card has been commented out for clean production deployment
  // due to persistent styling and alignment issues. Users can access workout
  // functionality through the Workout tab.
  // 
  // Original renderActiveWorkout function preserved below for future reference:
  //
  // const renderActiveWorkout = () => {
  //   if (!state.activeWorkout) return null;
  //
  //   return (
  //     <EnhancedCard 
  //       gradient={true}
  //       gradientColors={THEME.colors.gradients.primary}
  //       style={styles.activeWorkoutCard}
  //     >
  //       <View style={styles.activeWorkoutHeader}>
  //         <Text style={styles.activeWorkoutTitle}>Active Workout</Text>
  //         <Text style={styles.activeWorkoutTime}>
  //           {formatTime(state.timer.duration)}
  //         </Text>
  //       </View>
  //       
  //       <Text style={styles.activeWorkoutName}>{state.activeWorkout.name}</Text>
  //       
  //       <View style={styles.activeWorkoutStats}>
  //         <View style={styles.activeWorkoutStatItem}>
  //           <Text style={styles.activeWorkoutStatNumber}>{state.workoutExercises.length}</Text>
  //           <Text style={styles.activeWorkoutStatLabel}>Exercises</Text>
  //         </View>
  //         <View style={styles.activeWorkoutStatItem}>
  //           <Text style={styles.activeWorkoutStatNumber}>
  //             {Object.values(state.exerciseSets).flat().length}
  //           </Text>
  //           <Text style={styles.activeWorkoutStatLabel}>Sets</Text>
  //         </View>
  //         <View style={styles.activeWorkoutStatItem}>
  //           <Text style={styles.activeWorkoutStatNumber}>
  //             {Object.values(state.exerciseSets).flat().reduce((total, set) => 
  //               total + (set.weight * set.reps), 0
  //             ).toLocaleString()} lbs
  //           </Text>
  //           <Text style={styles.activeWorkoutStatLabel}>Volume</Text>
  //         </View>
  //       </View>
  //
  //       <View style={styles.activeWorkoutButtons}>
  //         <View style={styles.buttonWrapper}>
  //           <EnhancedButton
  //             title="Continue"
  //             variant="secondary"
  //             size="medium"
  //             icon="play-arrow"
  //             onPress={() => navigation.navigate('Workout')}
  //             style={styles.buttonStyle}
  //           />
  //         </View>
  //         
  //         <View style={styles.buttonWrapper}>
  //           <EnhancedButton
  //             title="Finish"
  //             variant="outline"
  //             size="medium"
  //             icon="check"
  //             onPress={() => {
  //               Alert.alert(
  //                 'Finish Workout',
  //                 'Are you sure you want to finish this workout?',
  //                 [
  //                   { text: 'Cancel', style: 'cancel' },
  //                   { text: 'Finish', onPress: completeWorkout }
  //                 ]
  //               );
  //             }}
  //             style={styles.buttonStyle}
  //             textStyle={styles.finishButtonText}
  //           />
  //         </View>
  //       </View>
  //     </EnhanchedCard>
  //   );
  // };
  
  const renderActiveWorkout = () => {
    // Active Workout card removed for clean production deployment
    return null;
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Quick Start</Text>
      
      <EnhancedButton
        title="Start Empty Workout"
        variant="primary"
        size="large"
        icon="play-arrow"
        gradient={true}
        onPress={handleQuickStart}
        disabled={!!state.activeWorkout}
        style={styles.quickStartButton}
      />

      {workoutTemplates.length > 0 && (
        <EnhancedButton
          title="Start from Template"
          variant="secondary"
          size="large"
          icon="library-books"
          onPress={() => setShowNewWorkoutModal(true)}
          disabled={!!state.activeWorkout}
          style={styles.templateButton}
        />
      )}
    </View>
  );

  const renderStatSkeleton = () => (
    <View style={[styles.statCard, { backgroundColor: THEME.colors.gray800 }]}>
      <View style={{ width: '100%', height: '100%', position: 'absolute', backgroundColor: 'rgba(255,255,255,0.1)' }} />
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Your Progress</Text>
      
      {isStatsLoading ? (
        <View style={styles.statsGrid}>
          {renderStatSkeleton()}
          {renderStatSkeleton()}
          {renderStatSkeleton()}
          {renderStatSkeleton()}
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <EnhancedButton title="Retry" onPress={loadDashboardData} variant="primary" />
        </View>
      ) : (
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Icon name="fitness-center" size={24} color={THEME.colors.primary} style={styles.statIcon} />
          <Text style={styles.statNumber}>{stats.totalWorkouts}</Text>
          <Text style={styles.statLabel}>Total Workouts</Text>
        </View>
        
        <View style={styles.statCard}>
          <Icon name="calendar-today" size={24} color={THEME.colors.primary} style={styles.statIcon} />
          <Text style={styles.statNumber}>{stats.thisWeekWorkouts}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        
        <View style={styles.statCard}>
          <Icon name="trending-up" size={24} color={THEME.colors.primary} style={styles.statIcon} />
          <Text style={styles.statNumber}>
            {stats.totalVolume > 1000 ? `${(stats.totalVolume / 1000).toFixed(1)}k` : stats.totalVolume.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Total Volume (lbs)</Text>
        </View>
        
        <View style={styles.statCard}>
          <Icon name="star" size={24} color={THEME.colors.primary} style={styles.statIcon} />
          <Text style={[styles.statNumber, { 
            fontSize: stats.favoriteExercise.length > 12 ? 
              THEME.typography.fontSize['2xl'] : 
              THEME.typography.fontSize['4xl'] 
          }]}>
            {stats.favoriteExercise}
          </Text>
          <Text style={styles.statLabel}>Top Exercise</Text>
        </View>
      </View>
      )}
    </View>
  );

  const renderRecentWorkouts = () => (
    <View style={styles.recentWorkoutsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Workouts</Text>
        <TouchableOpacity onPress={() => navigation.navigate('WorkoutHistory')}>
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
                  {getRelativeTime(item.date)}
                </Text>
              </View>
              <View style={styles.workoutHistoryRight}>
                <Text style={styles.workoutHistoryDuration}>
                  Duration: {formatTime(item.duration)}
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
    <>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>
            {isNewUser ? `Welcome to Fitera, ${user?.name || user?.username || 'friend'}!` : 'Welcome back!'}
          </Text>
          <Text style={styles.dateText}>{formatDate(new Date())}</Text>
        </View>

        {renderActiveWorkout()}

        {renderStats()}

        

        {!state.activeWorkout && renderQuickActions()}
        {renderRecentWorkouts()}
        {renderNewWorkoutModal()}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.gray100,
  },
  header: {
    padding: THEME.spacing.xl,
    paddingTop: THEME.spacing['6xl'],
  },
  welcomeText: {
    fontSize: THEME.typography.fontSize['4xl'],
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.black,
    letterSpacing: THEME.typography.letterSpacing.tight,
  },
  dateText: {
    fontSize: THEME.typography.fontSize.lg,
    color: THEME.colors.gray600,
    marginTop: THEME.spacing.xs,
    fontWeight: THEME.typography.fontWeight.medium,
  },
// ==========================================
  // ACTIVE WORKOUT STYLES TEMPORARILY COMMENTED OUT
  // ==========================================
  // These styles are preserved for future reference when the Active Workout
  // card is re-implemented with proper alignment fixes
  //
  // activeWorkoutCard: {
  //   margin: THEME.spacing.xl,
  //   marginTop: THEME.spacing.lg,
  //   padding: 0,
  // },
  // activeWorkoutHeader: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  //   marginBottom: THEME.spacing.md,
  // },
  // activeWorkoutTitle: {
  //   color: 'rgba(255,255,255,0.9)',
  //   fontSize: THEME.typography.fontSize.sm,
  //   fontWeight: THEME.typography.fontWeight.semibold,
  //   letterSpacing: THEME.typography.letterSpacing.widest,
  //   textTransform: 'uppercase',
  // },
  // activeWorkoutTime: {
  //   color: THEME.colors.white,
  //   fontSize: THEME.typography.fontSize.xl,
  //   fontWeight: THEME.typography.fontWeight.bold,
  // },
  // activeWorkoutName: {
  //   color: THEME.colors.white,
  //   fontSize: THEME.typography.fontSize['2xl'],
  //   fontWeight: THEME.typography.fontWeight.bold,
  //   marginBottom: THEME.spacing.lg,
  //   letterSpacing: THEME.typography.letterSpacing.tight,
  // },
  // activeWorkoutStats: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   marginBottom: THEME.spacing.lg,
  //   paddingHorizontal: THEME.spacing.md,
  // },
  // activeWorkoutStatItem: {
  //   alignItems: 'center',
  //   flex: 1,
  // },
  // activeWorkoutStatNumber: {
  //   color: THEME.colors.white,
  //   fontSize: THEME.typography.fontSize['2xl'],
  //   fontWeight: THEME.typography.fontWeight.bold,
  // },
  // activeWorkoutStatLabel: {
  //   color: 'rgba(255,255,255,0.8)',
  //   fontSize: THEME.typography.fontSize.xs,
  //   marginTop: THEME.spacing.xs,
  //   fontWeight: THEME.typography.fontWeight.medium,
  //   letterSpacing: THEME.typography.letterSpacing.wide,
  //   textTransform: 'uppercase',
  // },
  // statItem: {
  //   alignItems: 'center',
  // },
  // activeWorkoutButtons: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'stretch',
  //   gap: THEME.spacing.md,
  //   marginTop: THEME.spacing.md,
  //   height: 48, // Fixed container height
  // },
  // buttonWrapper: {
  //   flex: 1,
  //   height: 48,
  //   overflow: 'hidden', // Prevent buttons from growing beyond wrapper
  // },
  // buttonStyle: {
  //   height: 48,
  //   minHeight: 48,
  //   maxHeight: 48,
  //   flex: 1,
  //   margin: 0,
  //   padding: 0,
  // },
  // finishButtonText: {
  //   color: THEME.colors.white,
  // },
  quickActionsContainer: {
    marginHorizontal: THEME.spacing.xl,
    marginBottom: THEME.spacing['2xl'],
  },
  sectionTitle: {
    fontSize: THEME.typography.fontSize['2xl'],
    fontWeight: THEME.typography.fontWeight.bold,
    color: THEME.colors.black,
    marginBottom: THEME.spacing.lg,
    letterSpacing: THEME.typography.letterSpacing.tight,
  },
  quickStartButton: {
    marginBottom: THEME.spacing.md,
  },
  templateButton: {
    // Styles handled by EnhancedButton
  },
  statsContainer: {
    marginHorizontal: THEME.spacing.xl,
    marginBottom: THEME.spacing['2xl'],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.md,
  },
  statCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.xl,
    padding: THEME.spacing.lg,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexBasis: '48%', // Two cards per row with gap
    flexGrow: 1,
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    alignSelf: 'flex-end',
    color: THEME.colors.primary,
    opacity: 0.8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  statLabel: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.gray700,
    textAlign: 'center',
    fontWeight: THEME.typography.fontWeight.semibold,
    letterSpacing: THEME.typography.letterSpacing.wide,
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
  skeletonIcon: {
    backgroundColor: THEME.colors.gray300,
    position: 'absolute',
    top: THEME.spacing.md,
    right: THEME.spacing.md,
  },
  skeletonText: {
    backgroundColor: THEME.colors.gray300,
    borderRadius: THEME.radius.md,
  },
});

export default HomeScreen;
