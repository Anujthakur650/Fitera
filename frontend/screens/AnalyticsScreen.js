import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import THEME from '../constants/theme';
import { useWorkout } from '../contexts/WorkoutContext';
import { useAuth } from '../contexts/FirebaseAuthContext';
import analyticsEngine from '../utils/firebaseAnalytics';
// Removed DataDebugComponent for production

const { width } = Dimensions.get('window');

const AnalyticsScreen = () => {
  const { state } = useWorkout();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState(30);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const timeframes = [
    { label: '1 Week', value: 7 },
    { label: '1 Month', value: 30 },
    { label: '3 Months', value: 90 },
    { label: '6 Months', value: 180 }
  ];

  useEffect(() => {
    if (state?.dbInitialized && user?.id) {
      loadAnalytics();
    }
  }, [state?.dbInitialized, selectedTimeframe, user?.id]);

  const loadAnalytics = async () => {
    try {
      if (!user?.id) {
        console.log('No user ID available for analytics');
        return;
      }
      setLoading(true);
      const analyticsData = await analyticsEngine.getComprehensiveAnalytics(user.id, selectedTimeframe);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const showDetail = (type, data) => {
    setSelectedDetail({ type, data });
    setShowDetailModal(true);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Analytics</Text>
      <TouchableOpacity onPress={loadAnalytics} style={styles.refreshButton}>
        <MaterialIcons name="refresh" size={24} color={THEME.colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderTimeframeSelector = () => (
    <View style={styles.timeframeContainer}>
      <Text style={styles.sectionTitle}>Timeframe</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeframeScroll}>
        {timeframes.map((timeframe) => (
          <TouchableOpacity
            key={timeframe.value}
            style={[
              styles.timeframeButton,
              selectedTimeframe === timeframe.value && styles.timeframeButtonActive
            ]}
            onPress={() => setSelectedTimeframe(timeframe.value)}
          >
            <Text style={[
              styles.timeframeButtonText,
              selectedTimeframe === timeframe.value && styles.timeframeButtonTextActive
            ]}>
              {timeframe.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderOverallScore = () => {
    if (!analytics?.overallScore) return null;

    const { score, rating, breakdown } = analytics.overallScore;
    const scoreColor = score >= 80 ? '#28a745' : score >= 60 ? '#ffc107' : '#dc3545';

    return (
      <View style={styles.scoreContainer}>
        <Text style={styles.sectionTitle}>Fitness Score</Text>
        <View style={styles.scoreCard}>
          <View style={styles.scoreMain}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score}</Text>
            <Text style={styles.scoreRating}>{rating}</Text>
          </View>
          
          <View style={styles.scoreBreakdown}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Balance</Text>
              <View style={styles.scoreBar}>
                <View style={[styles.scoreBarFill, { width: `${breakdown.muscleBalance}%`, backgroundColor: THEME.colors.primary }]} />
              </View>
              <Text style={styles.scoreValue}>{breakdown.muscleBalance}%</Text>
            </View>
            
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Ratios</Text>
              <View style={styles.scoreBar}>
                <View style={[styles.scoreBarFill, { width: `${breakdown.strengthRatios}%`, backgroundColor: '#28a745' }]} />
              </View>
              <Text style={styles.scoreValue}>{breakdown.strengthRatios}%</Text>
            </View>
            
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Consistency</Text>
              <View style={styles.scoreBar}>
                <View style={[styles.scoreBarFill, { width: `${breakdown.consistency}%`, backgroundColor: '#ffc107' }]} />
              </View>
              <Text style={styles.scoreValue}>{breakdown.consistency}%</Text>
            </View>
            
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Frequency</Text>
              <View style={styles.scoreBar}>
                <View style={[styles.scoreBarFill, { width: `${breakdown.frequency}%`, backgroundColor: '#17a2b8' }]} />
              </View>
              <Text style={styles.scoreValue}>{breakdown.frequency}%</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderMuscleBalance = () => {
    if (!analytics?.muscleBalance) return null;

    const { balance, imbalances, recommendations } = analytics.muscleBalance;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Muscle Group Balance</Text>
            <TouchableOpacity onPress={() => showDetail('muscleBalance', analytics.muscleBalance)}>
            <MaterialIcons name="info-outline" size={20} color={THEME.colors.gray600} />
          </TouchableOpacity>
        </View>

        <View style={styles.balanceContainer}>
          {balance && balance.slice(0, 4).map((group, index) => (
            <View key={index} style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>{group.muscleGroup}</Text>
              <View style={styles.balanceBar}>
                <View 
                  style={[
                    styles.balanceBarFill, 
                    { 
                      width: `${Math.min(parseFloat(group.percentage), 100)}%`,
                      backgroundColor: getBalanceColor(parseFloat(group.percentage))
                    }
                  ]} 
                />
              </View>
              <Text style={styles.balancePercentage}>{group.percentage}%</Text>
            </View>
          ))}
        </View>

        {imbalances && imbalances.length > 0 && (
          <View style={styles.imbalanceAlert}>
            <MaterialIcons name="warning" size={16} color={THEME.colors.accent} />
            <Text style={styles.imbalanceText}>
              {imbalances.length} muscle group imbalance{imbalances.length > 1 ? 's' : ''} detected
            </Text>
          </View>
        )}

        {recommendations && recommendations.length > 0 && (
          <View style={styles.recommendationBox}>
            <Text style={styles.recommendationTitle}>Recommendations:</Text>
            {recommendations.slice(0, 2).map((rec, index) => (
              <Text key={index} style={styles.recommendationText}>• {rec}</Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const getBalanceColor = (percentage) => {
    if (percentage < 15) return '#dc3545'; // Red for underworked
    if (percentage > 35) return '#ff9500'; // Orange for overworked
    return '#28a745'; // Green for balanced
  };

  const renderStrengthRatios = () => {
    if (!analytics?.strengthRatios?.ratios) return null;

    const { ratios, overallBalance } = analytics.strengthRatios;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Strength Ratios</Text>
            <TouchableOpacity onPress={() => showDetail('strengthRatios', analytics.strengthRatios)}>
            <MaterialIcons name="info-outline" size={20} color={THEME.colors.gray600} />
          </TouchableOpacity>
        </View>

        <View style={styles.ratiosContainer}>
          {ratios.slice(0, 3).map((ratio, index) => (
            <View key={index} style={styles.ratioItem}>
              <View style={styles.ratioHeader}>
                <Text style={styles.ratioName}>{ratio.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getRatioStatusColor(ratio.status) }]}>
                  <Text style={styles.statusText}>{ratio.status.replace('_', ' ')}</Text>
                </View>
              </View>
              <View style={styles.ratioDetails}>
                <Text style={styles.ratioValues}>
                  {ratio.actualRatio} (target: {ratio.idealRatio})
                </Text>
                <Text style={styles.ratioDeviation}>±{ratio.deviation}%</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.overallBalance}>
          <Text style={styles.overallBalanceLabel}>Overall Balance: </Text>
          <Text style={[styles.overallBalanceValue, { color: getOverallBalanceColor(overallBalance) }]}>
            {overallBalance.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>
    );
  };

  const getRatioStatusColor = (status) => {
    switch (status) {
      case 'excellent': return '#28a745';
      case 'good': return '#17a2b8';
      case 'needs_attention': return '#ffc107';
      case 'concerning': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getOverallBalanceColor = (balance) => {
    switch (balance) {
      case 'excellent': return '#28a745';
      case 'good': return '#17a2b8';
      case 'fair': return '#ffc107';
      case 'needs_improvement': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const renderPersonalRecords = () => {
    if (!analytics?.personalRecords) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Records</Text>
            <TouchableOpacity onPress={() => showDetail('personalRecords', analytics.personalRecords)}>
            <MaterialIcons name="info-outline" size={20} color={THEME.colors.gray600} />
          </TouchableOpacity>
        </View>

        <View style={styles.recordsContainer}>
          {analytics.personalRecords.slice(0, 3).map((record, index) => (
            <View key={index} style={styles.recordItem}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordExercise}>{record.exercise}</Text>
                <Text style={styles.recordCategory}>{record.category}</Text>
              </View>
              <View style={styles.recordStats}>
                <View style={styles.recordStat}>
                  <Text style={styles.recordLabel}>1RM Est.</Text>
                  <Text style={styles.recordValue}>{record.estimated1RM} lbs</Text>
                </View>
                <View style={styles.recordStat}>
                  <Text style={styles.recordLabel}>Max Weight</Text>
                  <Text style={styles.recordValue}>{record.maxWeight} lbs</Text>
                </View>
                <View style={styles.recordStat}>
                  <Text style={styles.recordLabel}>Max Reps</Text>
                  <Text style={styles.recordValue}>{record.maxReps}</Text>
                </View>
              </View>
              <Text style={styles.recordLastPerformed}>
                Last: {record.lastPerformed} ({record.daysSinceLastPerformed} days ago)
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderFrequencyAnalysis = () => {
    if (!analytics?.frequencyAnalysis?.metrics) return null;

    const { metrics, recommendations } = analytics.frequencyAnalysis;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Workout Frequency</Text>
            <TouchableOpacity onPress={() => showDetail('frequency', analytics.frequencyAnalysis)}>
            <MaterialIcons name="info-outline" size={20} color={THEME.colors.gray600} />
          </TouchableOpacity>
        </View>

        <View style={styles.frequencyGrid}>
          <View style={styles.frequencyItem}>
            <Text style={styles.frequencyValue}>{metrics.avgWorkoutsPerWeek}</Text>
            <Text style={styles.frequencyLabel}>Per Week</Text>
          </View>
          <View style={styles.frequencyItem}>
            <Text style={styles.frequencyValue}>{metrics.avgDuration}m</Text>
            <Text style={styles.frequencyLabel}>Avg Duration</Text>
          </View>
          <View style={styles.frequencyItem}>
            <Text style={styles.frequencyValue}>{metrics.consistencyScore}%</Text>
            <Text style={styles.frequencyLabel}>Consistency</Text>
          </View>
          <View style={styles.frequencyItem}>
            <Text style={styles.frequencyValue}>{metrics.currentStreak}</Text>
            <Text style={styles.frequencyLabel}>Current Streak</Text>
          </View>
        </View>

        {recommendations && recommendations.length > 0 && (
          <View style={styles.recommendationBox}>
            <Text style={styles.recommendationTitle}>Frequency Tips:</Text>
            {recommendations.slice(0, 2).map((rec, index) => (
              <Text key={index} style={styles.recommendationText}>• {rec}</Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderDetailModal = () => {
    if (!selectedDetail) return null;

    const { type, data } = selectedDetail;

    let modalContent = null;

    switch (type) {
      case 'muscleBalance':
        modalContent = (
          <View>
            <Text style={styles.modalTitle}>Muscle Group Balance Details</Text>
            <ScrollView>
              {data.balance.map((group, index) => (
                <View key={index} style={styles.modalBalanceItem}>
                  <Text style={styles.modalBalanceGroup}>{group.muscleGroup}</Text>
                  <View style={styles.modalBalanceStats}>
                    <Text>Volume: {group.volume.toLocaleString()} lbs</Text>
                    <Text>Sets: {group.sets}</Text>
                    <Text>Workouts: {group.workouts}</Text>
                    <Text>Percentage: {group.percentage}%</Text>
                  </View>
                </View>
              ))}
              
              {data.imbalances.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Imbalances Detected:</Text>
                  {data.imbalances.map((imbalance, index) => (
                    <View key={index} style={styles.modalImbalance}>
                      <Text style={styles.modalImbalanceGroup}>{imbalance.muscleGroup}</Text>
                      <Text style={styles.modalImbalanceType}>
                        {imbalance.type} ({imbalance.severity})
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>All Recommendations:</Text>
                {data.recommendations.map((rec, index) => (
                  <Text key={index} style={styles.modalRecommendation}>• {rec}</Text>
                ))}
              </View>
            </ScrollView>
          </View>
        );
        break;

      case 'strengthRatios':
        modalContent = (
          <View>
            <Text style={styles.modalTitle}>Strength Ratios Details</Text>
            <ScrollView>
              {data.ratios.map((ratio, index) => (
                <View key={index} style={styles.modalRatioItem}>
                  <Text style={styles.modalRatioName}>{ratio.name}</Text>
                  <View style={styles.modalRatioDetails}>
                    <Text>Primary: {ratio.primaryExercise} ({ratio.primaryMax} lbs)</Text>
                    <Text>Secondary: {ratio.secondaryExercise} ({ratio.secondaryMax} lbs)</Text>
                    <Text>Actual Ratio: {ratio.actualRatio}</Text>
                    <Text>Ideal Ratio: {ratio.idealRatio}</Text>
                    <Text>Deviation: {ratio.deviation}%</Text>
                    <Text>Status: {ratio.status.replace('_', ' ')}</Text>
                    <Text style={styles.modalRecommendation}>• {ratio.recommendation}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        );
        break;

      case 'personalRecords':
        modalContent = (
          <View>
            <Text style={styles.modalTitle}>All Personal Records</Text>
            <ScrollView>
              {data.map((record, index) => (
                <View key={index} style={styles.modalRecordItem}>
                  <Text style={styles.modalRecordExercise}>{record.exercise}</Text>
                  <View style={styles.modalRecordStats}>
                    <Text>Estimated 1RM: {record.estimated1RM} lbs</Text>
                    <Text>Max Weight: {record.maxWeight} lbs</Text>
                    <Text>Max Reps: {record.maxReps}</Text>
                    <Text>Max Volume: {record.maxVolume} lbs</Text>
                    <Text>Workout Count: {record.workoutCount}</Text>
                    <Text>Last Performed: {record.lastPerformed}</Text>
                    <Text>Days Since: {record.daysSinceLastPerformed}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        );
        break;

      case 'frequency':
        modalContent = (
          <View>
            <Text style={styles.modalTitle}>Frequency Analysis Details</Text>
            <ScrollView>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Metrics:</Text>
                <Text>Total Workouts: {data.metrics.totalWorkouts}</Text>
                <Text>Average per Week: {data.metrics.avgWorkoutsPerWeek}</Text>
                <Text>Average Duration: {data.metrics.avgDuration} minutes</Text>
                <Text>Consistency Score: {data.metrics.consistencyScore}%</Text>
                <Text>Longest Streak: {data.metrics.longestStreak} days</Text>
                <Text>Current Streak: {data.metrics.currentStreak} days</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>All Recommendations:</Text>
                {data.recommendations.map((rec, index) => (
                  <Text key={index} style={styles.modalRecommendation}>• {rec}</Text>
                ))}
              </View>
            </ScrollView>
          </View>
        );
        break;
    }

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            {modalContent}
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <MaterialIcons name="analytics" size={48} color="#ccc" />
          <Text style={styles.loadingText}>Analyzing your workout data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <MaterialIcons name="bar-chart" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No analytics data available</Text>
          <Text style={styles.emptySubtext}>Complete more workouts to see your analytics</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAnalytics}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      {renderHeader()}
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderTimeframeSelector()}
        {renderOverallScore()}
        {renderMuscleBalance()}
        {renderStrengthRatios()}
        {renderPersonalRecords()}
        {renderFrequencyAnalysis()}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: {new Date(analytics.lastUpdated).toLocaleString()}
          </Text>
        </View>
      </ScrollView>

      {renderDetailModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.lg,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  timeframeContainer: {
    backgroundColor: '#fff',
    paddingVertical: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.xl,
    marginBottom: THEME.spacing.lg,
  },
  timeframeScroll: {
    marginTop: 12,
  },
  timeframeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  timeframeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeframeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  timeframeButtonTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.xl,
    marginBottom: THEME.spacing.lg,
  },
  scoreCard: {
    alignItems: 'center',
  },
  scoreMain: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreRating: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 4,
  },
  scoreBreakdown: {
    width: '100%',
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    width: 80,
  },
  scoreBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 40,
    textAlign: 'right',
  },
  balanceContainer: {
    marginBottom: 16,
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    width: 80,
  },
  balanceBar: {
    flex: 1,
    height: 12,
    backgroundColor: '#e9ecef',
    borderRadius: 6,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  balanceBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  balancePercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 40,
    textAlign: 'right',
  },
  imbalanceAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  imbalanceText: {
    fontSize: 12,
    color: '#856404',
    marginLeft: 8,
    fontWeight: '500',
  },
  recommendationBox: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 4,
  },
  ratiosContainer: {
    marginBottom: 16,
  },
  ratioItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  ratioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratioName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  ratioDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratioValues: {
    fontSize: 13,
    color: '#666',
  },
  ratioDeviation: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  overallBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  overallBalanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  overallBalanceValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  recordsContainer: {
    marginBottom: 8,
  },
  recordItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordExercise: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  recordCategory: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recordStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recordStat: {
    alignItems: 'center',
  },
  recordLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  recordValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  recordLastPerformed: {
    fontSize: 12,
    color: '#666',
  },
  frequencyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  frequencyItem: {
    alignItems: 'center',
    flex: 1,
  },
  frequencyValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  frequencyLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  modalBalanceItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalBalanceGroup: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalBalanceStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  modalImbalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalImbalanceGroup: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  modalImbalanceType: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  modalRecommendation: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  modalRatioItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalRatioName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  modalRatioDetails: {
    gap: 4,
  },
  modalRecordItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalRecordExercise: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  modalRecordStats: {
    gap: 4,
  },
});

export default AnalyticsScreen; 