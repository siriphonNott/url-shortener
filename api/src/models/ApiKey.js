const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  keyName: { type: String, required: true, trim: true },
  apiKey: { type: String, required: true },
  scopes: { type: mongoose.Schema.Types.Mixed, default: { links: 'read', stats: 'read' } },
  status: { type: String, enum: ['active', 'inactive', 'expired', 'revoked'], default: 'active' },
  expiresAt: { type: Date, default: null },
  lastUsedAt: { type: Date, default: null },
  isPersonal: { type: Boolean, default: false },
}, { timestamps: true });

apiKeySchema.index({ apiKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('ApiKey', apiKeySchema);
