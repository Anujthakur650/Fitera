const mongoose = require('mongoose');

const SetSchema = new mongoose.Schema({
  setNumber: Number,
  reps: Number,
  weight: Number,
  isWarmup: {
    type: Boolean,
    default: false
  },
  isFailure: {
    type: Boolean,
    default: false
  },
  isDropset: {
    type: Boolean,
    default: false
  },
  restTime: Number, // in seconds
  notes: String
});

const WorkoutExerciseSchema = new mongoose.Schema({
  exercise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise',
    required: true
  },
  sets: [SetSchema],
  supersetWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise'
  },
  notes: String
});

const WorkoutSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    default: 'Workout'
  },
  routine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Routine'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  exercises: [WorkoutExerciseSchema],
  totalVolume: Number, // calculated total weight lifted
  duration: Number, // in minutes
  notes: String,
  isCompleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Calculate total volume before saving
WorkoutSchema.pre('save', function(next) {
  if (this.exercises && this.exercises.length > 0) {
    this.totalVolume = this.exercises.reduce((total, exercise) => {
      const exerciseVolume = exercise.sets.reduce((setTotal, set) => {
        return setTotal + (set.weight * set.reps);
      }, 0);
      return total + exerciseVolume;
    }, 0);
  }
  
  if (this.startTime && this.endTime) {
    this.duration = Math.round((this.endTime - this.startTime) / 60000); // Convert to minutes
  }
  
  next();
});

const Workout = mongoose.model('Workout', WorkoutSchema);
module.exports = Workout;
