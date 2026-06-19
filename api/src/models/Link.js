const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  destinationUrl: { type: String, required: true },
  title: { type: String, trim: true },
  description: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  clickCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Link', linkSchema);
