const mongoose = require('mongoose');

const redirectLogSchema = new mongoose.Schema({
  link: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
  ip: String,
  userAgent: String,
  referer: String,
}, { timestamps: true });

module.exports = mongoose.model('RedirectLog', redirectLogSchema);
