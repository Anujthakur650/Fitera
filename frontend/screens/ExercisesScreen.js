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
import { LinearGradient } from 'expo-linear-gradient';
import { useWorkout } from '../contexts/WorkoutContext';
import DatabaseManager from '../utils/database';

const ExercisesScreen = () => {
  const { 
    state, 
    addExerciseToWorkout 
  } = useWorkout();
  
  const [exercises, setExercises] = useState([]);
  const [allExercises, setAllExercises] = useState([]);
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

  // Ref for category tabs ScrollView
  const categoryScrollViewRef = React.useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Only filter if data is loaded
    if (allExercises.length > 0 && categories.length > 0) {
      filterExercises();
    }
  }, [selectedCategory, searchQuery, allExercises, categories]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Ensure database is initialized
      await DatabaseManager.initDatabase();
      
      const [exercisesData, categoriesData] = await Promise.all([
        DatabaseManager.getExercises(),
        DatabaseManager.getExerciseCategories()
      ]);
      
      console.log('📊 Categories loaded:', categoriesData);
      console.log('📊 Exercises loaded:', exercisesData.length);
      
      setAllExercises(exercisesData);
      setExercises(exercisesData);
      
      // Always ensure we have at least the basic categories
      const defaultCategories = [
        { id: 'all', name: 'All', icon: 'fitness-center' },
        { id: 1, name: 'Chest', icon: 'fitness-center' },
        { id: 2, name: 'Back', icon: 'fitness-center' },
        { id: 3, name: 'Shoulders', icon: 'fitness-center' },
        { id: 4, name: 'Arms', icon: 'fitness-center' },
        { id: 5, name: 'Legs', icon: 'fitness-center' },
        { id: 6, name: 'Core', icon: 'fitness-center' },
        { id: 7, name: 'Cardio', icon: 'fitness-center' }
      ];
      
      const allCategories = categoriesData && categoriesData.length > 0 
        ? [{ id: 'all', name: 'All', icon: 'fitness-center' }, ...categoriesData]
        : defaultCategories;
      
      console.log('📊 Final categories:', allCategories);
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading exercises:', error);
      // Set default categories even on error
      const defaultCategories = [
        { id: 'all', name: 'All', icon: 'fitness-center' },
        { id: 1, name: 'Chest', icon: 'fitness-center' },
        { id: 2, name: 'Back', icon: 'fitness-center' },
        { id: 3, name: 'Shoulders', icon: 'fitness-center' },
        { id: 4, name: 'Arms', icon: 'fitness-center' },
        { id: 5, name: 'Legs', icon: 'fitness-center' },
        { id: 6, name: 'Core', icon: 'fitness-center' },
        { id: 7, name: 'Cardio', icon: 'fitness-center' }
      ];
      setCategories(defaultCategories);
      Alert.alert('Error', 'Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const filterExercises = () => {
    let filteredExercises = allExercises;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filteredExercises = filteredExercises.filter(exercise => 
        exercise.name.toLowerCase().includes(searchLower) ||
        exercise.muscle_groups.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply category filter
    if (selectedCategory !== 'All') {
      const category = categories.find(cat => cat.name === selectedCategory);
      if (category && category.id !== 'all') {
        filteredExercises = filteredExercises.filter(exercise => 
          exercise.category_id === category.id
        );
      }
    }
    
    setExercises(filteredExercises);
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
      <View style={styles.categoryTabsContainer}>
        <ScrollView
          ref={categoryScrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.categoryTabs}
          contentContainerStyle={styles.categoryTabsContent}
          decelerationRate="normal"
        >
          {categories.length > 0 ? categories.map((item, index) => (
            <TouchableOpacity
              key={item.id.toString()}
              style={[
                styles.categoryTab,
                selectedCategory === item.name && styles.selectedCategoryTab
              ]}
              onPress={() => {
                console.log('📊 Category selected:', item.name);
                setSelectedCategory(item.name);
                // Auto-scroll to ensure selected tab is visible
                if (categoryScrollViewRef.current && index > 2) {
                  const scrollPosition = (index - 2) * 92; // More accurate calculation
                  categoryScrollViewRef.current.scrollTo({
                    x: scrollPosition,
                    animated: true
                  });
                }
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={item.icon || 'fitness-center'}
                size={16}
                color={selectedCategory === item.name ? '#fff' : '#007AFF'}
                style={styles.tabIcon}
              />
              <Text style={[
                styles.categoryTabText,
                selectedCategory === item.name && styles.selectedCategoryTabText
              ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )) : (
            <Text style={{ padding: 16, color: '#999' }}>No categories loaded</Text>
          )}
        </ScrollView>
      </View>

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
        presentationStyle="overFullScreen"
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
  categoryTabsContainer: {
    position: 'relative',
    height: 60,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  categoryTabs: {
    height: 60,
  },
  categoryTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingRight: 24,
    alignItems: 'center',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    minWidth: 90,
    height: 44,
  },
  selectedCategoryTab: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryTabText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedCategoryTabText: {
    color: '#fff',
  },
  tabIcon: {
    // Icon styling handled in component
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
