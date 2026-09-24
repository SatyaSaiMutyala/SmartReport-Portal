import mongoose from 'mongoose';

// Singleton documents: _id 'catalog' (which Studio build the catalogue came from, T&C) and
// _id 'lab' (lab identity, default signatories, LIS connector defaults). LIS secrets are not stored.
const settingSchema = new mongoose.Schema(
  {
    _id: String,
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true, versionKey: false, minimize: false },
);

export default mongoose.model('Setting', settingSchema);
