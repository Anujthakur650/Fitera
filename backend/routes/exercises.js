const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const Exercise = require('../models/Exercise');

// @route   GET /api/exercises
// @desc    Get all exercises
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const exercises = await Exercise.find();
    res.json(exercises);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/exercises
// @desc    Add a new exercise
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, category, equipment, muscleGroups, instructions, isPublic } = req.body;

    const exercise = new Exercise({
      name,
      category,
      equipment,
      muscleGroups,
      instructions,
      createdBy: req.user.id,
      isPublic
    });

    await exercise.save();
    res.status(201).json({ message: 'Exercise created successfully', exercise });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
