import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Switch,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useWorkout } from '../contexts/WorkoutContext';
import { useAuth } from '../contexts/AuthContext';
import DatabaseManager from '../utils/database';
import THEME from '../constants/theme';
import EnhancedButton from '../components/EnhancedButton';
import EnhancedCard from '../components/EnhancedCard';

const ProfileScreen = () => {
  const { state } = useWorkout();
  const { user, logout } = useAuth();
  const [userProfile, setUserProfile] = useState({
    name: user?.username || user?.name || 'Fitera User',
    email: user?.email || '',
    weight: '',
    height: '',
    memberSince: new Date().toISOString().split('T')[0]
  });
  const [workoutStats, setWorkoutStats] = useState({
    totalWorkouts: 0,
    totalVolume: 0,
    personalRecords: 0,
    averageWorkoutTime: 0
  });
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showBodyMeasurementModal, setShowBodyMeasurementModal] = useState(false);
  const [appSettings, setAppSettings] = useState({
    notifications: true,
    soundEffects: true,
    vibrations: true,
    autoRestTimer: true,
    units: 'metric' // metric or imperial
  });
  const [bodyMeasurement, setBodyMeasurement] = useState({
    type: 'weight',
    value: '',
    unit: 'kg',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    loadUserData();
    loadWorkoutStats();
  }, []);

  const loadUserData = async () => {
    try {
      await DatabaseManager.initDatabase();
      // Load user profile from database, prioritizing authenticated user data
      const users = await DatabaseManager.getAllAsync('SELECT * FROM users LIMIT 1');
      if (users.length > 0) {
        setUserProfile({
          name: user?.username || user?.name || users[0].name || 'Fitera User',
          email: user?.email || users[0].email || '',
          weight: users[0].weight || '',
          height: users[0].height || '',
          memberSince: users[0].created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
        });
      } else {
        // If no local data, use authenticated user data
        setUserProfile({
          name: user?.username || user?.name || 'Fitera User',
          email: user?.email || '',
          weight: '',
          height: '',
          memberSince: new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadWorkoutStats = async () => {
    try {
      const userId = user?.id || 1; // Get current user ID
      
      // Get total completed workouts for current user
      const totalWorkouts = await DatabaseManager.getFirstAsync(
        'SELECT COUNT(*) as count FROM workouts WHERE is_completed = 1 AND user_id = ?',
        [userId]
      );

      // Get total volume (sets * weight * reps) for current user
      const volumeResult = await DatabaseManager.getFirstAsync(
        `SELECT SUM(s.weight * s.reps) as volume 
         FROM sets s 
         JOIN workout_exercises we ON s.workout_exercise_id = we.id 
         JOIN workouts w ON we.workout_id = w.id
         WHERE s.is_completed = 1 AND w.user_id = ?`,
        [userId]
      );

      // Get personal records count for current user
      const prResult = await DatabaseManager.getFirstAsync(
        `SELECT COUNT(DISTINCT we.exercise_id) as count 
         FROM sets s 
         JOIN workout_exercises we ON s.workout_exercise_id = we.id 
         JOIN workouts w ON we.workout_id = w.id
         WHERE s.is_completed = 1 AND w.user_id = ?`,
        [userId]
      );

      // Get average workout duration for current user
      const avgDuration = await DatabaseManager.getFirstAsync(
        'SELECT AVG(duration) as avg FROM workouts WHERE is_completed = 1 AND duration > 0 AND user_id = ?',
        [userId]
      );

      console.log('Loading workout stats for user:', userId, {
        totalWorkouts: totalWorkouts?.count || 0,
        totalVolume: Math.round(volumeResult?.volume || 0),
        personalRecords: prResult?.count || 0,
        averageWorkoutTime: Math.round(avgDuration?.avg || 0)
      });

      setWorkoutStats({
        totalWorkouts: totalWorkouts?.count || 0,
        totalVolume: Math.round(volumeResult?.volume || 0),
        personalRecords: prResult?.count || 0,
        averageWorkoutTime: Math.round(avgDuration?.avg || 0)
      });
    } catch (error) {
      console.error('Error loading workout stats:', error);
    }
  };

  const saveUserProfile = async () => {
    try {
      // Update or insert user profile
      const existingUser = await DatabaseManager.getFirstAsync('SELECT * FROM users LIMIT 1');
      
      if (existingUser) {
        await DatabaseManager.runAsync(
          'UPDATE users SET name = ?, email = ?, weight = ?, height = ? WHERE id = ?',
          [userProfile.name, userProfile.email, userProfile.weight, userProfile.height, existingUser.id]
        );
      } else {
        await DatabaseManager.runAsync(
          'INSERT INTO users (name, email, weight, height) VALUES (?, ?, ?, ?)',
          [userProfile.name, userProfile.email, userProfile.weight, userProfile.height]
        );
      }

      setShowEditProfileModal(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  const saveBodyMeasurement = async () => {
    if (!bodyMeasurement.value) {
      Alert.alert('Error', 'Please enter a value');
      return;
    }

    try {
      await DatabaseManager.runAsync(
        'INSERT INTO body_measurements (measurement_type, value, unit, date, notes) VALUES (?, ?, ?, ?, ?)',
        [bodyMeasurement.type, parseFloat(bodyMeasurement.value), bodyMeasurement.unit, bodyMeasurement.date, bodyMeasurement.notes]
      );

      setBodyMeasurement({
        type: 'weight',
        value: '',
        unit: 'kg',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });

      setShowBodyMeasurementModal(false);
      Alert.alert('Success', 'Body measurement saved!');
    } catch (error) {
      console.error('Error saving body measurement:', error);
      Alert.alert('Error', 'Failed to save measurement');
    }
  };

  const exportData = async () => {
    Alert.alert(
      'Export Data',
      'This feature would export your workout data to a file or cloud service.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => console.log('Export data functionality') }
      ]
    );
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your workouts, exercises, and progress. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete All', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete only current user's data with proper user isolation
              await DatabaseManager.runAsync(
                'DELETE FROM sets WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = ?)',
                [user.id]
              );
              await DatabaseManager.runAsync(
                'DELETE FROM workout_exercises WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = ?)',
                [user.id]
              );
              await DatabaseManager.runAsync('DELETE FROM workouts WHERE user_id = ?', [user.id]);
              await DatabaseManager.runAsync('DELETE FROM body_measurements WHERE user_id = ?', [user.id]);
              await DatabaseManager.runAsync('DELETE FROM personal_records WHERE user_id = ?', [user.id]);
              await loadWorkoutStats();
              Alert.alert('Success', 'Your data has been cleared successfully');
            } catch (error) {
              console.error('Error clearing user data:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your workout data will be saved locally.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const renderProfileSection = () => (
    <View style={styles.profileSection}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={40} color="#007AFF" />
        </View>
      </View>
      <Text style={styles.userName}>{userProfile.name}</Text>
      <Text style={styles.memberSince}>Member since {userProfile.memberSince}</Text>
      <TouchableOpacity
        style={styles.editProfileButton}
        onPress={() => setShowEditProfileModal(true)}
      >
        <MaterialIcons name="edit" size={16} color="#007AFF" />
        <Text style={styles.editProfileText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStatsSection = () => (
    <View style={styles.statsSection}>
      <Text style={styles.sectionTitle}>Your Progress</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{workoutStats.totalWorkouts}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{workoutStats.totalVolume.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Volume (kg)</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{workoutStats.personalRecords}</Text>
          <Text style={styles.statLabel}>Exercises Tracked</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{formatTime(workoutStats.averageWorkoutTime)}</Text>
          <Text style={styles.statLabel}>Avg Workout</Text>
        </View>
      </View>
    </View>
  );

  const renderSettingsItem = (icon, title, subtitle, onPress, rightElement = null) => (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
      <MaterialIcons name={icon} size={24} color="#666" style={styles.settingsIcon} />
      <View style={styles.settingsContent}>
        <Text style={styles.settingsTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || <MaterialIcons name="chevron-right" size={24} color="#ccc" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderProfileSection()}
        {renderStatsSection()}

        {/* Body Measurements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Measurements</Text>
          {renderSettingsItem(
            'monitor-weight',
            'Track Weight',
            'Log your weight progress',
            () => setShowBodyMeasurementModal(true)
          )}
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          {renderSettingsItem(
            'notifications',
            'Notifications',
            'Push notifications and alerts',
            () => {},
            <Switch
              value={appSettings.notifications}
              onValueChange={(value) => setAppSettings({...appSettings, notifications: value})}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor="#fff"
            />
          )}
          {renderSettingsItem(
            'volume-up',
            'Sound Effects',
            'Rest timer and completion sounds',
            () => {},
            <Switch
              value={appSettings.soundEffects}
              onValueChange={(value) => setAppSettings({...appSettings, soundEffects: value})}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor="#fff"
            />
          )}
          {renderSettingsItem(
            'vibration',
            'Vibrations',
            'Haptic feedback',
            () => {},
            <Switch
              value={appSettings.vibrations}
              onValueChange={(value) => setAppSettings({...appSettings, vibrations: value})}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor="#fff"
            />
          )}
          {renderSettingsItem(
            'timer',
            'Auto Rest Timer',
            'Automatically start rest timer after sets',
            () => {},
            <Switch
              value={appSettings.autoRestTimer}
              onValueChange={(value) => setAppSettings({...appSettings, autoRestTimer: value})}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor="#fff"
            />
          )}
          {renderSettingsItem(
            'straighten',
            'Units',
            `Currently using ${appSettings.units} units`,
            () => {
              setAppSettings({
                ...appSettings, 
                units: appSettings.units === 'metric' ? 'imperial' : 'metric'
              });
            }
          )}
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          {renderSettingsItem(
            'backup',
            'Export Data',
            'Backup your workout data',
            exportData
          )}
          {renderSettingsItem(
            'delete-sweep',
            'Clear All Data',
            'Delete all workouts and progress',
            clearAllData
          )}
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          {renderSettingsItem(
            'info',
            'App Version',
            'Fitera v1.0.0',
            () => {}
          )}
          {renderSettingsItem(
            'help',
            'Help & Support',
            'Get help using the app',
            () => Alert.alert('Help', 'Contact support at help@fitera.app')
          )}
          {renderSettingsItem(
            'star',
            'Rate App',
            'Rate us on the App Store',
            () => Alert.alert('Thank you!', 'This would open the App Store rating page')
          )}
        </View>

        {/* Account Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {user && (
            <View style={styles.userInfoContainer}>
              <MaterialIcons name="person" size={20} color={THEME.colors.primary} style={styles.userIcon} />
              <View style={styles.userInfo}>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userStatus}>Signed in</Text>
              </View>
            </View>
          )}
          
          <View style={styles.logoutButtonContainer}>
            <EnhancedButton
              title="Sign Out"
              variant="outline"
              size="large"
              icon="logout"
              onPress={handleLogout}
              style={styles.logoutButton}
              textStyle={styles.logoutButtonText}
            />
          </View>
        </View>

        

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with 💪 for fitness enthusiasts</Text>
      </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfileModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditProfileModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={saveUserProfile}>
              <Text style={styles.modalSaveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={userProfile.name}
                onChangeText={(text) => setUserProfile({...userProfile, name: text})}
                placeholder="Enter your name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={userProfile.email}
                onChangeText={(text) => setUserProfile({...userProfile, email: text})}
                placeholder="Enter your email"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.textInput}
                value={userProfile.weight}
                onChangeText={(text) => setUserProfile({...userProfile, weight: text})}
                placeholder="Enter your weight"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.textInput}
                value={userProfile.height}
                onChangeText={(text) => setUserProfile({...userProfile, height: text})}
                placeholder="Enter your height"
                keyboardType="numeric"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Body Measurement Modal */}
      <Modal
        visible={showBodyMeasurementModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowBodyMeasurementModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Measurement</Text>
            <TouchableOpacity onPress={saveBodyMeasurement}>
              <Text style={styles.modalSaveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Measurement Type</Text>
              <View style={styles.segmentedControl}>
                {['weight', 'body_fat', 'muscle_mass'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.segmentButton,
                      bodyMeasurement.type === type && styles.segmentButtonActive
                    ]}
                    onPress={() => setBodyMeasurement({...bodyMeasurement, type})}
                  >
                    <Text style={[
                      styles.segmentText,
                      bodyMeasurement.type === type && styles.segmentTextActive
                    ]}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Value</Text>
              <TextInput
                style={styles.textInput}
                value={bodyMeasurement.value}
                onChangeText={(text) => setBodyMeasurement({...bodyMeasurement, value: text})}
                placeholder="Enter value"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Unit</Text>
              <View style={styles.segmentedControl}>
                {['kg', 'lbs', '%'].map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.segmentButton,
                      bodyMeasurement.unit === unit && styles.segmentButtonActive
                    ]}
                    onPress={() => setBodyMeasurement({...bodyMeasurement, unit})}
                  >
                    <Text style={[
                      styles.segmentText,
                      bodyMeasurement.unit === unit && styles.segmentTextActive
                    ]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.textInput}
                value={bodyMeasurement.date}
                onChangeText={(text) => setBodyMeasurement({...bodyMeasurement, date: text})}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={bodyMeasurement.notes}
                onChangeText={(text) => setBodyMeasurement({...bodyMeasurement, notes: text})}
                placeholder="Add any notes..."
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
  },
  editProfileText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  statsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingsIcon: {
    marginRight: 16,
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  settingsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
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
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: '#007AFF',
  },
  segmentText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#fff',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userIcon: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: THEME.typography.fontWeight.medium,
    color: THEME.colors.gray900,
  },
  userStatus: {
    fontSize: 14,
    color: THEME.colors.secondary,
    marginTop: 2,
  },
  logoutButtonContainer: {
    padding: 20,
  },
  logoutButton: {
    borderColor: THEME.colors.error || '#dc3545',
  },
  logoutButtonText: {
    color: THEME.colors.error || '#dc3545',
  },
});

export default ProfileScreen;
