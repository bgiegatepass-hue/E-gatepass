const asyncHandler = require('../utils/asyncHandler');
const Epass = require('../models/Epass');
const LeaveRequest = require('../models/LeaveRequest');
const AuditLog = require('../models/AuditLog');
const { recordAudit } = require('../services/auditService');
const { isWithinValidity } = require('./epassController');

// POST /api/v1/guard/scan — { passId } — verifies a scanned/typed QR code at the gate
const scanPass = asyncHandler(async (req, res) => {
  const { passId } = req.body;
  if (!passId) return res.status(400).json({ success: false, message: 'passId is required' });

  const epass = await Epass.findOne({ passId: passId.trim() });
  if (!epass) {
    await recordAudit(req, { action: 'GATE_SCAN_FAILED', entityType: 'Epass', entityId: passId, details: { passId } });
    return res.status(404).json({ success: false, message: 'Invalid or unknown pass ID' });
  }

  const leave = await LeaveRequest.findById(epass.leaveRequest).populate('student', 'name rollNumber branch profileImageUrl');
  const isCurrentlyValid = isWithinValidity(epass);
  const scanCount = typeof epass.scanCount === 'number' ? epass.scanCount : 0;
  const maxScans = typeof epass.maxScans === 'number' ? epass.maxScans : 2;
  const remainingScans = Math.max(maxScans - scanCount, 0);

  if (!isCurrentlyValid || remainingScans <= 0) {
    await recordAudit(req, {
      action: 'GATE_SCAN_FAILED',
      entityType: 'Epass',
      entityId: epass._id,
      details: {
        passId: epass.passId,
        isCurrentlyValid,
        studentName: leave?.student?.name,
        approvedByName: epass.approvedByName,
        approvedAt: epass.approvedAt,
        scanCount,
        maxScans,
      },
    });

    const expiredMessage = !isCurrentlyValid ? 'This pass has expired.' : 'This pass has already been scanned twice.';
    return res.status(403).json({ success: false, message: expiredMessage });
  }

  const updatedEpass = await Epass.findOneAndUpdate(
    { _id: epass._id, scanCount: { $lt: maxScans } },
    { $inc: { scanCount: 1 } },
    { new: true }
  );

  if (!updatedEpass) {
    await recordAudit(req, {
      action: 'GATE_SCAN_FAILED',
      entityType: 'Epass',
      entityId: epass._id,
      details: {
        passId: epass.passId,
        isCurrentlyValid,
        studentName: leave?.student?.name,
        approvedByName: epass.approvedByName,
        approvedAt: epass.approvedAt,
        scanCount,
        maxScans,
      },
    });
    return res.status(403).json({ success: false, message: 'This pass has already been scanned twice.' });
  }

  const updatedScanCount = typeof updatedEpass.scanCount === 'number' ? updatedEpass.scanCount : scanCount + 1;
  const updatedRemainingScans = Math.max(maxScans - updatedScanCount, 0);
  const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  if (leave) {
    if (updatedScanCount === 1 && !leave.entryTime) {
      leave.entryTime = nowTime;
    }
    if (updatedScanCount >= 2 && !leave.exitTime) {
      leave.exitTime = nowTime;
    }
    if (leave.isModified('entryTime') || leave.isModified('exitTime')) {
      await leave.save();
    }
  }

  await recordAudit(req, {
    action: 'GATE_SCAN',
    entityType: 'Epass',
    entityId: epass._id,
    details: {
      passId: epass.passId,
      isCurrentlyValid,
      studentName: leave?.student?.name,
      approvedByName: epass.approvedByName,
      approvedAt: epass.approvedAt,
      scanCount: updatedScanCount,
      remainingScans: updatedRemainingScans,
      entryTime: leave?.entryTime,
      exitTime: leave?.exitTime,
    },
  });

  res.json({
    success: true,
    data: {
      passId: epass.passId,
      isCurrentlyValid,
      studentName: leave?.student?.name,
      rollNumber: leave?.student?.rollNumber,
      branch: leave?.student?.branch,
      studentPhoto: leave?.student?.profileImageUrl,
      leaveType: leave?.leaveType,
      validFrom: epass.validFrom,
      validTo: epass.validTo,
      approvedByName: epass.approvedByName,
      approvedAt: epass.approvedAt,
      scanCount: updatedScanCount,
      remainingScans: updatedRemainingScans,
      validUntil: epass.validUntil,
      entryTime: leave?.entryTime,
      exitTime: leave?.exitTime,
    },
  });
});

// GET /api/v1/guard/scans/recent — this guard's last 50 scans (from the audit log)
const getRecentScans = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find({
    user: req.user._id,
    action: { $in: ['GATE_SCAN', 'GATE_SCAN_FAILED'] },
  })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({ success: true, data: logs.map((l) => l.toJSON()) });
});

module.exports = { scanPass, getRecentScans };
