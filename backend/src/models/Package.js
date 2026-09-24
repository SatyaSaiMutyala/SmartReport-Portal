import mongoose from 'mongoose';

const packageParamSchema = new mongoose.Schema(
  {
    id: { type: String, ref: 'Parameter', required: true }, // TLP id
    profile: String,
    addon: Boolean, // part of an optional add-on module
    cl: String, // cluster this parameter reports under in this package
    ovr: String, // why cl differs from the parameter's home cluster in this package
  },
  { _id: false },
);

const packageClusterSchema = new mongoose.Schema(
  {
    cl: { type: String, ref: 'Cluster', required: true },
    order: Number,
    lead: Boolean,
    n: Number, // parameters in this cluster
  },
  { _id: false },
);

// A catalogue package (e.g. TRUST ELITE TOTAL HEALTH 360). _id is the catalogue name, which
// pattern rules and LIS payloads refer to.
const packageSchema = new mongoose.Schema(
  {
    _id: String, // catalogue package name
    slug: { type: String, required: true, unique: true },
    group: { type: String, index: true },
    q: String, // one-line coverage description
    nparams: Number,
    assays: Number,
    profiles: [String],
    addons: [String],
    params: [packageParamSchema],
    clusters: [packageClusterSchema],
  },
  { timestamps: true, versionKey: false },
);

packageSchema.virtual('name').get(function () {
  return this._id;
});
packageSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Package', packageSchema);
