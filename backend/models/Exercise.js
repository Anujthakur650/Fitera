const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'cardio', 'full body', 'other']
  },
  equipment: {
    type: String,
    enum: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'bands', 'kettlebell', 'other', 'none']
  },
  muscleGroups: [{
    type: String
  }],
  instructions: {
    type: String
  },
  isCustom: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for search functionality
ExerciseSchema.index({ name: 'text', category: 'text' });

const Exercise = mongoose.model('Exercise', ExerciseSchema);
module.exports = Exercise;
