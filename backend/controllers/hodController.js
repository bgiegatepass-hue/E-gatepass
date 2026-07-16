const asyncHandler = require('../utils/asyncHandler');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const { notifyUser } = require('../services/notificationService');
const { recordAudit } = require('../services/auditService');
const { issueEpass } = require('./epassController');
const { sendAccountApprovedEmail } = require('../services/emailService');

function toHodJson(leave) {
  const json = leave.toJSON();
  if (leave.student && leave.student.name) {
    json.studentName = leave.studentName || leave.student.name;
    json.rollNumber = leave.enrollmentNumber || leave.student.rollNumber;
    json.enrollmentNumber = leave.enrollmentNumber || leave.student.rollNumber;
    json.branch = leave.branch || leave.student.branch;
    json.semester = leave.semester || leave.student.semester;
  } else {
    json.studentName = leave.studentName || '';
    json.rollNumber = leave.enrollmentNumber || '';
    json.enrollmentNumber = leave.enrollmentNumber || '';
    json.branch = leave.branch || '';
    json.semester = leave.semester || '';
  }
  json.tgName = leave.tgName || '';
  json.purpose = leave.purpose || leave.reason || '';
  json.location = leave.location || null;
  return json;
}

function getHodRoutingConditions(department, branch) {
  const conditions = [];
  const add = (value) => {
    if (!value) return;
    const normalized = String(value).trim();
    if (normalized && !conditions.includes(normalized)) conditions.push(normalized);
  };

  add(department);
  add(branch);

  const upperDepartment = String(department || '').trim().toUpperCase();
  const upperBranch = String(branch || '').trim().toUpperCase();
  if (upperDepartment === 'CSE' && ['AIML', 'DATA SCIENCE', 'CYBER SECURITY'].includes(upperBranch)) {
    add('CSE');
  }

  return conditions;
}

// GET /api/v1/hod/requests?status=Pending
const getRequests = asyncHandler(async (req, res) => {
  const status = req.query.status || 'Pending';

  // Use aggregation to return requests that are either explicitly assigned to this HOD
  // OR are unassigned but belong to students in this HOD's department (so HOD can pick them up).
  const matchOr = [ { hod: req.user._id } ];
  matchOr.push({ hod: { $exists: false } });

  const matchStage = { $match: { $or: matchOr } };
  if (status !== 'All') matchStage.$match.hodStatus = status;

  const routingConditions = getHodRoutingConditions(req.user.department, req.user.branch);
  const deptMatchConditions = [
    { 'requesterDoc.department': req.user.department },
    { 'requesterDoc.branch': req.user.department },
  ];
  if (routingConditions.includes('CSE')) {
    deptMatchConditions.push({ 'requesterDoc.branch': { $in: ['AIML', 'DATA SCIENCE', 'CYBER SECURITY'] } });
  }

  const agg = await LeaveRequest.aggregate([
    { $lookup: { from: 'users', localField: 'student', foreignField: '_id', as: 'requesterDoc' } },
    { $unwind: '$requesterDoc' },
    matchStage,
    // Include requests explicitly assigned to this HOD and unassigned requests from the same department/branch
    { $match: { $or: [
      { hod: req.user._id },
      { $and: [ { hod: { $exists: false } }, { $or: deptMatchConditions } ] }
    ] } },
    { $sort: { appliedOn: -1 } },
  ]);

  // Map aggregation results to the HOD JSON shape
  const results = agg.map((leave) => {
    const json = Object.assign({}, leave);
    json.id = String(leave._id);
    json.student = leave.requesterDoc || null;
    json.studentName = leave.studentName || (leave.requesterDoc && leave.requesterDoc.name) || '';
    json.rollNumber = leave.enrollmentNumber || (leave.requesterDoc && leave.requesterDoc.rollNumber) || '';
    json.enrollmentNumber = json.rollNumber;
    json.branch = leave.branch || (leave.requesterDoc && leave.requesterDoc.branch) || '';
    json.semester = leave.semester || (leave.requesterDoc && leave.requesterDoc.semester) || '';
    json.tgName = leave.tgName || '';
    json.purpose = leave.purpose || leave.reason || '';
    json.location = leave.location || null;
    return json;
  });

  res.json({ success: true, data: results });
});

// GET /api/v1/hod/members/:id — fetch single member (scoped to HOD campus)
const getMemberById = asyncHandler(async (req, res) => {
  const member = await User.findById(req.params.id);
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
  if (member.campus && member.campus !== req.user.campus) {
    return res.status(403).json({ success: false, message: 'This member belongs to a different campus' });
  }
  res.json({ success: true, data: member.toJSON() });
});

