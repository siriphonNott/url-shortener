const mongoose = require('mongoose');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
  await migrateApiKeys();
};

async function migrateApiKeys() {
  try {
    const col = mongoose.connection.collection('apikeys');

    // Remove legacy documents that don't have the apiKey field
    const result = await col.deleteMany({ apiKey: { $exists: false } });
    if (result.deletedCount > 0) {
      console.log(`[migration] Removed ${result.deletedCount} legacy apikey document(s)`);
    }

    // Drop any legacy indexes that no longer exist in the schema
    const indexes = await col.indexes();
    const legacyIndexNames = indexes
      .filter((i) => i.key && (i.key.keyHash !== undefined || i.key.keyPrefix !== undefined || (i.key.apiKey !== undefined && !i.sparse)))
      .map((i) => i.name);

    for (const name of legacyIndexNames) {
      await col.dropIndex(name);
      console.log(`[migration] Dropped legacy index: ${name}`);
    }
  } catch (e) {
    // Collection may not exist yet — safe to ignore
  }
}

module.exports = connectDB;
