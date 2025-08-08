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
import { useAuth } from '../contexts/FirebaseAuthContext';
import database from '../utils/firebaseDatabase';
import THEME from '../constants/theme';
import EnhancedButton from '../components/EnhancedButton';
import EnhancedCard from '../components/EnhancedCard';
import { useFocusEffect } from '@react-navigation/native';

const ProfileScreen = ({ navigation }) => {
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

  // Refresh stats when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadWorkoutStats();
      }
    }, [user?.id])
  );

  const loadUserData = async () => {
    try {
      const userData = await database.getUserProfile(user.id);
      if (userData) {
        setUserProfile({
          name: user?.username || user?.name || userData.name || 'Fitera User',
          email: user?.email || userData.email || '',
          weight: userData.weight || '',
          height: userData.height || '',
          memberSince: userData.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
        });
      } else {
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
      if (!user || !user.id) {
        console.log('No authenticated user, showing default stats');
        // Show default/empty stats for unauthenticated users
        setWorkoutStats({
          totalWorkouts: 0,
          totalVolume: 0,
          personalRecords: 0,
          averageWorkoutTime: 0
        });
        return;
      }
      const userId = user.id; // Get current user ID - no fallback
      
      // Get total completed workouts for current user
      const stats = await database.getWorkoutStats(userId);

      const totalWorkouts = stats.totalWorkouts || 0;
      const totalVolume = Math.round(stats.totalVolume || 0);
      const personalRecords = stats.personalRecords || 0;
      const averageWorkoutTime = Math.round(stats.averageWorkoutTime || 0);

      console.log('Loading workout stats for user:', userId, {
        totalWorkouts,
        totalVolume,
        personalRecords,
        averageWorkoutTime
      });

      setWorkoutStats({
        totalWorkouts,
        totalVolume,
        personalRecords,
        averageWorkoutTime
      });
    } catch (error) {
      console.error('Error loading workout stats:', error);
    }
  };

  const saveUserProfile = async () => {
    try {
      // Update or insert user profile
      await database.saveUserProfile(user.id, userProfile);

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
      await database.saveBodyMeasurement(user.id, bodyMeasurement);

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
      'Choose export format for your workout data',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Export as JSON', 
          onPress: async () => {
            try {
              const userId = user?.id || 1;
              
              // Gather all user data
              const userData = {
                exportDate: new Date().toISOString(),
                user: userProfile,
                workouts: [],
                exercises: [],
                bodyMeasurements: []
              };

              // Get all workouts
              const workoutData = await database.getUserExportData(userId);
              userData.workouts = workoutData.workouts;
              userData.exercises = workoutData.exercises;
              userData.bodyMeasurements = workoutData.bodyMeasurements;

              // Convert to JSON string
              const jsonData = JSON.stringify(userData, null, 2);
              
              // Create filename with timestamp
              const filename = `fitera_export_${new Date().toISOString().split('T')[0]}.json`;
              
              // For now, we'll log the data and show a success message
              // In a real implementation, you would use expo-sharing or expo-file-system
              console.log('Exported data:', jsonData);
              
              Alert.alert(
                'Export Successful',
                `Your data has been prepared for export.\n\nFilename: ${filename}\n\nIn a production app, this would save to your device or share via email/cloud.`,
                [
                  {
                    text: 'Copy to Clipboard',
                    onPress: async () => {
                      // In a real app, you would use Clipboard API here
                      // import * as Clipboard from 'expo-clipboard';
                      // await Clipboard.setStringAsync(jsonData);
                      Alert.alert('Success', 'Data copied to clipboard (simulated)');
                    }
                  },
                  { text: 'OK' }
                ]
              );
            } catch (error) {
              console.error('Error exporting data:', error);
              Alert.alert('Error', 'Failed to export data. Please try again.');
            }
          }
        }
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
              await database.clearUserData(user.id);
              
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
          <MaterialIcons name="person" size={40} color={THEME.colors.primary} />
        </View>
      </View>
      <Text style={styles.userName}>{userProfile.name}</Text>
      <Text style={styles.memberSince}>Member since {userProfile.memberSince}</Text>
      <TouchableOpacity
        style={styles.editProfileButton}
        onPress={() => setShowEditProfileModal(true)}
      >
        <MaterialIcons name="edit" size={16} color={THEME.colors.primary} />
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
      <MaterialIcons name={icon} size={24} color={THEME.colors.gray600} style={styles.settingsIcon} />
      <View style={styles.settingsContent}>
        <Text style={styles.settingsTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || <MaterialIcons name="chevron-right" size={24} color={THEME.colors.gray400} />}
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
              trackColor={{ false: THEME.colors.gray300, true: THEME.colors.primary }}
              thumbColor={THEME.colors.white}
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
              trackColor={{ false: THEME.colors.gray300, true: THEME.colors.primary }}
              thumbColor={THEME.colors.white}
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
              trackColor={{ false: THEME.colors.gray300, true: THEME.colors.primary }}
              thumbColor={THEME.colors.white}
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
              trackColor={{ false: THEME.colors.gray300, true: THEME.colors.primary }}
              thumbColor={THEME.colors.white}
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
          {/* Temporary option for populating exercises */}
          {renderSettingsItem(
            'fitness-center',
            'Populate Exercises',
            'Add sample exercises to database',
            () => navigation.navigate('PopulateExercises')
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
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.lg,
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
    padding: THEME.spacing.xl,
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
    borderColor: THEME.colors.primary,
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
    color: THEME.colors.primary,
    fontWeight: '500',
  },
  statsSection: {
    backgroundColor: '#fff',
    padding: THEME.spacing.xl,
    marginBottom: THEME.spacing.xl,
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
    color: THEME.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: THEME.spacing.xl,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.lg,
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
    padding: THEME.spacing.xl,
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
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.lg,
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
    padding: THEME.spacing.xl,
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
