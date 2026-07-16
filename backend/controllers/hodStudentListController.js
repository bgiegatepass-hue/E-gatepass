const asyncHandler = require('../utils/asyncHandler');
const HODStudentList = require('../models/HODStudentList');
const User = require('../models/User');
const { recordAudit } = require('../services/auditService');

// xlsx is already installed
const xlsx = require('xlsx');

// =====================================================================
// POST /api/v1/hod/student-list/upload
// Upload Excel sheet with student data
// Body: multipart with file field "studentList"
// =====================================================================
const uploadStudentList = asyncHandler(async (req, res) => {
  const { department, campus } = req.body;
  
  console.log('🔵 [UPLOAD] Starting file upload...');
  console.log('   User:', req.user?.email, 'ID:', req.user?._id);
  console.log('   Department:', department, 'Campus:', campus);
  console.log('   File:', req.file?.originalname, 'Size:', req.file?.size);
  
  if (!department || !campus) {
    return res.status(400).json({ success: false, message: 'department and campus are required' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Excel file is required' });
  }

  try {
    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel file is empty' });
    }

    // Validate and map Excel columns (flexible column naming)
    // Expected columns: Name, Enrollment/EnrollmentNumber/Roll, Phone, Gmail/Email
    const students = data.map((row) => {
      const nameKey = Object.keys(row).find((k) => k.toLowerCase().includes('name'));
      const enrollKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes('enrollment') || k.toLowerCase().includes('roll')
      );
      const phoneKey = Object.keys(row).find((k) => k.toLowerCase().includes('phone'));
      const emailKey = Object.keys(row).find((k) =>
        k.toLowerCase().includes('gmail') || k.toLowerCase().includes('email')
      );
      const branchKey = Object.keys(row).find((k) => k.toLowerCase().includes('branch'));
      const semesterKey = Object.keys(row).find((k) => k.toLowerCase().includes('semester'));

      return {
        name: (row[nameKey] || '').toString().trim(),
        enrollmentNumber: (row[enrollKey] || '').toString().trim().toLowerCase(),
        phone: (row[phoneKey] || '').toString().trim(),
        gmail: (row[emailKey] || '').toString().trim().toLowerCase(),
        branch: (row[branchKey] || '').toString().trim(),
        semester: parseInt(row[semesterKey], 10) || null,
      };
    });

    // Validate required fields
    const invalidStudents = students.filter(
      (s) => !s.name || !s.enrollmentNumber || !s.phone || !s.gmail
    );
    if (invalidStudents.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Excel validation failed: ${invalidStudents.length} rows have missing required fields (Name, Enrollment, Phone, Gmail)`,
      });
    }

    // Remove duplicates by enrollment number
    const uniqueStudents = [];
    const enrollmentSeen = new Set();
    for (const student of students) {
      if (!enrollmentSeen.has(student.enrollmentNumber)) {
        uniqueStudents.push(student);
        enrollmentSeen.add(student.enrollmentNumber);
      }
    }
    console.log('🔵 [UPLOAD] Deduplicated students:', uniqueStudents.length, '/ ' + students.length);

    // Replace previous list for this department + campus
    console.log('🔵 [UPLOAD] Saving to MongoDB...');
    console.log('   Query: hodId=' + req.user._id, 'department=' + department, 'campus=' + campus);
    console.log('   Data: ' + uniqueStudents.length + ' students, file=' + req.file.originalname);
    
    const newList = await HODStudentList.findOneAndUpdate(
      { hodId: req.user._id, department, campus },
      {
        hodId: req.user._id,
        department,
        campus,
        students: uniqueStudents,
        totalStudents: uniqueStudents.length,
        verifiedCount: 0,
        fileName: req.file.originalname,
        uploadedAt: new Date(),
        isActive: true,
      },
      { upsert: true, new: true }
    );

    console.log('✅ [UPLOAD] Saved successfully!');
    console.log('   Document ID:', newList?._id);
    console.log('   Students saved:', newList?.students?.length);
    console.log('   Collection:', newList?.constructor?.collection?.name);

    await recordAudit(req, {
      action: 'STUDENT_LIST_UPLOADED',
      entityType: 'HODStudentList',
      entityId: newList._id,
      details: { department, campus, totalStudents: uniqueStudents.length },
    });

    res.json({
      success: true,
      message: `Student list uploaded successfully. Total: ${uniqueStudents.length}, Verified: ${newList.verifiedCount}`,
      data: {
        listId: newList._id,
        department,
        campus,
        totalStudents: uniqueStudents.length,
        verifiedCount: newList.verifiedCount,
      },
    });
  } catch (err) {
    console.error('❌ [UPLOAD] Error:', {
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
    res.status(400).json({ success: false, message: 'Failed to parse Excel file: ' + err.message });
  }
});

// =====================================================================
// GET /api/v1/hod/student-list
// Get HOD's current student list
// =====================================================================
const getStudentList = asyncHandler(async (req, res) => {
  const { department, campus } = req.query;

  if (!department || !campus) {
    return res.status(400).json({ success: false, message: 'department and campus query params required' });
  }

  const list = await HODStudentList.findOne({
    hodId: req.user._id,
    department,
    campus,
    isActive: true,
  });

  if (!list) {
    return res.status(404).json({ success: false, message: 'No student list found for this department/campus' });
  }

  res.json({
    success: true,
    data: {
      listId: list._id,
      department: list.department,
      campus: list.campus,
      totalStudents: list.totalStudents,
      verifiedCount: list.verifiedCount,
      fileName: list.fileName,
      uploadedAt: list.uploadedAt,
      students: list.students, // Returns full list with verification status
    },
  });
});

// =====================================================================
// GET /api/v1/hod/student-list/verify-student
// Check if a student exists in the list (used during registration)
// Query params: department, campus, enrollmentNumber, phone, gmail
// =====================================================================
const verifyStudentExists = asyncHandler(async (req, res) => {
  const { department, campus, enrollmentNumber, phone, gmail } = req.query;

  if (!department || !campus || !enrollmentNumber || !phone || !gmail) {
    return res.status(400).json({
      success: false,
      message: 'department, campus, enrollmentNumber, phone, and gmail are required',
    });
  }

  const list = await HODStudentList.findOne(
    {
      department,
      campus,
      isActive: true,
    },
    { students: 1 }
  );

  if (!list) {
    return res.json({
      success: false,
      found: false,
      message: 'No whitelist found for this department/campus. Contact HOD.',
    });
  }

  // Find matching student
  const student = list.students.find(
    (s) =>
      s.enrollmentNumber.toLowerCase() === enrollmentNumber.toLowerCase().trim() &&
      s.phone.toLowerCase().replace(/\D/g, '') === phone.toLowerCase().replace(/\D/g, '') &&
      s.gmail.toLowerCase() === gmail.toLowerCase().trim()
  );

  if (!student) {
    return res.json({
      success: true,
      found: false,
      message: 'Student details do not match the department list. Please verify your enrollment number, phone, and Gmail.',
    });
  }

  res.json({
    success: true,
    found: true,
    message: 'Student verified against department list',
    data: {
      name: student.name,
      enrollmentNumber: student.enrollmentNumber,
      branch: student.branch,
      semester: student.semester,
    },
  });
});

// =====================================================================
// PUT /api/v1/hod/student-list/mark-verified/:studentId
// Mark student as verified after successful registration
// =====================================================================
const markStudentVerified = asyncHandler(async (req, res) => {
  const { listId, enrollmentNumber } = req.body;

  if (!listId || !enrollmentNumber) {
    return res.status(400).json({ success: false, message: 'listId and enrollmentNumber required' });
  }

  const result = await HODStudentList.updateOne(
    { _id: listId, 'students.enrollmentNumber': enrollmentNumber.toLowerCase() },
    {
      $set: {
        'students.$.isVerified': true,
        'students.$.verifiedAt': new Date(),
      },
      $inc: { verifiedCount: 1 },
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, message: 'Student or list not found' });
  }

  res.json({ success: true, message: 'Student marked as verified' });
});

// =====================================================================
// DELETE /api/v1/hod/student-list/:listId
// Deactivate a student list
// =====================================================================
const deleteStudentList = asyncHandler(async (req, res) => {
  const { listId } = req.params;

  const result = await HODStudentList.findByIdAndUpdate(
    listId,
    { isActive: false },
    { new: true }
  );

  if (!result) {
    return res.status(404).json({ success: false, message: 'List not found' });
  }

  await recordAudit(req, {
    action: 'STUDENT_LIST_DELETED',
    entityType: 'HODStudentList',
    entityId: listId,
  });

  res.json({ success: true, message: 'Student list deactivated' });
});

// =====================================================================
// GET /api/v1/hod/members/with-list?department=CSE&campus=BIST
// Get members list with student upload status and registration stats
// Combines members view with student list upload option
// =====================================================================
const getMembersWithStudentList = asyncHandler(async (req, res) => {
  const { department, campus, role = 'STUDENT', page = 1, limit = 50 } = req.query;
  
  if (!department || !campus) {
    return res.status(400).json({ success: false, message: 'department and campus are required' });
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(200, Number(limit) || 50);
  const skip = (pageNum - 1) * limitNum;

  // Get current student list
  const studentList = await HODStudentList.findOne(
    { hodId: req.user._id, department, campus, isActive: true },
    { students: 1, totalStudents: 1, verifiedCount: 1, uploadedAt: 1, fileName: 1 }
  );

  // Get registered members
  const query = { role: role.toUpperCase(), department, campus };
  const [members, totalMembers] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    User.countDocuments(query),
  ]);

  // Get stats
  const stats = {
    hasStudentList: !!studentList,
    totalInList: studentList?.totalStudents || 0,
    verifiedInList: studentList?.verifiedCount || 0,
    registeredMembers: totalMembers,
    remainingToRegister: studentList ? Math.max(0, studentList.totalStudents - studentList.verifiedCount) : 0,
    registrationProgress: studentList ? Math.round((studentList.verifiedCount / studentList.totalStudents) * 100) : 0,
    lastUploadedAt: studentList?.uploadedAt || null,
    fileName: studentList?.fileName || null,
  };

  res.json({
    success: true,
    data: {
      stats,
      members: members.map((m) => m.toJSON()),
      listId: studentList?._id || null,
    },
    meta: { total: totalMembers, page: pageNum, limit: limitNum },
  });
});

// =====================================================================
// GET /api/v1/hod/student-list/registration-stats?department=CSE&campus=BIST
// Get detailed registration statistics and pending students
// =====================================================================
const getStudentListStats = asyncHandler(async (req, res) => {
  const { department, campus } = req.query;

  if (!department || !campus) {
    return res.status(400).json({ success: false, message: 'department and campus are required' });
  }

  const list = await HODStudentList.findOne(
    { hodId: req.user._id, department, campus, isActive: true }
  );

  if (!list) {
    return res.json({
      success: true,
      data: {
        hasStudentList: false,
        message: 'No student list uploaded yet',
        totalStudents: 0,
        verifiedStudents: 0,
        pendingStudents: [],
      },
    });
  }

  // Get pending students (not verified)
  const pendingStudents = list.students.filter((s) => !s.isVerified).map((s) => ({
    name: s.name,
    enrollmentNumber: s.enrollmentNumber,
    phone: s.phone,
    gmail: s.gmail,
    branch: s.branch,
    semester: s.semester,
  }));

  res.json({
    success: true,
    data: {
      hasStudentList: true,
      totalStudents: list.totalStudents,
      verifiedStudents: list.verifiedCount,
      pendingStudents: pendingStudents,
      registrationProgress: Math.round((list.verifiedCount / list.totalStudents) * 100),
      uploadedAt: list.uploadedAt,
      fileName: list.fileName,
      remainingToRegister: Math.max(0, list.totalStudents - list.verifiedCount),
    },
  });
});

module.exports = {
  uploadStudentList,
  getStudentList,
  verifyStudentExists,
  markStudentVerified,
  deleteStudentList,
  getMembersWithStudentList,
  getStudentListStats,
};
