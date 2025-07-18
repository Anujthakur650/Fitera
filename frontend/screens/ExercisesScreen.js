import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useWorkout } from '../contexts/WorkoutContext';
import DatabaseManager from '../utils/database';

const ExercisesScreen = () => {
  const { 
    state, 
    addExerciseToWorkout 
  } = useWorkout();
  
  const [exercises, setExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [showExerciseDetailModal, setShowExerciseDetailModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [customExercise, setCustomExercise] = useState({
    name: '',
    category: 'Chest',
    muscleGroups: '',
    equipment: '',
    instructions: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [selectedCategory, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Ensure database is initialized
      await DatabaseManager.initDatabase();
      
      const [exercisesData, categoriesData] = await Promise.all([
        DatabaseManager.getExercises(),
        DatabaseManager.getExerciseCategories()
      ]);
      
      setExercises(exercisesData);
      setCategories([{ id: 'all', name: 'All', icon: 'fitness-center' }, ...categoriesData]);
    } catch (error) {
      console.error('Error loading exercises:', error);
      Alert.alert('Error', 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const filterExercises = async () => {
    try {
      let filteredExercises;
      
      if (searchQuery.trim()) {
        // Search exercises
        filteredExercises = await DatabaseManager.searchExercises(searchQuery);
      } else if (selectedCategory === 'All') {
        // Show all exercises
        filteredExercises = await DatabaseManager.getExercises();
      } else {
        // Filter by category
        const category = categories.find(cat => cat.name === selectedCategory);
        if (category && category.id !== 'all') {
          filteredExercises = await DatabaseManager.getExercises(category.id);
        } else {
          filteredExercises = await DatabaseManager.getExercises();
        }
      }
      
      setExercises(filteredExercises);
    } catch (error) {
      console.error('Error filtering exercises:', error);
    }
  };

  const handleAddCustomExercise = async () => {
    if (!customExercise.name.trim()) {
      Alert.alert('Error', 'Exercise name is required');
      return;
    }

    try {
      // Find category ID
      const category = categories.find(cat => cat.name === customExercise.category);
      const categoryId = category ? category.id : categories[1]?.id; // Default to first real category

      await DatabaseManager.runAsync(
        'INSERT INTO exercises (name, category_id, muscle_groups, equipment, instructions, is_custom) VALUES (?, ?, ?, ?, ?, ?)',
        [
          customExercise.name,
          categoryId,
          customExercise.muscleGroups,
          customExercise.equipment,
          customExercise.instructions,
          1
        ]
      );

      // Reset form
      setCustomExercise({
        name: '',
        category: 'Chest',
        muscleGroups: '',
        equipment: '',
        instructions: ''
      });

      setShowAddCustomModal(false);
      await loadData();
      Alert.alert('Success', 'Custom exercise added successfully!');
    } catch (error) {
      console.error('Error adding custom exercise:', error);
      Alert.alert('Error', 'Failed to add custom exercise');
    }
  };

  const handleAddToWorkout = async (exercise) => {
    if (!state.activeWorkout) {
      Alert.alert(
        'No Active Workout',
        'Start a workout first to add exercises.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await addExerciseToWorkout(exercise.id, exercise.name);
      Alert.alert('Success', `${exercise.name} added to your workout!`);
    } catch (error) {
      console.error('Error adding exercise to workout:', error);
      Alert.alert('Error', 'Failed to add exercise to workout');
    }
  };

  const renderCategoryTab = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryTab,
        selectedCategory === item.name && styles.selectedCategoryTab
      ]}
      onPress={() => setSelectedCategory(item.name)}
    >
      <MaterialIcons 
        name={item.icon} 
        size={16} 
        color={selectedCategory === item.name ? '#007AFF' : '#666'} 
      />
      <Text style={[
        styles.categoryTabText,
        selectedCategory === item.name && styles.selectedCategoryTabText
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderExerciseCard = ({ item }) => (
    <View style={styles.exerciseCard}>
      <TouchableOpacity
        style={styles.exerciseInfo}
        onPress={() => {
          setSelectedExercise(item);
          setShowExerciseDetailModal(true);
        }}
      >
        <View style={styles.exerciseHeader}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          {item.is_custom === 1 && (
            <View style={styles.customBadge}>
              <Text style={styles.customBadgeText}>Custom</Text>
            </View>
          )}
        </View>
        <Text style={styles.exerciseDetails}>
          {item.muscle_groups} • {item.equipment || 'Various'}
        </Text>
        <Text style={styles.exerciseCategory}>{item.category_name}</Text>
      </TouchableOpacity>
      
      <View style={styles.exerciseActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleAddToWorkout(item)}
        >
          <MaterialIcons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading exercises...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Exercises</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddCustomModal(true)}
        >
          <MaterialIcons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category Tabs */}
      <FlatList
        data={categories}
        renderItem={renderCategoryTab}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryTabs}
        contentContainerStyle={styles.categoryTabsContent}
      />

      {/* Exercise List */}
      <FlatList
        data={exercises}
        renderItem={renderExerciseCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.exerciseList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="fitness-center" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No exercises found' : 'No exercises available'}
            </Text>
          </View>
        }
      />

      {/* Add Custom Exercise Modal */}
      <Modal
        visible={showAddCustomModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddCustomModal(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Custom Exercise</Text>
            <TouchableOpacity onPress={handleAddCustomExercise}>
              <Text style={styles.modalSaveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Exercise Name *</Text>
              <TextInput
                style={styles.textInput}
                value={customExercise.name}
                onChangeText={(text) => setCustomExercise({...customExercise, name: text})}
                placeholder="Enter exercise name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categorySelector}>
                  {categories.slice(1).map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categorySelectorItem,
                        customExercise.category === category.name && styles.selectedCategorySelectorItem
                      ]}
                      onPress={() => setCustomExercise({...customExercise, category: category.name})}
                    >
                      <Text style={[
                        styles.categorySelectorText,
                        customExercise.category === category.name && styles.selectedCategorySelectorText
                      ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Muscle Groups</Text>
              <TextInput
                style={styles.textInput}
                value={customExercise.muscleGroups}
                onChangeText={(text) => setCustomExercise({...customExercise, muscleGroups: text})}
                placeholder="e.g., Chest, Triceps, Shoulders"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Equipment</Text>
              <TextInput
                style={styles.textInput}
                value={customExercise.equipment}
                onChangeText={(text) => setCustomExercise({...customExercise, equipment: text})}
                placeholder="e.g., Barbell, Dumbbells"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Instructions</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={customExercise.instructions}
                onChangeText={(text) => setCustomExercise({...customExercise, instructions: text})}
                placeholder="Enter exercise instructions..."
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Exercise Detail Modal */}
      <Modal
        visible={showExerciseDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedExercise && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowExerciseDetailModal(false)}>
                <Text style={styles.modalCancelButton}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedExercise.name}</Text>
              <TouchableOpacity onPress={() => handleAddToWorkout(selectedExercise)}>
                <Text style={styles.modalSaveButton}>Add</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.exerciseDetailSection}>
                <Text style={styles.exerciseDetailLabel}>Category</Text>
                <Text style={styles.exerciseDetailValue}>{selectedExercise.category_name}</Text>
              </View>

              <View style={styles.exerciseDetailSection}>
                <Text style={styles.exerciseDetailLabel}>Muscle Groups</Text>
                <Text style={styles.exerciseDetailValue}>{selectedExercise.muscle_groups}</Text>
              </View>

              <View style={styles.exerciseDetailSection}>
                <Text style={styles.exerciseDetailLabel}>Equipment</Text>
                <Text style={styles.exerciseDetailValue}>{selectedExercise.equipment || 'Various'}</Text>
              </View>

              {selectedExercise.instructions && (
                <View style={styles.exerciseDetailSection}>
                  <Text style={styles.exerciseDetailLabel}>Instructions</Text>
                  <Text style={styles.exerciseDetailValue}>{selectedExercise.instructions}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  categoryTabs: {
    maxHeight: 50,
  },
  categoryTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedCategoryTab: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  categoryTabText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryTabText: {
    color: '#007AFF',
  },
  exerciseList: {
    padding: 16,
  },
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  customBadge: {
    backgroundColor: '#ff9500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  customBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  exerciseCategory: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  exerciseActions: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 16,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
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
    height: 100,
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
  },
  categorySelectorItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedCategorySelectorItem: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categorySelectorText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedCategorySelectorText: {
    color: '#fff',
  },
  exerciseDetailSection: {
    marginBottom: 20,
  },
  exerciseDetailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  exerciseDetailValue: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
});

export default ExercisesScreen;
