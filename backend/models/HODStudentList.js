const mongoose = require('mongoose');

// =====================================================================
// HOD Student List Model
// Stores student data uploaded by HOD via Excel sheet
// Used to validate student registration details
// =====================================================================

const hodStudentListSchema = new mongoose.Schema(
  {
    hodId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // HOD who uploaded
    department: { type: String, required: true, trim: true }, // CSE, ECE, ME, etc.
    campus: {
      type: String,
      enum: ['BIST', 'BIRT', 'BIRTS'],
      required: true,
    },
    students: [
      {
        name: { type: String, required: true, trim: true },
        enrollmentNumber: { type: String, required: true, trim: true, lowercase: true },
        phone: { type: String, required: true, trim: true },
        gmail: { type: String, required: true, trim: true, lowercase: true },
        branch: { type: String, trim: true },
        semester: { type: Number },
        isVerified: { type: Boolean, default: false }, // true once student signs up
        verifiedAt: Date,
      },
    ],
    totalStudents: { type: Number, default: 0 },
    verifiedCount: { type: Number, default: 0 },
    fileName: String,
    uploadedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for quick lookup during registration
hodStudentListSchema.index({ department: 1, campus: 1, isActive: 1 });

module.exports = mongoose.model('HODStudentList', hodStudentListSchema);
