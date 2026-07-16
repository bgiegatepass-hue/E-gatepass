const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String },
  purpose: { type: String },
  department: { type: String },
  personToMeet: { type: String },
  entryTime: { type: Date, default: Date.now },
  exitTime: { type: Date },
  campus: { type: String },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

visitorSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Visitor', visitorSchema);
