import mongoose from 'mongoose';

// Per-band text keyed by band code: lo · blo · n · bhi · hi (null where the band does not exist)
const byBand = {
  lo: { type: String, default: null },
  blo: { type: String, default: null },
  n: { type: String, default: null },
  bhi: { type: String, default: null },
  hi: { type: String, default: null },
};

const bandSchema = new mongoose.Schema(
  {
    b: { type: String, enum: ['lo', 'blo', 'n', 'bhi', 'hi'], required: true },
    label: String,
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    text: String,
  },
  { _id: false },
);

// One interpretable test parameter (TLP-###) from the Smart Report interpretation database
const parameterSchema = new mongoose.Schema(
  {
    _id: { type: String, match: /^TLP-\d{3}$/ }, // TLP id
    name: { type: String, required: true, index: true },
    dn: String, // display name with plain-language gloss
    alias: String, // comma-separated alternative names used to resolve LIS test names
    profile: String,
    cl: { type: String, ref: 'Cluster', index: true }, // body-system cluster
    unit: { type: String, default: null },
    sample: String,
    type: { type: String, enum: ['numeric', 'ratio', 'score', 'qualitative', 'descriptive'] },
    sex: Boolean, // true → bands are sex-specific (bands.male / bands.female)
    calc: Boolean, // calculated rather than measured
    meas: String, // what it measures
    sig: String, // significance
    ind: String, // what abnormal values indicate
    rng: { ...byBand }, // human-readable range per band
    fy: { ...byBand }, // "Current test result" patient text per band
    notes: String,
    src: String, // guideline / reference basis
    retest: String, // re-test guidance; the auto re-test schedule parses its interval
    review: { type: Boolean, index: true }, // cut-off must be validated against lab intervals before go-live
    bands: {
      any: { type: [bandSchema], default: undefined },
      male: { type: [bandSchema], default: undefined },
      female: { type: [bandSchema], default: undefined },
    },
  },
  { timestamps: true, versionKey: false },
);

parameterSchema.virtual('id').get(function () {
  return this._id;
});
parameterSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Parameter', parameterSchema);
