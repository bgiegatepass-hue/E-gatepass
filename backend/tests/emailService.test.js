const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAccountApprovedEmailMailOptions } = require('../services/emailService');

test('buildAccountApprovedEmailMailOptions includes approval message and login URL', () => {
  const mailOptions = buildAccountApprovedEmailMailOptions({
    toEmail: 'user@example.com',
    toName: 'Asha',
    loginUrl: 'http://localhost:8100/login',
  });

  assert.equal(mailOptions.to, 'user@example.com');
  assert.match(mailOptions.subject, /account.*approved/i);
  assert.match(mailOptions.html, /Your account has been approved/i);
  assert.match(mailOptions.html, /Please login/i);
  assert.match(mailOptions.html, /http:\/\/localhost:8100\/login/);
});
