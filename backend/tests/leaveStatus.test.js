const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeLeaveStatus, resolveLeaveStatus, syncLegacyLeaveStatusFields } = require('../utils/leaveStatus');

test('normalizeLeaveStatus maps cancelled and canceled to rejected', () => {
  assert.equal(normalizeLeaveStatus('Cancelled'), 'Rejected');
  assert.equal(normalizeLeaveStatus('Canceled'), 'Rejected');
  assert.equal(normalizeLeaveStatus('Rejected'), 'Rejected');
  assert.equal(normalizeLeaveStatus('Pending'), 'Pending');
});

test('resolveLeaveStatus prefers canonical fields over stale legacy values', () => {
  assert.equal(resolveLeaveStatus({ overallStatus: 'Rejected', overall_status: 'Pending' }), 'Rejected');
  assert.equal(resolveLeaveStatus({ overall_status: 'Pending', overallStatus: undefined }), 'Pending');
  assert.equal(resolveLeaveStatus({ status: 'approved', overallStatus: 'Approved' }), 'Approved');
});

test('syncLegacyLeaveStatusFields keeps old and new field names aligned', () => {
  const leave = {
    facultyStatus: 'Approved',
    faculty_status: 'Pending',
    hodStatus: 'Rejected',
    hod_status: 'Pending',
    directorStatus: 'Pending',
    director_status: 'Pending',
    overallStatus: 'Rejected',
    overall_status: 'Pending',
  };

  const synced = syncLegacyLeaveStatusFields(leave);
  assert.equal(synced.overallStatus, 'Rejected');
  assert.equal(synced.overall_status, 'Rejected');
  assert.equal(synced.hodStatus, 'Rejected');
  assert.equal(synced.hod_status, 'Rejected');
  assert.equal(synced.status, 'Rejected');
});
