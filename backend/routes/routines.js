const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const Routine = require('../models/Routine');

// @route   GET /api/routines
// @desc    Get all routines for current user
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const routines = await Routine.find({ user: req.user.id }).populate('exercises.exercise');
    res.json(routines);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/routines
// @desc    Create a new routine
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, exercises } = req.body;

    const routine = new Routine({
      user: req.user.id,
      name,
      exercises
    });

    await routine.save();
    res.status(201).json({ message: 'Routine created successfully', routine });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
