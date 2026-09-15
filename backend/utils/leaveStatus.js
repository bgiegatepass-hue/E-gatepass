function normalizeLeaveStatus(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Pending';

  const normalized = raw.toLowerCase();
  if (['rejected', 'reject', 'cancelled', 'canceled', 'cancelled by hod', 'cancelled by h o d', 'cancelled by director'].includes(normalized)) {
    return 'Rejected';
  }
  if (['approved', 'approve'].includes(normalized)) {
    return 'Approved';
  }
  if (['pending', 'awaiting approval', 'awaiting-final-approval', 'in review', 'submitted'].includes(normalized)) {
    return 'Pending';
  }

  return 'Pending';
}

function resolveLeaveStatus(leaveLike = {}) {
  const candidates = [leaveLike.overallStatus, leaveLike.overall_status, leaveLike.status, leaveLike.hodStatus, leaveLike.hod_status, leaveLike.facultyStatus, leaveLike.faculty_status, leaveLike.directorStatus, leaveLike.director_status];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
      return normalizeLeaveStatus(candidate);
    }
  }

  return 'Pending';
}

function syncLegacyLeaveStatusFields(leaveLike = {}) {
  const overallStatus = resolveLeaveStatus(leaveLike);
  const facultyStatus = normalizeLeaveStatus(leaveLike.facultyStatus ?? leaveLike.faculty_status ?? 'Pending');
  const hodStatus = normalizeLeaveStatus(leaveLike.hodStatus ?? leaveLike.hod_status ?? 'Pending');
  const directorStatus = normalizeLeaveStatus(leaveLike.directorStatus ?? leaveLike.director_status ?? 'Pending');

  return {
    ...leaveLike,
    facultyStatus,
    faculty_status: facultyStatus,
    hodStatus,
    hod_status: hodStatus,
    directorStatus,
    director_status: directorStatus,
    overallStatus,
    overall_status: overallStatus,
    status: overallStatus,
  };
}

module.exports = {
  normalizeLeaveStatus,
  resolveLeaveStatus,
  syncLegacyLeaveStatusFields,
};
