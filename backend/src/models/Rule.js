import mongoose from 'mongoose';

const condSchema = new mongoose.Schema(
  {
    p: { type: String, ref: 'Parameter', required: true }, // TLP id
    bands: [{ type: String, enum: ['lo', 'blo', 'n', 'bhi', 'hi'] }], // matches when the result falls in any of these
  },
  { _id: false },
);

// A cross-system pattern rule for the Integrated Read ("Putting it together")
const ruleSchema = new mongoose.Schema(
  {
    _id: String, // R01…
    pattern: { type: String, required: true },
    pri: { type: Number, index: true }, // 1 = highest priority
    clusters: [String], // every listed cluster must have reported values for the rule to fire
    logic: { type: String, enum: ['all', 'any', 'special'], required: true },
    n: { type: Number, default: null }, // for "any": minimum conditions that must match
    special: { type: String, default: null }, // all_normal | single_borderline
    conds: [condSchema],
    lead: String,
    text: String,
    next: String, // suggested next step
    packages: { type: [String], index: true }, // catalogue package names; empty = all packages
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model('Rule', ruleSchema);
