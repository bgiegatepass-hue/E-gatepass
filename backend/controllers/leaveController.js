const asyncHandler = require('../utils/asyncHandler');
const LeaveRequest = require('../models/LeaveRequest');
const Epass = require('../models/Epass');
const User = require('../models/User');
const { notifyUser } = require('../services/notificationService');
const { recordAudit } = require('../services/auditService');
const { uploadBufferToFirebase } = require('../services/fileUploadService');
const { getHodDepartmentCandidates } = require('../utils/leaveRouting');

// POST /api/v1/leave/apply  (STUDENT/FACULTY)
const applyLeave = asyncHandler(async (req, res) => {
  const {
    leaveType,
    fromDate,
    toDate,
    reason,
    emergencyContact,
    purpose,
    studentName,
    enrollmentNumber,
    branch,
    semester,
    tgName,
    leaveDate,
    entryTime,
    exitTime,
    locationAddress,
  } = req.body;

  const resolvedFromDate = fromDate || leaveDate || new Date().toISOString().slice(0, 10);
  const resolvedToDate = toDate || leaveDate || resolvedFromDate;
  const resolvedReason = reason || purpose || 'No reason provided';
  const resolvedEmergencyContact = emergencyContact || req.user.phone || '';

  if (!leaveType || !resolvedFromDate || !resolvedToDate || !resolvedReason) {
    return res.status(400).json({ success: false, message: 'Leave type, dates, and reason are required' });
  }
  if (new Date(resolvedFromDate) > new Date(resolvedToDate)) {
    return res.status(400).json({ success: false, message: 'fromDate cannot be after toDate' });
  }

  let attachmentUrl = null;
  if (req.file) {
    const destPath = `epass/attachments/leave_${req.user._id}_${Date.now()}_${req.file.originalname}`;
    attachmentUrl = await uploadBufferToFirebase(req.file.buffer, destPath, req.file.mimetype);
  }

  const location = (req.body.latitude || req.body.longitude || req.body.locationAccuracy || req.body.locationTimestamp || locationAddress)
    ? {
        lat: req.body.latitude ? Number(req.body.latitude) : undefined,
        lng: req.body.longitude ? Number(req.body.longitude) : undefined,
        accuracy: req.body.locationAccuracy ? Number(req.body.locationAccuracy) : undefined,
        timestamp: req.body.locationTimestamp || undefined,
        address: locationAddress || undefined,
      }
    : undefined;

  // Match HOD by the requester's department/branch within the same campus.
  // CSE users in AIML / DATA SCIENCE / CYBER SECURITY should still route to the CSE HOD.
  const requesterBranch = branch || req.user.branch;
  const hodDeptCandidates = getHodDepartmentCandidates(req.user.department, requesterBranch);
  const assignedHod = await User.findOne({
    role: 'HOD',
    campus: req.user.campus,
    department: { $in: hodDeptCandidates.length ? hodDeptCandidates : [null] },
  });

  // Create leave and assign directly to HOD (faculty also use the same HOD-based flow)
  const leave = await LeaveRequest.create({
    student: req.user._id,
    requesterRole: req.user.role || 'STUDENT',
    leaveType: leaveType || 'Other',
    fromDate: resolvedFromDate,
    toDate: resolvedToDate,
    reason: resolvedReason,
    purpose: purpose || resolvedReason,
    studentName: studentName || req.user.name,
    enrollmentNumber: enrollmentNumber || req.user.rollNumber,
    branch: branch || req.user.branch,
    semester: semester || req.user.semester,
    tgName,
    attachmentUrl,
    emergencyContact: resolvedEmergencyContact,
    entryTime,
    exitTime,
    location,
    locationShared: Boolean(location),
    // keep faculty empty so HOD reviews directly; this supports both student and faculty leave requests
    faculty: undefined,
    hod: assignedHod?._id || undefined,
  });

  await recordAudit(req, { action: 'LEAVE_APPLIED', entityType: 'LeaveRequest', entityId: leave._id });

  // Notify HOD directly (student will also get a confirmation)
  if (assignedHod) {
    await notifyUser({
      userId: assignedHod._id,
      leaveRequestId: leave._id,
      title: 'New Leave Request for Approval',
      message: `${req.user.name} submitted a leave request and it is waiting for your review.`,
      type: 'LEAVE_SUBMITTED',
    });
  }

  await notifyUser({
    userId: req.user._id,
    leaveRequestId: leave._id,
    title: 'Leave Request Submitted',
    message: 'Your leave request has been submitted and is awaiting review.',
    type: 'LEAVE_SUBMITTED',
  });

  res.status(201).json({ success: true, data: leave.toJSON() });
});

// GET /api/v1/leave/my-requests?status=
const getMyRequests = asyncHandler(async (req, res) => {
  const status = req.query.status || 'All';
  const query = { student: req.user._id };
  if (status !== 'All') query.overallStatus = status;

  const requests = await LeaveRequest.find(query).sort({ createdAt: -1 });
  res.json({ success: true, data: requests.map((r) => r.toJSON()) });
});

// GET /api/v1/leave/history
const getHistory = asyncHandler(async (req, res) => {
  const requests = await LeaveRequest.find({ student: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: requests.map((r) => r.toJSON()) });
});

// GET /api/v1/leave/:id
const getLeaveById = asyncHandler(async (req, res) => {
  const leave = await LeaveRequest.findById(req.params.id)
    .populate('student', 'name rollNumber branch semester department phone profileImageUrl');
  if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });

  const epass = await Epass.findOne({ leaveRequest: leave._id });

  const leaveJson = leave.toJSON();
  if (leave.student) {
    leaveJson.studentName = leave.student.name;
    leaveJson.rollNumber = leave.student.rollNumber;
  }

  res.json({ success: true, data: { ...leaveJson, epass: epass ? epass.toJSON() : null } });
});

module.exports = { applyLeave, getMyRequests, getHistory, getLeaveById };
