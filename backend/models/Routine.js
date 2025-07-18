const mongoose = require('mongoose');

const RoutineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  exercises: [{
    exercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise'
    },
    sets: Number,
    reps: Number,
    weight: Number
  }],
  isPublic: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const Routine = mongoose.model('Routine', RoutineSchema);
module.exports = Routine;
