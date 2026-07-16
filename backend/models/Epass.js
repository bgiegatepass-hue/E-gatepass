const mongoose = require('mongoose');

const epassSchema = new mongoose.Schema({
  leaveRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveRequest', required: true, unique: true },
  passId: { type: String, required: true, unique: true },
  qrCodeUrl: { type: String },
  pdfUrl: { type: String },
  issuedAt: { type: Date, default: Date.now },
  validFrom: { type: Date, required: true },
  validTo: { type: Date, required: true },
  validUntil: { type: Date },
  scanCount: { type: Number, default: 0 },
  maxScans: { type: Number, default: 2 },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedByName: { type: String, trim: true },
  hodApprovedByName: { type: String, trim: true },
  directorApprovedByName: { type: String, trim: true },
  approvedAt: { type: Date },
  studentName: { type: String, trim: true },
  rollNumber: { type: String, trim: true },
  branch: { type: String, trim: true },
  leaveType: { type: String, trim: true },
  fromDate: { type: Date },
  toDate: { type: Date },
  purpose: { type: String, trim: true },
  locationAddress: { type: String, trim: true },
  requesterRole: { type: String, trim: true },
});

epassSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Epass', epassSchema);
