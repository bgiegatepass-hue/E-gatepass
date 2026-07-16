function getHodDepartmentCandidates(department, branch) {
  const candidates = [];
  const add = (value) => {
    if (!value) return;
    const normalized = String(value).trim();
    if (normalized && !candidates.includes(normalized)) candidates.push(normalized);
  };

  add(department);
  add(branch);

  const upperDepartment = String(department || '').trim().toUpperCase();
  const upperBranch = String(branch || '').trim().toUpperCase();
  if (upperDepartment === 'CSE' && ['AIML', 'DATA SCIENCE', 'CYBER SECURITY'].includes(upperBranch)) {
    add('CSE');
  }

  return candidates;
}

module.exports = { getHodDepartmentCandidates };
