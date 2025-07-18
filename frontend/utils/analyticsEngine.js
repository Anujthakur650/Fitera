import DatabaseManager from './database';

class AnalyticsEngine {
  constructor() {
    this.muscleGroupMapping = {
      'Chest': ['Chest', 'Pectorals', 'Pecs'],
      'Back': ['Back', 'Lats', 'Latissimus', 'Rhomboids', 'Traps'],
      'Shoulders': ['Shoulders', 'Delts', 'Deltoids'],
      'Arms': ['Biceps', 'Triceps', 'Forearms', 'Arms'],
      'Legs': ['Quads', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Legs'],
      'Core': ['Abs', 'Core', 'Obliques', 'Abdominals'],
      'Cardio': ['Cardio', 'Full Body']
    };

    this.strengthRatios = {
      'Bench Press vs Row': { primary: 'Bench Press', secondary: ['Barbell Row', 'T-Bar Row'], ideal: 1.0 },
      'Squat vs Deadlift': { primary: 'Squat', secondary: ['Deadlift'], ideal: 0.85 },
      'Overhead Press vs Bench': { primary: 'Overhead Press', secondary: ['Bench Press'], ideal: 0.66 },
      'Front Squat vs Back Squat': { primary: 'Front Squat', secondary: ['Squat'], ideal: 0.85 }
    };
  }

  // ===== MUSCLE GROUP BALANCE ANALYSIS =====
  async getMuscleGroupBalance(timeframe = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeframe);

      const query = `
        SELECT 
          e.muscle_groups,
          e.category_id,
          c.name as category_name,
          COUNT(DISTINCT w.id) as workout_count,
          COUNT(s.id) as total_sets,
          SUM(s.weight * s.reps) as total_volume,
          AVG(s.weight * s.reps) as avg_set_volume
        FROM sets s
        JOIN workout_exercises we ON s.workout_exercise_id = we.id
        JOIN workouts w ON we.workout_id = w.id
        JOIN exercises e ON we.exercise_id = e.id
        JOIN exercise_categories c ON e.category_id = c.id
        WHERE w.is_completed = 1 
          AND w.date >= ?
          AND s.is_completed = 1
        GROUP BY e.category_id, c.name
        ORDER BY total_volume DESC
      `;

      const results = await DatabaseManager.getAllAsync(query, [cutoffDate.toISOString()]);
      
      if (results.length === 0) {
        return {
          balance: [],
          totalVolume: 0,
          recommendations: ['Start tracking workouts to get muscle group analysis'],
          imbalances: []
        };
      }

      const totalVolume = results.reduce((sum, cat) => sum + (cat.total_volume || 0), 0);
      
      const balance = results.map(category => ({
        muscleGroup: category.category_name,
        volume: category.total_volume || 0,
        sets: category.total_sets || 0,
        workouts: category.workout_count || 0,
        percentage: ((category.total_volume || 0) / totalVolume * 100).toFixed(1),
        avgSetVolume: Math.round(category.avg_set_volume || 0)
      }));

      // Identify imbalances
      const imbalances = this.identifyMuscleImbalances(balance);
      const recommendations = this.generateBalanceRecommendations(balance, imbalances);

      return {
        balance,
        totalVolume: Math.round(totalVolume),
        recommendations,
        imbalances,
        timeframe
      };
    } catch (error) {
      console.error('Error analyzing muscle group balance:', error);
      return { balance: [], totalVolume: 0, recommendations: [], imbalances: [] };
    }
  }

  identifyMuscleImbalances(balance) {
    const imbalances = [];
    const avgPercentage = 100 / balance.length;
    
    balance.forEach(group => {
      const deviation = Math.abs(parseFloat(group.percentage) - avgPercentage);
      
      if (deviation > 15) { // More than 15% deviation from average
        imbalances.push({
          muscleGroup: group.muscleGroup,
          type: parseFloat(group.percentage) > avgPercentage ? 'overworked' : 'underworked',
          severity: deviation > 25 ? 'high' : 'moderate',
          percentage: group.percentage,
          deviation: deviation.toFixed(1)
        });
      }
    });

    return imbalances;
  }

  generateBalanceRecommendations(balance, imbalances) {
    const recommendations = [];

    if (imbalances.length === 0) {
      recommendations.push('Great! Your muscle groups are well balanced.');
      return recommendations;
    }

    const underworked = imbalances.filter(im => im.type === 'underworked');
    const overworked = imbalances.filter(im => im.type === 'overworked');

    if (underworked.length > 0) {
      const groups = underworked.map(g => g.muscleGroup).join(', ');
      recommendations.push(`Focus more on: ${groups}`);
    }

    if (overworked.length > 0) {
      const groups = overworked.map(g => g.muscleGroup).join(', ');
      recommendations.push(`Consider reducing volume for: ${groups}`);
    }

    // Specific recommendations
    const chest = balance.find(g => g.muscleGroup === 'Chest');
    const back = balance.find(g => g.muscleGroup === 'Back');
    
    if (chest && back) {
      const ratio = parseFloat(chest.percentage) / parseFloat(back.percentage);
      if (ratio > 1.3) {
        recommendations.push('Add more back exercises to balance your push/pull ratio');
      } else if (ratio < 0.7) {
        recommendations.push('Add more chest exercises to balance your push/pull ratio');
      }
    }

    return recommendations;
  }

  // ===== PROGRESSION TREND ANALYSIS =====
  async getProgressionTrends(exerciseId, timeframe = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeframe);

      const query = `
        SELECT 
          w.date,
          w.id as workout_id,
          s.weight,
          s.reps,
          s.weight * s.reps as volume,
          s.set_number,
          ROW_NUMBER() OVER (PARTITION BY w.id ORDER BY s.weight * s.reps DESC) as best_set_rank
        FROM sets s
        JOIN workout_exercises we ON s.workout_exercise_id = we.id
        JOIN workouts w ON we.workout_id = w.id
        WHERE we.exercise_id = ?
          AND w.is_completed = 1
          AND w.date >= ?
          AND s.is_completed = 1
          AND s.is_warmup = 0
        ORDER BY w.date ASC, s.set_number ASC
      `;

      const allSets = await DatabaseManager.getAllAsync(query, [exerciseId, cutoffDate.toISOString()]);
      
      if (allSets.length === 0) {
        return {
          trend: 'insufficient_data',
          dataPoints: [],
          bestSets: [],
          metrics: {},
          projections: {}
        };
      }

      // Get best set from each workout
      const bestSets = allSets
        .filter(set => set.best_set_rank === 1)
        .map(set => ({
          date: set.date.split('T')[0],
          weight: set.weight,
          reps: set.reps,
          volume: set.volume,
          oneRM: this.calculateOneRM(set.weight, set.reps)
        }));

      // Calculate trends
      const volumeTrend = this.calculateTrend(bestSets, 'volume');
      const strengthTrend = this.calculateTrend(bestSets, 'oneRM');
      const weightTrend = this.calculateTrend(bestSets, 'weight');

      // Group by week for cleaner visualization
      const weeklyData = this.groupByWeek(bestSets);

      return {
        trend: this.determineTrendDirection(volumeTrend.slope, strengthTrend.slope),
        dataPoints: weeklyData,
        bestSets: bestSets.slice(-10), // Last 10 best sets
        metrics: {
          volumeChange: volumeTrend.percentChange,
          strengthChange: strengthTrend.percentChange,
          weightChange: weightTrend.percentChange,
          consistency: this.calculateConsistency(bestSets),
          currentOneRM: bestSets[bestSets.length - 1]?.oneRM || 0
        },
        projections: this.calculateProjections(bestSets)
      };
    } catch (error) {
      console.error('Error analyzing progression trends:', error);
      return { trend: 'error', dataPoints: [], bestSets: [], metrics: {}, projections: {} };
    }
  }

  calculateOneRM(weight, reps) {
    // Epley formula: 1RM = weight * (1 + reps/30)
    return Math.round(weight * (1 + reps / 30));
  }

  calculateTrend(data, metric) {
    if (data.length < 2) return { slope: 0, percentChange: 0 };

    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, point) => sum + point[metric], 0);
    const sumXY = data.reduce((sum, point, i) => sum + i * point[metric], 0);
    const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const first = data[0][metric];
    const last = data[data.length - 1][metric];
    const percentChange = first ? ((last - first) / first * 100) : 0;

    return { slope, percentChange };
  }

  determineTrendDirection(volumeSlope, strengthSlope) {
    const avgSlope = (volumeSlope + strengthSlope) / 2;
    
    if (Math.abs(avgSlope) < 0.1) return 'stable';
    if (avgSlope > 0.5) return 'improving';
    if (avgSlope > 0) return 'slightly_improving';
    if (avgSlope < -0.5) return 'declining';
    return 'slightly_declining';
  }

  groupByWeek(data) {
    const weeks = {};
    
    data.forEach(point => {
      const date = new Date(point.date);
      const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = { date: weekKey, volume: 0, weight: 0, reps: 0, oneRM: 0, count: 0 };
      }
      
      weeks[weekKey].volume = Math.max(weeks[weekKey].volume, point.volume);
      weeks[weekKey].weight = Math.max(weeks[weekKey].weight, point.weight);
      weeks[weekKey].reps = Math.max(weeks[weekKey].reps, point.reps);
      weeks[weekKey].oneRM = Math.max(weeks[weekKey].oneRM, point.oneRM);
      weeks[weekKey].count++;
    });

    return Object.values(weeks).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  calculateConsistency(data) {
    if (data.length < 3) return 0;
    
    const volumes = data.map(d => d.volume);
    const mean = volumes.reduce((a, b) => a + b) / volumes.length;
    const variance = volumes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / volumes.length;
    const stdDev = Math.sqrt(variance);
    
    // Consistency score (lower coefficient of variation = higher consistency)
    const cv = stdDev / mean;
    return Math.max(0, Math.min(100, 100 * (1 - cv)));
  }

  calculateProjections(data) {
    if (data.length < 3) return {};

    const recent = data.slice(-5); // Last 5 workouts
    const avgImprovement = this.calculateTrend(recent, 'oneRM').slope;
    
    const currentOneRM = data[data.length - 1]?.oneRM || 0;
    
    return {
      nextMonth: Math.round(currentOneRM + avgImprovement * 4),
      nextQuarter: Math.round(currentOneRM + avgImprovement * 12),
      confidence: this.calculateConsistency(recent)
    };
  }

  // ===== STRENGTH RATIO ANALYSIS =====
  async getStrengthRatios() {
    try {
      const ratioAnalysis = [];

      for (const [ratioName, config] of Object.entries(this.strengthRatios)) {
        const primaryMax = await this.getExerciseMax(config.primary);
        const secondaryMaxes = await Promise.all(
          config.secondary.map(exercise => this.getExerciseMax(exercise))
        );
        
        const secondaryMax = Math.max(...secondaryMaxes.filter(max => max > 0));
        
        if (primaryMax > 0 && secondaryMax > 0) {
          const actualRatio = primaryMax / secondaryMax;
          const idealRatio = config.ideal;
          const deviation = Math.abs(actualRatio - idealRatio);
          const deviationPercent = (deviation / idealRatio) * 100;
          
          ratioAnalysis.push({
            name: ratioName,
            primaryExercise: config.primary,
            secondaryExercise: config.secondary[secondaryMaxes.indexOf(secondaryMax)],
            primaryMax,
            secondaryMax,
            actualRatio: actualRatio.toFixed(2),
            idealRatio: idealRatio.toFixed(2),
            deviation: deviationPercent.toFixed(1),
            status: this.getRatioStatus(deviationPercent),
            recommendation: this.getRatioRecommendation(ratioName, actualRatio, idealRatio)
          });
        }
      }

      return {
        ratios: ratioAnalysis,
        overallBalance: this.calculateOverallBalance(ratioAnalysis)
      };
    } catch (error) {
      console.error('Error analyzing strength ratios:', error);
      return { ratios: [], overallBalance: 'unknown' };
    }
  }

  async getExerciseMax(exerciseName) {
    try {
      const query = `
        SELECT MAX(s.weight * (1 + s.reps / 30)) as estimated_1rm
        FROM sets s
        JOIN workout_exercises we ON s.workout_exercise_id = we.id
        JOIN exercises e ON we.exercise_id = e.id
        JOIN workouts w ON we.workout_id = w.id
        WHERE e.name LIKE ?
          AND w.is_completed = 1
          AND s.is_completed = 1
          AND s.is_warmup = 0
          AND s.reps > 0
          AND s.weight > 0
      `;

      const result = await DatabaseManager.getFirstAsync(query, [`%${exerciseName}%`]);
      return Math.round(result?.estimated_1rm || 0);
    } catch (error) {
      console.error(`Error getting max for ${exerciseName}:`, error);
      return 0;
    }
  }

  getRatioStatus(deviationPercent) {
    if (deviationPercent < 10) return 'excellent';
    if (deviationPercent < 20) return 'good';
    if (deviationPercent < 35) return 'needs_attention';
    return 'concerning';
  }

  getRatioRecommendation(ratioName, actual, ideal) {
    const isUnder = actual < ideal;
    
    const recommendations = {
      'Bench Press vs Row': isUnder 
        ? 'Focus more on horizontal pulling exercises (rows, reverse flyes)' 
        : 'Your pulling strength is well developed relative to pressing',
      'Squat vs Deadlift': isUnder
        ? 'Work on squat technique and quadriceps strength'
        : 'Good balance between squat and deadlift strength',
      'Overhead Press vs Bench': isUnder
        ? 'Include more overhead pressing movements'
        : 'Strong overhead pressing relative to bench press',
      'Front Squat vs Back Squat': isUnder
        ? 'Improve front squat technique and core/upper back strength'
        : 'Good front squat strength relative to back squat'
    };

    return recommendations[ratioName] || 'Monitor this ratio over time';
  }

  calculateOverallBalance(ratios) {
    if (ratios.length === 0) return 'insufficient_data';
    
    const excellentCount = ratios.filter(r => r.status === 'excellent').length;
    const goodCount = ratios.filter(r => r.status === 'good').length;
    const concerningCount = ratios.filter(r => r.status === 'concerning').length;
    
    const excellentPercent = excellentCount / ratios.length * 100;
    const concerningPercent = concerningCount / ratios.length * 100;
    
    if (excellentPercent >= 60) return 'excellent';
    if (concerningPercent >= 40) return 'needs_improvement';
    if (excellentPercent + goodCount / ratios.length * 100 >= 80) return 'good';
    return 'fair';
  }

  // ===== VOLUME DISTRIBUTION ANALYSIS =====
  async getVolumeDistribution(timeframe = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeframe);

      const query = `
        SELECT 
          DATE(w.date) as workout_date,
          e.name as exercise_name,
          c.name as category_name,
          COUNT(s.id) as set_count,
          SUM(s.weight * s.reps) as total_volume,
          AVG(s.weight) as avg_weight,
          AVG(s.reps) as avg_reps
        FROM sets s
        JOIN workout_exercises we ON s.workout_exercise_id = we.id
        JOIN workouts w ON we.workout_id = w.id
        JOIN exercises e ON we.exercise_id = e.id
        JOIN exercise_categories c ON e.category_id = c.id
        WHERE w.is_completed = 1 
          AND w.date >= ?
          AND s.is_completed = 1
          AND s.is_warmup = 0
        GROUP BY DATE(w.date), e.id
        ORDER BY w.date DESC
      `;

      const data = await DatabaseManager.getAllAsync(query, [cutoffDate.toISOString()]);
      
      // Group by week for analysis
      const weeklyVolume = this.groupVolumeByWeek(data);
      const exerciseDistribution = this.calculateExerciseDistribution(data);
      const volumeTrends = this.calculateVolumeTrends(weeklyVolume);

      return {
        weeklyVolume,
        exerciseDistribution,
        volumeTrends,
        insights: this.generateVolumeInsights(weeklyVolume, exerciseDistribution, volumeTrends)
      };
    } catch (error) {
      console.error('Error analyzing volume distribution:', error);
      return { weeklyVolume: [], exerciseDistribution: [], volumeTrends: {}, insights: [] };
    }
  }

  groupVolumeByWeek(data) {
    const weeks = {};
    
    data.forEach(row => {
      const date = new Date(row.workout_date);
      const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = { 
          week: weekKey, 
          totalVolume: 0, 
          workouts: new Set(), 
          exercises: new Set(),
          categories: {}
        };
      }
      
      weeks[weekKey].totalVolume += row.total_volume;
      weeks[weekKey].workouts.add(row.workout_date);
      weeks[weekKey].exercises.add(row.exercise_name);
      
      if (!weeks[weekKey].categories[row.category_name]) {
        weeks[weekKey].categories[row.category_name] = 0;
      }
      weeks[weekKey].categories[row.category_name] += row.total_volume;
    });

    return Object.values(weeks).map(week => ({
      ...week,
      workoutCount: week.workouts.size,
      exerciseCount: week.exercises.size,
      avgVolumePerWorkout: Math.round(week.totalVolume / week.workouts.size),
      categories: week.categories
    })).sort((a, b) => new Date(a.week) - new Date(b.week));
  }

  calculateExerciseDistribution(data) {
    const exercises = {};
    
    data.forEach(row => {
      if (!exercises[row.exercise_name]) {
        exercises[row.exercise_name] = {
          name: row.exercise_name,
          category: row.category_name,
          totalVolume: 0,
          sessionCount: 0,
          avgVolume: 0
        };
      }
      
      exercises[row.exercise_name].totalVolume += row.total_volume;
      exercises[row.exercise_name].sessionCount++;
    });

    return Object.values(exercises).map(ex => ({
      ...ex,
      avgVolume: Math.round(ex.totalVolume / ex.sessionCount)
    })).sort((a, b) => b.totalVolume - a.totalVolume);
  }

  calculateVolumeTrends(weeklyData) {
    if (weeklyData.length < 2) return {};

    const volumes = weeklyData.map(w => w.totalVolume);
    const workoutCounts = weeklyData.map(w => w.workoutCount);
    
    return {
      volumeTrend: this.calculateTrend(weeklyData.map((w, i) => ({ volume: w.totalVolume, index: i })), 'volume'),
      consistencyTrend: this.calculateConsistency(volumes),
      avgWeeklyVolume: Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length),
      avgWorkoutsPerWeek: (workoutCounts.reduce((a, b) => a + b, 0) / workoutCounts.length).toFixed(1)
    };
  }

  generateVolumeInsights(weeklyVolume, exerciseDistribution, trends) {
    const insights = [];

    if (weeklyVolume.length === 0) {
      insights.push('Start tracking workouts to get volume analysis');
      return insights;
    }

    // Volume trend insights
    if (trends.volumeTrend?.percentChange > 10) {
      insights.push(`Great progress! Your weekly volume has increased by ${trends.volumeTrend.percentChange.toFixed(1)}%`);
    } else if (trends.volumeTrend?.percentChange < -10) {
      insights.push(`Your volume has decreased by ${Math.abs(trends.volumeTrend.percentChange).toFixed(1)}%. Consider increasing training intensity.`);
    }

    // Consistency insights
    if (trends.consistencyTrend > 80) {
      insights.push('Excellent training consistency! Keep it up.');
    } else if (trends.consistencyTrend < 50) {
      insights.push('Your training volume varies significantly. Try to maintain more consistent weekly volume.');
    }

    // Exercise distribution insights
    const topExercises = exerciseDistribution.slice(0, 3);
    if (topExercises.length > 0) {
      insights.push(`Your top exercises by volume: ${topExercises.map(e => e.name).join(', ')}`);
    }

    // Frequency insights
    if (parseFloat(trends.avgWorkoutsPerWeek) < 2) {
      insights.push('Consider increasing workout frequency for better results');
    } else if (parseFloat(trends.avgWorkoutsPerWeek) > 6) {
      insights.push('High training frequency detected. Ensure adequate recovery time.');
    }

    return insights;
  }

  // ===== PERSONAL RECORDS TRACKING =====
  async getPersonalRecords(limit = 10) {
    try {
      const query = `
        SELECT 
          e.name as exercise_name,
          c.name as category_name,
          MAX(s.weight) as max_weight,
          MAX(s.reps) as max_reps,
          MAX(s.weight * s.reps) as max_volume,
          MAX(s.weight * (1 + s.reps / 30)) as estimated_1rm,
          COUNT(DISTINCT w.id) as workout_count,
          MAX(w.date) as last_performed
        FROM sets s
        JOIN workout_exercises we ON s.workout_exercise_id = we.id
        JOIN workouts w ON we.workout_id = w.id
        JOIN exercises e ON we.exercise_id = e.id
        JOIN exercise_categories c ON e.category_id = c.id
        WHERE w.is_completed = 1
          AND s.is_completed = 1
          AND s.is_warmup = 0
          AND s.weight > 0
          AND s.reps > 0
        GROUP BY e.id
        ORDER BY estimated_1rm DESC
        LIMIT ?
      `;

      const records = await DatabaseManager.getAllAsync(query, [limit]);
      
      return records.map(record => ({
        exercise: record.exercise_name,
        category: record.category_name,
        maxWeight: record.max_weight,
        maxReps: record.max_reps,
        maxVolume: record.max_volume,
        estimated1RM: Math.round(record.estimated_1rm),
        workoutCount: record.workout_count,
        lastPerformed: record.last_performed?.split('T')[0] || 'Unknown',
        daysSinceLastPerformed: this.calculateDaysSince(record.last_performed)
      }));
    } catch (error) {
      console.error('Error getting personal records:', error);
      return [];
    }
  }

  calculateDaysSince(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now - date) / (1000 * 60 * 60 * 24));
  }

  // ===== WORKOUT FREQUENCY ANALYSIS =====
  async getWorkoutFrequencyAnalysis(timeframe = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeframe);

      const query = `
        SELECT 
          DATE(date) as workout_date,
          COUNT(*) as workout_count,
          AVG(duration) as avg_duration,
          SUM(duration) as total_duration
        FROM workouts
        WHERE is_completed = 1
          AND date >= ?
        GROUP BY DATE(date)
        ORDER BY workout_date ASC
      `;

      const dailyWorkouts = await DatabaseManager.getAllAsync(query, [cutoffDate.toISOString()]);
      
      const weeklyStats = this.groupWorkoutsByWeek(dailyWorkouts);
      const frequencyMetrics = this.calculateFrequencyMetrics(dailyWorkouts, weeklyStats);
      
      return {
        dailyWorkouts,
        weeklyStats,
        metrics: frequencyMetrics,
        recommendations: this.generateFrequencyRecommendations(frequencyMetrics)
      };
    } catch (error) {
      console.error('Error analyzing workout frequency:', error);
      return { dailyWorkouts: [], weeklyStats: [], metrics: {}, recommendations: [] };
    }
  }

  groupWorkoutsByWeek(dailyWorkouts) {
    const weeks = {};
    
    dailyWorkouts.forEach(day => {
      const date = new Date(day.workout_date);
      const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          week: weekKey,
          workoutDays: 0,
          totalDuration: 0,
          avgDuration: 0
        };
      }
      
      weeks[weekKey].workoutDays++;
      weeks[weekKey].totalDuration += day.total_duration || 0;
    });

    return Object.values(weeks).map(week => ({
      ...week,
      avgDuration: week.totalDuration / week.workoutDays
    })).sort((a, b) => new Date(a.week) - new Date(b.week));
  }

  calculateFrequencyMetrics(dailyWorkouts, weeklyStats) {
    if (dailyWorkouts.length === 0) return {};

    const workoutDays = dailyWorkouts.length;
    const totalDays = Math.max(1, (new Date() - new Date(dailyWorkouts[0].workout_date)) / (1000 * 60 * 60 * 24));
    const avgWorkoutsPerWeek = (workoutDays / totalDays) * 7;
    
    const durations = dailyWorkouts.map(d => d.avg_duration).filter(d => d > 0);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    
    const consistencyScore = this.calculateWorkoutConsistency(weeklyStats);
    
    return {
      totalWorkouts: workoutDays,
      avgWorkoutsPerWeek: avgWorkoutsPerWeek.toFixed(1),
      avgDuration: Math.round(avgDuration / 60), // Convert to minutes
      consistencyScore: Math.round(consistencyScore),
      longestStreak: this.calculateLongestStreak(dailyWorkouts),
      currentStreak: this.calculateCurrentStreak(dailyWorkouts)
    };
  }

  calculateWorkoutConsistency(weeklyStats) {
    if (weeklyStats.length === 0) return 0;
    
    const workoutCounts = weeklyStats.map(w => w.workoutDays);
    const avgWorkouts = workoutCounts.reduce((a, b) => a + b, 0) / workoutCounts.length;
    
    if (avgWorkouts === 0) return 0;
    
    const variance = workoutCounts.reduce((sum, count) => sum + Math.pow(count - avgWorkouts, 2), 0) / workoutCounts.length;
    const cv = Math.sqrt(variance) / avgWorkouts;
    
    return Math.max(0, 100 * (1 - cv));
  }

  calculateLongestStreak(dailyWorkouts) {
    if (dailyWorkouts.length === 0) return 0;
    
    let longestStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < dailyWorkouts.length; i++) {
      const prevDate = new Date(dailyWorkouts[i - 1].workout_date);
      const currDate = new Date(dailyWorkouts[i].workout_date);
      const daysDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 2) { // Allow 1 rest day
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }
    
    return Math.max(longestStreak, currentStreak);
  }

  calculateCurrentStreak(dailyWorkouts) {
    if (dailyWorkouts.length === 0) return 0;
    
    const today = new Date();
    const lastWorkout = new Date(dailyWorkouts[dailyWorkouts.length - 1].workout_date);
    const daysSinceLastWorkout = (today - lastWorkout) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastWorkout > 3) return 0; // Streak broken after 3 days
    
    let streak = 1;
    for (let i = dailyWorkouts.length - 2; i >= 0; i--) {
      const prevDate = new Date(dailyWorkouts[i].workout_date);
      const nextDate = new Date(dailyWorkouts[i + 1].workout_date);
      const daysDiff = (nextDate - prevDate) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 2) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  generateFrequencyRecommendations(metrics) {
    const recommendations = [];
    
    if (!metrics.avgWorkoutsPerWeek) {
      recommendations.push('Start tracking workouts to get frequency analysis');
      return recommendations;
    }

    const freq = parseFloat(metrics.avgWorkoutsPerWeek);
    
    if (freq < 2) {
      recommendations.push('Try to workout at least 2-3 times per week for optimal results');
    } else if (freq > 6) {
      recommendations.push('Very high frequency detected. Ensure adequate recovery between sessions');
    } else if (freq >= 3 && freq <= 5) {
      recommendations.push('Great workout frequency! You\'re in the optimal range.');
    }

    if (metrics.consistencyScore < 60) {
      recommendations.push('Try to maintain more consistent workout scheduling');
    } else if (metrics.consistencyScore > 80) {
      recommendations.push('Excellent consistency! Keep up the regular schedule.');
    }

    if (metrics.avgDuration < 30) {
      recommendations.push('Consider longer workout sessions for better volume');
    } else if (metrics.avgDuration > 120) {
      recommendations.push('Very long workouts detected. Consider splitting into shorter, more focused sessions');
    }

    if (metrics.currentStreak === 0) {
      recommendations.push('Time to get back into your routine! Start with a light workout.');
    } else if (metrics.currentStreak >= 7) {
      recommendations.push(`Amazing ${metrics.currentStreak}-day streak! Consider taking a rest day soon.`);
    }

    return recommendations;
  }

  // ===== COMPREHENSIVE ANALYTICS DASHBOARD =====
  async getComprehensiveAnalytics(timeframe = 30) {
    try {
      const [
        muscleBalance,
        volumeDistribution,
        strengthRatios,
        personalRecords,
        frequencyAnalysis
      ] = await Promise.all([
        this.getMuscleGroupBalance(timeframe),
        this.getVolumeDistribution(timeframe),
        this.getStrengthRatios(),
        this.getPersonalRecords(5),
        this.getWorkoutFrequencyAnalysis(timeframe)
      ]);

      const overallScore = this.calculateOverallFitnessScore({
        muscleBalance,
        strengthRatios,
        frequencyAnalysis
      });

      return {
        overallScore,
        muscleBalance,
        volumeDistribution,
        strengthRatios,
        personalRecords,
        frequencyAnalysis,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating comprehensive analytics:', error);
      return null;
    }
  }

  calculateOverallFitnessScore(analytics) {
    let score = 0;
    let maxScore = 0;

    // Muscle balance score (0-25 points)
    if (analytics.muscleBalance.imbalances.length === 0) score += 25;
    else if (analytics.muscleBalance.imbalances.length <= 2) score += 15;
    else if (analytics.muscleBalance.imbalances.length <= 4) score += 10;
    else score += 5;
    maxScore += 25;

    // Strength ratios score (0-25 points)
    const ratioBalance = analytics.strengthRatios.overallBalance;
    if (ratioBalance === 'excellent') score += 25;
    else if (ratioBalance === 'good') score += 20;
    else if (ratioBalance === 'fair') score += 15;
    else if (ratioBalance === 'needs_improvement') score += 10;
    else score += 5;
    maxScore += 25;

    // Frequency consistency score (0-25 points)
    const consistency = analytics.frequencyAnalysis.metrics.consistencyScore || 0;
    score += Math.round(consistency * 0.25);
    maxScore += 25;

    // Workout frequency score (0-25 points)
    const freq = parseFloat(analytics.frequencyAnalysis.metrics.avgWorkoutsPerWeek || 0);
    if (freq >= 3 && freq <= 5) score += 25;
    else if (freq >= 2 && freq < 3) score += 20;
    else if (freq >= 5 && freq <= 6) score += 20;
    else if (freq >= 1 && freq < 2) score += 15;
    else if (freq > 6) score += 10;
    else score += 5;
    maxScore += 25;

    const percentage = Math.round((score / maxScore) * 100);
    
    return {
      score: percentage,
      rating: this.getFitnessRating(percentage),
      breakdown: {
        muscleBalance: Math.round((score <= 25 ? score : 25) / 25 * 100),
        strengthRatios: Math.round((score <= 50 && score > 25 ? score - 25 : score > 50 ? 25 : 0) / 25 * 100),
        consistency: Math.round(consistency),
        frequency: Math.round((score > 75 ? 25 : score > 50 ? score - 50 : 0) / 25 * 100)
      }
    };
  }

  getFitnessRating(score) {
    if (score >= 90) return 'Elite';
    if (score >= 80) return 'Advanced';
    if (score >= 70) return 'Intermediate';
    if (score >= 60) return 'Beginner+';
    if (score >= 50) return 'Beginner';
    return 'Getting Started';
  }
}

export default new AnalyticsEngine(); 