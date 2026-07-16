const asyncHandler = require('../utils/asyncHandler');
const Epass = require('../models/Epass');
const LeaveRequest = require('../models/LeaveRequest');
const generatePassId = require('../utils/generatePassId');

/**
 * Core e-pass issuance logic — called internally by hodController.approveRequest.
 * This version stores only pass details and a passId, without uploading QR/PDF files.
 */
async function issueEpass(leave) {
  const leaveDoc = await LeaveRequest.findById(leave._id)
    .populate('student', 'name rollNumber branch semester department campus')
    .populate('hod', 'name role')
    .populate('director', 'name role');

  const existing = await Epass.findOne({ leaveRequest: leaveDoc._id });
  const passId = existing?.passId || generatePassId();
  const approvedBy = leaveDoc.director || leaveDoc.hod || null;
  const approvedAt = leaveDoc.directorReviewedAt || leaveDoc.hodReviewedAt || new Date();
  const validUntil = new Date(approvedAt.getTime() + 3 * 60 * 60 * 1000); // 3 hours validity from approval

  const hodApprovedByName = leaveDoc.hod?.name
    ? `HOD: ${leaveDoc.hod.name}${leaveDoc.hod.role ? ` (${leaveDoc.hod.role})` : ''}`
    : '';
  const directorApprovedByName = leaveDoc.director?.name
    ? `Director: ${leaveDoc.director.name}${leaveDoc.director.role ? ` (${leaveDoc.director.role})` : ''}`
    : '';
  const approvalSummary = [hodApprovedByName, directorApprovedByName].filter(Boolean).join(' • ') || (leaveDoc.student?.name || 'Approver');

  const epassData = {
    leaveRequest: leaveDoc._id,
    passId,
    qrCodeUrl: existing?.qrCodeUrl,
    pdfUrl: existing?.pdfUrl,
    validFrom: leaveDoc.fromDate,
    validTo: leaveDoc.toDate,
    validUntil,
    scanCount: existing?.scanCount || 0,
    maxScans: existing?.maxScans || 2,
    approvedBy: approvedBy?._id || undefined,
    approvedByName: approvalSummary,
    hodApprovedByName,
    directorApprovedByName,
    approvedAt,
    studentName: leaveDoc.student?.name || leaveDoc.studentName || '',
    rollNumber: leaveDoc.student?.rollNumber || leaveDoc.enrollmentNumber || '',
    branch: leaveDoc.student?.branch || leaveDoc.branch || '',
    leaveType: leaveDoc.leaveType,
    fromDate: leaveDoc.fromDate,
    toDate: leaveDoc.toDate,
    purpose: leaveDoc.reason || leaveDoc.purpose || '',
    locationAddress: leaveDoc.location?.address || '',
    requesterRole: leaveDoc.requesterRole || leaveDoc.requester_role || 'STUDENT',
  };

  if (existing) {
    Object.assign(existing, epassData);
    await existing.save();
    return existing;
  }

  return Epass.create(epassData);
}

// GET /api/v1/epass/:leaveRequestId
const getEpass = asyncHandler(async (req, res) => {
  const leave = await LeaveRequest.findById(req.params.leaveRequestId).populate('student', 'name rollNumber branch semester department');
  if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });

  if (leave.overallStatus !== 'Approved') {
    return res.status(404).json({ success: false, message: 'E-Pass not available — leave not yet fully approved' });
  }

  const epass = await Epass.findOne({ leaveRequest: leave._id });
  if (!epass) return res.status(404).json({ success: false, message: 'E-Pass not found' });

  const payload = epass.toJSON();
  res.json({
    success: true,
    data: {
      ...payload,
      pass_id: payload.passId,
      qr_code_url: payload.qrCodeUrl,
      pdf_url: payload.pdfUrl,
      valid_from: payload.validFrom,
      valid_to: payload.validTo,
      approved_by_name: payload.approvedByName,
      hod_approved_by_name: payload.hodApprovedByName,
      director_approved_by_name: payload.directorApprovedByName,
      approved_at: payload.approvedAt,
      student_name: payload.studentName,
      roll_number: payload.rollNumber,
      leave_type: payload.leaveType,
      from_date: payload.fromDate,
      to_date: payload.toDate,
      location_address: payload.locationAddress,
      leave_request: {
        id: leave._id.toString(),
        purpose: leave.reason || leave.purpose || '',
        student_name: leave.studentName || leave.student?.name || '',
        roll_number: leave.enrollmentNumber || leave.student?.rollNumber || '',
        branch: leave.branch || leave.student?.branch || '',
        semester: leave.semester || leave.student?.semester || '',
        from_date: leave.fromDate,
        to_date: leave.toDate,
        leave_type: leave.leaveType,
        location: leave.location || null,
        entry_time: leave.entryTime || leave.entry_time || null,
        exit_time: leave.exitTime || leave.exit_time || null,
        entryTime: leave.entryTime || leave.entry_time || null,
        exitTime: leave.exitTime || leave.exit_time || null,
        requester_role: leave.requesterRole || leave.requester_role || 'STUDENT',
      },
    },
  });
});

// GET /api/v1/epass/:leaveRequestId/download
const downloadEpass = asyncHandler(async (req, res) => {
  const epass = await Epass.findOne({ leaveRequest: req.params.leaveRequestId });
  if (!epass) return res.status(404).json({ success: false, message: 'E-Pass not found' });
  if (!epass.pdfUrl) return res.status(404).json({ success: false, message: 'Download not available for this E-Pass' });
  res.redirect(epass.pdfUrl);
});

function isWithinValidity(epass) {
  const now = new Date();
  if (epass.validUntil) {
    return now <= new Date(epass.validUntil);
  }
  if (!epass.approvedAt) return false;
  const expiry = new Date(epass.approvedAt);
  expiry.setHours(expiry.getHours() + 3);
  return now <= expiry;
}

// GET /api/v1/epass/verify/:passId — public, no auth — used by the QR code itself
const verifyEpass = asyncHandler(async (req, res) => {
  const epass = await Epass.findOne({ passId: req.params.passId });
  if (!epass) return res.status(404).json({ success: false, message: 'Invalid or unknown pass' });

  const leave = await LeaveRequest.findById(epass.leaveRequest).populate('student', 'name rollNumber branch profileImageUrl');

  res.json({
    success: true,
    data: {
      passId: epass.passId,
      isCurrentlyValid: isWithinValidity(epass),
      studentName: leave?.student?.name,
      rollNumber: leave?.student?.rollNumber,
      branch: leave?.student?.branch,
      studentPhoto: leave?.student?.profileImageUrl,
      leaveType: leave?.leaveType,
      validFrom: epass.validFrom,
      validTo: epass.validTo,
    },
  });
});

module.exports = { issueEpass, getEpass, downloadEpass, verifyEpass, isWithinValidity };
