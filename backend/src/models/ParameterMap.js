import mongoose from 'mongoose';

// Manual LIMS observation name → TLP parameter mapping, for names the automatic matcher
// (catalogue name / aliases) cannot resolve. tlp = null marks a LIMS name as deliberately
// not interpreted (e.g. a remark line), so it stops showing up as unmapped.
const parameterMapSchema = new mongoose.Schema(
  {
    _id: String, // normalised LIMS name (see engine norm())
    limsName: { type: String, required: true },
    tlp: { type: String, ref: 'Parameter', default: null },
    note: String,
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model('ParameterMap', parameterMapSchema);
