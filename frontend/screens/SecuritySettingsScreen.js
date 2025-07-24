import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import SecurityMigrationManager from '../utils/securityMigration';
import BiometricAuthManager from '../utils/biometricAuth';

const SecuritySettingsScreen = ({ navigation }) => {
  const [securityStatus, setSecurityStatus] = useState({
    securityEnabled: false,
    biometricAvailable: false,
    biometricEnabled: false,
    recommendations: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityStatus();
  }, []);

  const loadSecurityStatus = async () => {
    try {
      setLoading(true);
      
      const status = await SecurityMigrationManager.getSecurityStatus();
      const biometricStatus = await BiometricAuthManager.getBiometricStatus();
      const recommendations = await SecurityMigrationManager.getSecurityRecommendations();
      
      setSecurityStatus({
        securityEnabled: SecurityMigrationManager.isSecurityActive(),
        biometricAvailable: biometricStatus.deviceSupported,
        biometricEnabled: biometricStatus.appEnabled,
        availableTypes: biometricStatus.availableTypes || [],
        recommendations
      });
    } catch (error) {
      console.error('Error loading security status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBiometric = async () => {
    try {
      if (securityStatus.biometricEnabled) {
        // Disable biometric
        const confirmed = await new Promise((resolve) => {
          Alert.alert(
            'Disable Biometric Authentication?',
            'You will need to use your password to access sensitive features.',
            [
              { text: 'Cancel', onPress: () => resolve(false) },
              { text: 'Disable', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

        if (confirmed) {
          await BiometricAuthManager.disableBiometricAuth();
          await loadSecurityStatus();
        }
      } else {
        // Enable biometric
        const result = await BiometricAuthManager.enableBiometricAuth();
        if (result) {
          await loadSecurityStatus();
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update biometric settings');
    }
  };

  const enableEnhancedSecurity = async () => {
    try {
      Alert.alert(
        'Enable Enhanced Security?',
        'This will enable advanced security features including encrypted storage and enhanced authentication.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              try {
                await SecurityMigrationManager.enableEnhancedSecurity();
                await loadSecurityStatus();
              } catch (error) {
                Alert.alert('Error', 'Failed to enable enhanced security');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to enable enhanced security');
    }
  };

  const testBiometric = async () => {
    try {
      const result = await BiometricAuthManager.authenticate({
        promptMessage: 'Test biometric authentication'
      });
      
      if (result.success) {
        Alert.alert('Success', 'Biometric authentication test passed!');
      } else {
        Alert.alert('Failed', result.error || 'Biometric authentication test failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to test biometric authentication');
    }
  };

  const renderSecurityRecommendation = (recommendation) => (
    <TouchableOpacity
      key={recommendation.type}
      style={[styles.recommendationCard, 
        recommendation.priority === 'high' ? styles.highPriority : styles.mediumPriority
      ]}
      onPress={() => {
        if (recommendation.type === 'enable_security') {
          enableEnhancedSecurity();
        } else if (recommendation.type === 'enable_biometric') {
          toggleBiometric();
        }
      }}
    >
      <View style={styles.recommendationHeader}>
        <MaterialIcons 
          name={recommendation.priority === 'high' ? 'warning' : 'info'} 
          size={24} 
          color={recommendation.priority === 'high' ? '#ff6b6b' : '#4dabf7'} 
        />
        <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
      </View>
      <Text style={styles.recommendationDescription}>{recommendation.description}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading security settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Security Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusItem}>
              <MaterialIcons 
                name={securityStatus.securityEnabled ? 'security' : 'lock-open'} 
                size={24} 
                color={securityStatus.securityEnabled ? '#51cf66' : '#ffa726'} 
              />
              <Text style={styles.statusText}>
                Enhanced Security: {securityStatus.securityEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            
            <View style={styles.statusItem}>
              <MaterialIcons 
                name={securityStatus.biometricEnabled ? 'fingerprint' : 'fingerprint'} 
                size={24} 
                color={securityStatus.biometricEnabled ? '#51cf66' : '#dee2e6'} 
              />
              <Text style={styles.statusText}>
                Biometric Auth: {securityStatus.biometricEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recommendations */}
        {securityStatus.recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security Recommendations</Text>
            {securityStatus.recommendations.map(renderSecurityRecommendation)}
          </View>
        )}

        {/* Biometric Settings */}
        {securityStatus.biometricAvailable && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biometric Authentication</Text>
            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>
                    {securityStatus.availableTypes.join(' & ')} Authentication
                  </Text>
                  <Text style={styles.settingDescription}>
                    Use your device's biometric features for secure access
                  </Text>
                </View>
                <Switch
                  value={securityStatus.biometricEnabled}
                  onValueChange={toggleBiometric}
                  trackColor={{ false: '#767577', true: '#4dabf7' }}
                  thumbColor={securityStatus.biometricEnabled ? '#1c7ed6' : '#f4f3f4'}
                />
              </View>
              
              {securityStatus.biometricEnabled && (
                <TouchableOpacity style={styles.testButton} onPress={testBiometric}>
                  <MaterialIcons name="verified-user" size={20} color="#4dabf7" />
                  <Text style={styles.testButtonText}>Test Biometric Authentication</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Advanced Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Security</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Enhanced Security</Text>
                <Text style={styles.settingDescription}>
                  Encrypted storage and advanced authentication features
                </Text>
              </View>
              {!securityStatus.securityEnabled && (
                <TouchableOpacity 
                  style={styles.enableButton}
                  onPress={enableEnhancedSecurity}
                >
                  <Text style={styles.enableButtonText}>Enable</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialIcons name="info" size={20} color="#4dabf7" />
            <Text style={styles.infoText}>
              Enhanced security features protect your fitness data with military-grade encryption 
              and advanced authentication methods.
            </Text>
          </View>
        </View>

        {/* Security Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Security</Text>
          
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>What's Protected?</Text>
            <Text style={styles.infoDescription}>
              • Workout data and personal records{'\n'}
              • Body measurements and progress{'\n'}
              • Exercise history and preferences{'\n'}
              • Authentication tokens and credentials
            </Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>How It Works</Text>
            <Text style={styles.infoDescription}>
              Your data is encrypted using industry-standard AES-256 encryption. 
              Biometric data never leaves your device and is handled by your device's 
              secure hardware.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#2a2a2a',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statusCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  recommendationCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  highPriority: {
    backgroundColor: '#ff6b6b20',
    borderColor: '#ff6b6b',
    borderWidth: 1,
  },
  mediumPriority: {
    backgroundColor: '#4dabf720',
    borderColor: '#4dabf7',
    borderWidth: 1,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  recommendationDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  settingCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  settingDescription: {
    color: '#ccc',
    fontSize: 14,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4dabf720',
    borderRadius: 8,
    borderColor: '#4dabf7',
    borderWidth: 1,
  },
  testButtonText: {
    color: '#4dabf7',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  enableButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#4dabf7',
    borderRadius: 8,
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#4dabf720',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  infoText: {
    color: '#4dabf7',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 10,
    flex: 1,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 22,
  },
});

export default SecuritySettingsScreen; 