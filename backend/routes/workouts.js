const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const Workout = require('../models/Workout');

// @route   GET /api/workouts
// @desc    Get all workouts for current user
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user.id }).populate('exercises.exercise');
    res.json(workouts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/workouts
// @desc    Create a new workout
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, exercises } = req.body;

    const workout = new Workout({
      user: req.user.id,
      name,
      exercises
    });

    await workout.save();
    res.status(201).json({ message: 'Workout created successfully', workout });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
