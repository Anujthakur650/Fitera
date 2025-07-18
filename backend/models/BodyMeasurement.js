const mongoose = require('mongoose');

const BodyMeasurementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  weight: Number,
  chest: Number,
  waist: Number,
  hips: Number,
  arm: Number,
  thigh: Number,
  calf: Number
}, { timestamps: true });

const BodyMeasurement = mongoose.model('BodyMeasurement', BodyMeasurementSchema);
module.exports = BodyMeasurement;