// GET /api/v1/hod/requests/:id
const getRequestById = asyncHandler(async (req, res) => {
  const leave = await LeaveRequest.findById(req.params.id)
    .populate('student', 'name rollNumber branch semester department phone profileImageUrl');
  if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
  res.json({ success: true, data: toHodJson(leave) });
});

// GET /api/v1/hod/members?role=&search=&department=&college=&page=&limit=
const getMembers = asyncHandler(async (req, res) => {
  const role = (req.query.role || 'STUDENT').toUpperCase();
  const allowedRoles = ['STUDENT', 'FACULTY', 'GUARD'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid member role' });
  }

  const { search, department, college, page = 1, limit = 50 } = req.query;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(200, Number(limit) || 50);
  const skip = (pageNum - 1) * limitNum;

  const query = { role };
  const andConditions = [
    // Allow users that match HOD's campus OR users missing campus (so existing records without campus are still visible)
    { $or: [{ campus: req.user.campus }, { campus: { $exists: false } }, { campus: null }] },
  ];

  if (department) {
    const upperDept = String(department).trim().toUpperCase();
    if (upperDept === 'CSE') {
      // CSE department also covers its specialization branches — a student
      // may have department='CSE' with branch='AIML'/'DATA SCIENCE'/'CYBER SECURITY',
      // or (for older records) may have the branch name stored directly in department.
      andConditions.push({
        $or: [
          { department: { $regex: '^CSE$', $options: 'i' } },
          { branch: { $in: ['AIML', 'DATA SCIENCE', 'CYBER SECURITY', 'CSE'] } },
        ],
      });
    } else {
      andConditions.push({ department });
    }
  }
  if (college) andConditions.push({ college });
  if (search) {
    const re = new RegExp(search.trim(), 'i');
    andConditions.push({ $or: [{ name: re }, { email: re }, { rollNumber: re }] });
  }

  query.$and = andConditions;

  const [members, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    User.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: members.map((m) => m.toJSON()),
    meta: { total, page: pageNum, limit: limitNum },
  });
});

// GET /api/v1/hod/faculty/pending — pending self-registered faculty accounts for HOD approval
const getPendingFaculty = asyncHandler(async (req, res) => {
  const pendingFaculty = await User.find({ role: 'FACULTY', isActive: false, addedBy: { $exists: false }, campus: req.user.campus })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: pendingFaculty || [] });
});

// PUT /api/v1/hod/faculty/:id/approve — approve pending faculty
const approveFaculty = asyncHandler(async (req, res) => {
  const faculty = await User.findById(req.params.id);
  if (!faculty || faculty.role !== 'FACULTY' || faculty.isActive || faculty.addedBy || faculty.campus !== req.user.campus) {
    return res.status(404).json({ success: false, message: 'Pending Faculty not found' });
  }

  faculty.isActive = true;
  await faculty.save();
  await recordAudit(req, { action: 'FACULTY_APPROVED_BY_HOD', entityType: 'User', entityId: faculty._id, details: { email: faculty.email, campus: faculty.campus } });
  try {
    await sendAccountApprovedEmail({
      toEmail: faculty.email,
      toName: faculty.name,
      loginUrl: process.env.CLIENT_BASE_URL ? `${process.env.CLIENT_BASE_URL}/login` : undefined,
    });
  } catch (emailErr) {
    console.error('Failed to send approval email for Faculty:', emailErr.message);
  }

  res.json({ success: true, message: 'Faculty approved', data: faculty.toJSON() });
});

// PUT /api/v1/hod/faculty/:id/reject — reject pending faculty
const rejectFaculty = asyncHandler(async (req, res) => {
  const { remark } = req.body;
  const faculty = await User.findById(req.params.id);
  if (!faculty || faculty.role !== 'FACULTY' || faculty.isActive || faculty.addedBy || faculty.campus !== req.user.campus) {
    return res.status(404).json({ success: false, message: 'Pending Faculty not found' });
  }

  await recordAudit(req, { action: 'FACULTY_REJECTED_BY_HOD', entityType: 'User', entityId: faculty._id, details: { email: faculty.email, remark } });
  await faculty.deleteOne();

  res.json({ success: true, message: 'Faculty request rejected and removed' });
});

// GET /api/v1/hod/guards/pending — pending self-registered guard accounts for HOD approval
const getPendingGuards = asyncHandler(async (req, res) => {
  const pendingGuards = await User.find({ role: 'GUARD', isActive: false, addedBy: { $exists: false }, campus: req.user.campus })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: pendingGuards || [] });
});

