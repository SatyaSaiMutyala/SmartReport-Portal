import mongoose from 'mongoose';

// A body system that parameters are grouped under on the report (BLOOD, SUGAR, HEART, …)
const clusterSchema = new mongoose.Schema(
  {
    _id: String, // cluster id, e.g. BLOOD
    order: Number,
    name: { type: String, required: true },
    caption: String,
    // System narrative chosen by cluster status
    story: {
      optimal: String,
      borderline: String,
      attention: String,
    },
    rule: String, // how the cluster status is derived
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model('Cluster', clusterSchema);
