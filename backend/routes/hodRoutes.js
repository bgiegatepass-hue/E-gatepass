const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/hodController');
const { getDepartmentLeaves, approveLeave, rejectLeave, getDashboardStats } = require('../controllers/hodAuthController');
const {
  uploadStudentList,
  getStudentList,
  verifyStudentExists,
  markStudentVerified,
  deleteStudentList,
  getMembersWithStudentList,
  getStudentListStats,
} = require('../controllers/hodStudentListController');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roleCheck');
const { upload } = require('../middleware/upload');

router.use(protect, allowRoles('HOD', 'ADMIN'));

// ---- HOD Leave Management (from hodController) ----
router.get('/members', getMembers);
router.get('/members/:id', getMemberById);
router.post('/members', addMember);
router.delete('/members/:id', deleteMember);
router.get('/faculty/pending', getPendingFaculty);
router.put('/faculty/:id/approve', approveFaculty);
router.put('/faculty/:id/reject', rejectFaculty);
router.get('/guards/pending', getPendingGuards);
router.put('/guards/:id/approve', approveGuard);
router.put('/guards/:id/reject', rejectGuard);
router.get('/requests', getRequests);
router.get('/requests/:id', getRequestById);
router.put('/requests/:id/approve', approveRequest);
router.put('/requests/:id/reject', rejectRequest);
router.get('/stats', getStats);
router.get('/reports', getReports);

// ---- HOD Department Leave Actions (from hodAuthController) ----
router.get('/department/leaves', getDepartmentLeaves);
router.put('/department/leaves/:id/approve', approveLeave);
router.put('/department/leaves/:id/reject', rejectLeave);
router.get('/dashboard', getDashboardStats);

// ---- HOD Student List Management (NEW) ----
router.post('/student-list/upload', upload.single('studentList'), uploadStudentList);
router.get('/student-list', getStudentList);
router.get('/student-list/verify-student', verifyStudentExists);
router.get('/student-list/registration-stats', getStudentListStats);
router.get('/members/with-list', getMembersWithStudentList);
router.put('/student-list/mark-verified', markStudentVerified);
router.delete('/student-list/:listId', deleteStudentList);

module.exports = router;