// DELETE /api/v1/hod/members/:id — remove a member within HOD's campus
const deleteMember = asyncHandler(async (req, res) => {
  const member = await User.findById(req.params.id);
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
  // Only allow HOD to remove STUDENT/FACULTY/GUARD within their campus
  if (['ADMIN', 'DIRECTOR', 'HOD'].includes(member.role)) {
    return res.status(400).json({ success: false, message: 'Cannot remove this account' });
  }
  if (member.campus !== req.user.campus) {
    return res.status(403).json({ success: false, message: 'This member belongs to a different campus' });
  }

  const PendingRegistration = require('../models/PendingRegistration');
  const normalizedEmail = (member.email || '').toLowerCase().trim();

  await PendingRegistration.deleteMany({ email: normalizedEmail });
  await member.deleteOne();
  await recordAudit(req, {
    action: 'HOD_REMOVED_MEMBER',
    entityType: 'User',
    entityId: req.params.id,
    details: { email: normalizedEmail, role: member.role },
  });

  res.json({ success: true, message: 'Member removed' });
});

// PUT /api/v1/hod/guards/:id/approve — approve pending guard
const approveGuard = asyncHandler(async (req, res) => {
  const guard = await User.findById(req.params.id);
  if (!guard || guard.role !== 'GUARD' || guard.isActive || guard.addedBy || guard.campus !== req.user.campus) {
    return res.status(404).json({ success: false, message: 'Pending Guard not found' });
  }

  guard.isActive = true;
  await guard.save();
  await recordAudit(req, { action: 'GUARD_APPROVED_BY_HOD', entityType: 'User', entityId: guard._id, details: { email: guard.email, campus: guard.campus } });
  try {
    await sendAccountApprovedEmail({
      toEmail: guard.email,
      toName: guard.name,
      loginUrl: process.env.CLIENT_BASE_URL ? `${process.env.CLIENT_BASE_URL}/login` : undefined,
    });
  } catch (emailErr) {
    console.error('Failed to send approval email for Guard:', emailErr.message);
  }

  res.json({ success: true, message: 'Guard approved', data: guard.toJSON() });
});

// PUT /api/v1/hod/guards/:id/reject — reject pending guard
const rejectGuard = asyncHandler(async (req, res) => {
  const { remark } = req.body;
  const guard = await User.findById(req.params.id);
  if (!guard || guard.role !== 'GUARD' || guard.isActive || guard.addedBy || guard.campus !== req.user.campus) {
    return res.status(404).json({ success: false, message: 'Pending Guard not found' });
  }

  await recordAudit(req, { action: 'GUARD_REJECTED_BY_HOD', entityType: 'User', entityId: guard._id, details: { email: guard.email, remark } });
  await guard.deleteOne();

  res.json({ success: true, message: 'Guard request rejected and removed' });
});

// PUT /api/v1/hod/requests/:id/approve  → triggers E-Pass generation
const approveRequest = asyncHandler(async (req, res) => {
  const { remark } = req.body;
  const leave = await LeaveRequest.findById(req.params.id).populate('student', 'name rollNumber branch department campus');
  if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });

  const isFacultyLeave = leave.requesterRole === 'FACULTY' || leave.student?.role === 'FACULTY';

  leave.hodStatus = 'Approved';
  leave.hodRemark = remark || undefined;
  leave.hodReviewedAt = new Date();
  leave.hod = req.user._id;
  leave.overallStatus = isFacultyLeave
    ? (leave.directorStatus === 'Approved' ? 'Approved' : (leave.directorStatus === 'Rejected' ? 'Rejected' : 'Pending'))
    : 'Approved';
  await leave.save();

  await recordAudit(req, { action: 'HOD_APPROVED', entityType: 'LeaveRequest', entityId: leave._id, details: { remark } });

  if (leave.overallStatus === 'Approved') {
    const epass = await issueEpass(leave);
    await notifyUser({
      userId: leave.student._id,
      leaveRequestId: leave._id,
      title: 'Leave Approved — E-Pass Ready',
      message: 'Your leave is fully approved. Your E-Pass is ready to download.',
      type: 'HOD_APPROVED',
    });
    res.json({ success: true, data: { ...toHodJson(leave), epass: epass.toJSON() } });
    return;
  }

  await notifyUser({
    userId: leave.student._id,
    leaveRequestId: leave._id,
    title: 'Leave Awaiting Final Approval',
    message: 'Your HOD approved the leave. It is now waiting for the Director’s final approval.',
    type: 'HOD_APPROVED',
  });

  const managerCampus = leave.student?.campus || req.user.campus;
  const managers = await User.find({ role: { $in: ['DIRECTOR', 'ADMIN'] }, campus: managerCampus }).lean();
  await Promise.all(managers.map((manager) => notifyUser({
    userId: manager._id,
    leaveRequestId: leave._id,
    title: 'HOD Approved Leave Request',
    message: `${leave.student?.name || 'A student'} has an HOD-approved leave request.`,
    type: 'HOD_APPROVED',
  })));

  res.json({ success: true, data: toHodJson(leave) });
});

