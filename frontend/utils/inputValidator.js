import { Alert } from 'react-native';

/**
 * Input Validation and Sanitization Manager
 * Prevents SQLite injection and ensures data integrity
 */
class InputValidator {
  constructor() {
    // Define validation patterns
    this.patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      username: /^[a-zA-Z0-9_-]{3,20}$/,
      exerciseName: /^[a-zA-Z0-9\s\-_()]{1,50}$/,
      workoutName: /^[a-zA-Z0-9\s\-_()]{1,100}$/,
      numericValue: /^\d+(\.\d{1,2})?$/,
      phoneNumber: /^\+?[\d\s\-()]{10,}$/,
    };

    // Define dangerous SQL keywords and patterns
    this.sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(--|\/\*|\*\/|;|'|"|`)/gi,
      /(\b(NULL|TRUE|FALSE)\b)/gi,
      /(CHAR|ASCII|SUBSTRING|CONCAT)/gi,
    ];

    // Define XSS patterns
    this.xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];
  }

  /**
   * Sanitize input to prevent SQL injection
   */
  sanitizeForSQL(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // Remove potential SQL injection patterns
    let sanitized = input;
    
    // Escape single quotes
    sanitized = sanitized.replace(/'/g, "''");
    
    // Remove SQL comments
    sanitized = sanitized.replace(/--.*$/gm, '');
    sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove semicolons at the end
    sanitized = sanitized.replace(/;\s*$/, '');
    
    return sanitized.trim();
  }

  /**
   * Check for SQL injection patterns
   */
  containsSQLInjection(input) {
    if (typeof input !== 'string') {
      return false;
    }

    const upperInput = input.toUpperCase();
    
    return this.sqlInjectionPatterns.some(pattern => pattern.test(upperInput));
  }

  /**
   * Check for XSS patterns
   */
  containsXSS(input) {
    if (typeof input !== 'string') {
      return false;
    }

    return this.xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Validate and sanitize workout data
   */
  validateWorkoutData(workoutData) {
    const errors = [];
    const sanitized = {};

    try {
      // Validate workout name
      if (!workoutData.name || typeof workoutData.name !== 'string') {
        errors.push('Workout name is required');
      } else if (this.containsSQLInjection(workoutData.name)) {
        errors.push('Workout name contains invalid characters');
      } else if (!this.patterns.workoutName.test(workoutData.name)) {
        errors.push('Workout name must be 1-100 characters, letters, numbers, spaces, hyphens, underscores, and parentheses only');
      } else {
        sanitized.name = this.sanitizeForSQL(workoutData.name);
      }

      // Validate notes
      if (workoutData.notes) {
        if (this.containsSQLInjection(workoutData.notes) || this.containsXSS(workoutData.notes)) {
          errors.push('Workout notes contain invalid characters');
        } else if (workoutData.notes.length > 1000) {
          errors.push('Workout notes must be less than 1000 characters');
        } else {
          sanitized.notes = this.sanitizeForSQL(workoutData.notes);
        }
      }

      // Validate duration
      if (workoutData.duration !== undefined) {
        const duration = parseInt(workoutData.duration);
        if (isNaN(duration) || duration < 0 || duration > 86400) { // Max 24 hours
          errors.push('Workout duration must be between 0 and 86400 seconds');
        } else {
          sanitized.duration = duration;
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData: sanitized
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation error occurred'],
        sanitizedData: {}
      };
    }
  }

  /**
   * Validate and sanitize exercise data
   */
  validateExerciseData(exerciseData) {
    const errors = [];
    const sanitized = {};

    try {
      // Validate exercise name
      if (!exerciseData.name || typeof exerciseData.name !== 'string') {
        errors.push('Exercise name is required');
      } else if (this.containsSQLInjection(exerciseData.name)) {
        errors.push('Exercise name contains invalid characters');
      } else if (!this.patterns.exerciseName.test(exerciseData.name)) {
        errors.push('Exercise name must be 1-50 characters, letters, numbers, spaces, hyphens, underscores, and parentheses only');
      } else {
        sanitized.name = this.sanitizeForSQL(exerciseData.name);
      }

      // Validate category_id
      if (exerciseData.category_id !== undefined) {
        const categoryId = parseInt(exerciseData.category_id);
        if (isNaN(categoryId) || categoryId < 1) {
          errors.push('Valid exercise category is required');
        } else {
          sanitized.category_id = categoryId;
        }
      }

      // Validate muscle_groups
      if (exerciseData.muscle_groups) {
        if (this.containsSQLInjection(exerciseData.muscle_groups)) {
          errors.push('Muscle groups contain invalid characters');
        } else if (exerciseData.muscle_groups.length > 200) {
          errors.push('Muscle groups must be less than 200 characters');
        } else {
          sanitized.muscle_groups = this.sanitizeForSQL(exerciseData.muscle_groups);
        }
      }

      // Validate instructions
      if (exerciseData.instructions) {
        if (this.containsSQLInjection(exerciseData.instructions) || this.containsXSS(exerciseData.instructions)) {
          errors.push('Exercise instructions contain invalid characters');
        } else if (exerciseData.instructions.length > 2000) {
          errors.push('Exercise instructions must be less than 2000 characters');
        } else {
          sanitized.instructions = this.sanitizeForSQL(exerciseData.instructions);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData: sanitized
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation error occurred'],
        sanitizedData: {}
      };
    }
  }

  /**
   * Validate and sanitize set data
   */
  validateSetData(setData) {
    const errors = [];
    const sanitized = {};

    try {
      // Validate workout_exercise_id
      if (setData.workout_exercise_id !== undefined) {
        const id = parseInt(setData.workout_exercise_id);
        if (isNaN(id) || id < 1) {
          errors.push('Valid workout exercise ID is required');
        } else {
          sanitized.workout_exercise_id = id;
        }
      }

      // Validate weight
      if (setData.weight !== undefined) {
        const weight = parseFloat(setData.weight);
        if (isNaN(weight) || weight < 0 || weight > 10000) { // Max 10,000 lbs/kg
          errors.push('Weight must be between 0 and 10,000');
        } else {
          sanitized.weight = Math.round(weight * 100) / 100; // Round to 2 decimal places
        }
      }

      // Validate reps
      if (setData.reps !== undefined) {
        const reps = parseInt(setData.reps);
        if (isNaN(reps) || reps < 0 || reps > 1000) { // Max 1000 reps
          errors.push('Reps must be between 0 and 1000');
        } else {
          sanitized.reps = reps;
        }
      }

      // Validate duration
      if (setData.duration !== undefined) {
        const duration = parseInt(setData.duration);
        if (isNaN(duration) || duration < 0 || duration > 3600) { // Max 1 hour per set
          errors.push('Set duration must be between 0 and 3600 seconds');
        } else {
          sanitized.duration = duration;
        }
      }

      // Validate distance
      if (setData.distance !== undefined) {
        const distance = parseFloat(setData.distance);
        if (isNaN(distance) || distance < 0 || distance > 1000) { // Max 1000 km/miles
          errors.push('Distance must be between 0 and 1000');
        } else {
          sanitized.distance = Math.round(distance * 100) / 100;
        }
      }

      // Validate notes
      if (setData.notes) {
        if (this.containsSQLInjection(setData.notes) || this.containsXSS(setData.notes)) {
          errors.push('Set notes contain invalid characters');
        } else if (setData.notes.length > 500) {
          errors.push('Set notes must be less than 500 characters');
        } else {
          sanitized.notes = this.sanitizeForSQL(setData.notes);
        }
      }

      // Validate boolean flags
      ['is_completed', 'is_warmup'].forEach(field => {
        if (setData[field] !== undefined) {
          sanitized[field] = Boolean(setData[field]);
        }
      });

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData: sanitized
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation error occurred'],
        sanitizedData: {}
      };
    }
  }

  /**
   * Validate and sanitize user profile data
   */
  validateUserData(userData) {
    const errors = [];
    const sanitized = {};

    try {
      // Validate name
      if (userData.name) {
        if (this.containsSQLInjection(userData.name) || this.containsXSS(userData.name)) {
          errors.push('Name contains invalid characters');
        } else if (userData.name.length < 1 || userData.name.length > 100) {
          errors.push('Name must be between 1 and 100 characters');
        } else {
          sanitized.name = this.sanitizeForSQL(userData.name);
        }
      }

      // Validate email
      if (userData.email) {
        if (!this.patterns.email.test(userData.email)) {
          errors.push('Invalid email format');
        } else if (this.containsSQLInjection(userData.email)) {
          errors.push('Email contains invalid characters');
        } else {
          sanitized.email = userData.email.toLowerCase().trim();
        }
      }

      // Validate weight
      if (userData.weight !== undefined) {
        const weight = parseFloat(userData.weight);
        if (isNaN(weight) || weight < 20 || weight > 1000) { // 20-1000 lbs/kg
          errors.push('Weight must be between 20 and 1000');
        } else {
          sanitized.weight = Math.round(weight * 10) / 10; // Round to 1 decimal
        }
      }

      // Validate height
      if (userData.height !== undefined) {
        const height = parseFloat(userData.height);
        if (isNaN(height) || height < 50 || height > 300) { // 50-300 cm
          errors.push('Height must be between 50 and 300 cm');
        } else {
          sanitized.height = Math.round(height * 10) / 10; // Round to 1 decimal
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData: sanitized
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation error occurred'],
        sanitizedData: {}
      };
    }
  }

  /**
   * Validate body measurement data
   */
  validateBodyMeasurement(measurementData) {
    const errors = [];
    const sanitized = {};

    try {
      // Validate measurement type
      const validTypes = ['weight', 'body_fat', 'muscle_mass', 'chest', 'waist', 'hips', 'arm', 'thigh', 'neck'];
      if (!measurementData.type || !validTypes.includes(measurementData.type)) {
        errors.push('Valid measurement type is required');
      } else {
        sanitized.type = measurementData.type;
      }

      // Validate value
      if (measurementData.value !== undefined) {
        const value = parseFloat(measurementData.value);
        if (isNaN(value) || value < 0 || value > 1000) {
          errors.push('Measurement value must be between 0 and 1000');
        } else {
          sanitized.value = Math.round(value * 100) / 100;
        }
      }

      // Validate unit
      const validUnits = ['kg', 'lbs', 'cm', 'in', '%', 'mm'];
      if (measurementData.unit && !validUnits.includes(measurementData.unit)) {
        errors.push('Invalid measurement unit');
      } else if (measurementData.unit) {
        sanitized.unit = measurementData.unit;
      }

      // Validate notes
      if (measurementData.notes) {
        if (this.containsSQLInjection(measurementData.notes) || this.containsXSS(measurementData.notes)) {
          errors.push('Measurement notes contain invalid characters');
        } else if (measurementData.notes.length > 500) {
          errors.push('Measurement notes must be less than 500 characters');
        } else {
          sanitized.notes = this.sanitizeForSQL(measurementData.notes);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData: sanitized
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation error occurred'],
        sanitizedData: {}
      };
    }
  }

  /**
   * Validate search queries to prevent injection
   */
  validateSearchQuery(query) {
    if (!query || typeof query !== 'string') {
      return {
        isValid: false,
        error: 'Search query is required',
        sanitizedQuery: ''
      };
    }

    if (this.containsSQLInjection(query)) {
      return {
        isValid: false,
        error: 'Search query contains invalid characters',
        sanitizedQuery: ''
      };
    }

    if (query.length > 100) {
      return {
        isValid: false,
        error: 'Search query must be less than 100 characters',
        sanitizedQuery: ''
      };
    }

    return {
      isValid: true,
      error: null,
      sanitizedQuery: this.sanitizeForSQL(query.trim())
    };
  }

  /**
   * Validate ID parameters
   */
  validateId(id, fieldName = 'ID') {
    const numericId = parseInt(id);
    
    if (isNaN(numericId) || numericId < 1) {
      return {
        isValid: false,
        error: `${fieldName} must be a positive integer`,
        sanitizedId: null
      };
    }

    if (numericId > 2147483647) { // SQLite INTEGER max
      return {
        isValid: false,
        error: `${fieldName} is too large`,
        sanitizedId: null
      };
    }

    return {
      isValid: true,
      error: null,
      sanitizedId: numericId
    };
  }

  /**
   * Comprehensive validation for any data object
   */
  validateData(data, dataType) {
    switch (dataType) {
      case 'workout':
        return this.validateWorkoutData(data);
      case 'exercise':
        return this.validateExerciseData(data);
      case 'set':
        return this.validateSetData(data);
      case 'user':
        return this.validateUserData(data);
      case 'measurement':
        return this.validateBodyMeasurement(data);
      default:
        return {
          isValid: false,
          errors: ['Unknown data type'],
          sanitizedData: {}
        };
    }
  }

  /**
   * Show validation errors to user
   */
  showValidationErrors(errors) {
    if (errors && errors.length > 0) {
      Alert.alert(
        'Validation Error',
        errors.join('\n'),
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Validate and sanitize data with automatic error display
   */
  async validateAndSanitize(data, dataType, showErrors = true) {
    const result = this.validateData(data, dataType);
    
    if (!result.isValid && showErrors) {
      this.showValidationErrors(result.errors);
    }

    return result;
  }

  /**
   * Batch validate multiple data objects
   */
  batchValidate(dataArray, dataType) {
    const results = [];
    let allValid = true;
    const allErrors = [];

    for (const data of dataArray) {
      const result = this.validateData(data, dataType);
      results.push(result);
      
      if (!result.isValid) {
        allValid = false;
        allErrors.push(...result.errors);
      }
    }

    return {
      isValid: allValid,
      errors: allErrors,
      results
    };
  }

  /**
   * Clean and prepare data for database insertion
   */
  prepareForDatabase(data, dataType) {
    const validation = this.validateData(data, dataType);
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    return validation.sanitizedData;
  }
}

export default new InputValidator(); 