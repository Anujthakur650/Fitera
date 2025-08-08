import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import THEME from '../constants/theme';

const ProgressChart = ({ data, title }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available to display chart.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <LineChart
        data={data}
        height={220}
        color={THEME.colors.primary}
        thickness={3}
        spacing={40}
        initialSpacing={20}
        yAxisLabelSuffix=" lbs"
        yAxisTextStyle={{ color: THEME.colors.gray400 }}
        xAxisTextStyle={{ color: THEME.colors.gray400 }}
        rulesColor={THEME.colors.gray700}
        dataPointsColor={THEME.colors.primary}
        curved
        isAnimated
        animateOnDataChange
        showDataPointOnFocus
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.gray800,
    borderRadius: THEME.spacing.md,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
  },
  title: {
    color: THEME.colors.white,
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: THEME.typography.fontWeight.bold,
    marginBottom: THEME.spacing.md,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: THEME.colors.gray500,
    fontSize: THEME.typography.fontSize.md,
  },
});

export default memo(ProgressChart);