// PUT /api/v1/hod/requests/:id/reject
const rejectRequest = asyncHandler(async (req, res) => {
  const { remark } = req.body;
  const leave = await LeaveRequest.findById(req.params.id).populate('student', 'name rollNumber department campus');
  if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });

  leave.hodStatus = 'Rejected';
  leave.hodRemark = remark || undefined;
  leave.hodReviewedAt = new Date();
  leave.overallStatus = 'Rejected';
  await leave.save();

  await recordAudit(req, { action: 'HOD_REJECTED', entityType: 'LeaveRequest', entityId: leave._id, details: { remark } });

  await notifyUser({
    userId: leave.student._id,
    leaveRequestId: leave._id,
    title: 'Leave Rejected by HOD',
    message: remark ? `Your HOD rejected your leave: ${remark}` : 'Your HOD rejected your leave.',
    type: 'HOD_REJECTED',
  });

  const managerCampus = leave.student?.campus || req.user.campus;
  const managers = await User.find({ role: { $in: ['DIRECTOR', 'ADMIN'] }, campus: managerCampus }).lean();
  await Promise.all(managers.map((manager) => notifyUser({
    userId: manager._id,
    leaveRequestId: leave._id,
    title: 'HOD Rejected Leave Request',
    message: `${leave.student?.name || 'A student'} has an HOD-rejected leave request.${remark ? ` Remark: ${remark}` : ''}`,
    type: 'HOD_REJECTED',
  })));

  res.json({ success: true, data: toHodJson(leave) });
});

// GET /api/v1/hod/stats
const getStats = asyncHandler(async (req, res) => {
  const department = req.user.department;
  const agg = await LeaveRequest.aggregate([
    { $lookup: { from: 'users', localField: 'student', foreignField: '_id', as: 'studentDoc' } },
    { $unwind: '$studentDoc' },
    { $match: { 'studentDoc.department': department } },
    { $group: { _id: '$overallStatus', count: { $sum: 1 } } },
  ]);

  const counts = { Pending: 0, Approved: 0, Rejected: 0 };
  agg.forEach((g) => { counts[g._id] = g.count; });
  const totalRequests = counts.Pending + counts.Approved + counts.Rejected;

  res.json({
    success: true,
    data: { totalRequests, pending: counts.Pending, approved: counts.Approved, rejected: counts.Rejected },
  });
});

// GET /api/v1/hod/reports?from=&to=&format=
const getReports = asyncHandler(async (req, res) => {
  const requests = await LeaveRequest.find({ hod: req.user._id }).populate('student', 'name rollNumber department');
  res.json({
    success: true,
    data: requests.map(toHodJson),
    message: 'Use ?format=csv|pdf in production to export a file',
  });
});

// POST /api/v1/hod/members — HOD can add STUDENT/FACULTY/GUARD under their campus
const addMember = asyncHandler(async (req, res) => {
  const VALID_ROLES = ['STUDENT', 'FACULTY', 'GUARD'];
  const {
    name, email, password, role, department, phone,
    rollNumber, branch, semester, facultyAdvisorId, // STUDENT
    designation, // FACULTY
    assignedGate, // GUARD
  } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'name, email, password and role are required' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role for HOD-created member' });
  }
  if (role === 'STUDENT' && !rollNumber) {
    return res.status(400).json({ success: false, message: 'rollNumber is required for students' });
  }
  if (role !== 'ADMIN' && !department) {
    return res.status(400).json({ success: false, message: 'department is required for this role' });
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(409).json({ success: false, message: 'A member with this email already exists' });
  }

  const userData = {
    name, email, password, role, department, phone,
    campus: req.user.campus, // HOD's campus
    isEmailVerified: true,
    addedBy: req.user._id,
  };
  if (role === 'STUDENT') Object.assign(userData, { rollNumber, branch, semester, facultyAdvisorId: facultyAdvisorId || undefined });
  if (role === 'FACULTY') Object.assign(userData, { designation });
  if (role === 'GUARD') Object.assign(userData, { assignedGate });

  const member = await User.create(userData);
  await recordAudit(req, { action: 'HOD_ADDED_MEMBER', entityType: 'User', entityId: member._id, details: { role, email, department, campus: req.user.campus } });

  res.status(201).json({ success: true, data: member.toJSON() });
});

module.exports = {
  getRequests,
  getRequestById,
  getMembers,
  addMember,
  deleteMember,
  getMemberById,
  getPendingFaculty,
  approveFaculty,
  rejectFaculty,
  getPendingGuards,
  approveGuard,
  rejectGuard,
  approveRequest,
  rejectRequest,
  getStats,
  getReports,
};