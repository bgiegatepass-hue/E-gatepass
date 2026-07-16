# HOD Student List Upload Feature

## Overview
HOD can now upload an Excel sheet containing student data. Students can only register if their details **exactly match** the uploaded list.

## Excel Sheet Format

Create an Excel file with the following columns (exact names or similar variations work):

| Name | Enrollment Number | Phone | Gmail | Branch | Semester |
|------|-------------------|-------|-------|--------|----------|
| Rahul Kumar | ENR001 | 9876543210 | rahul@gmail.com | CSE | 3 |
| Priya Singh | ENR002 | 9876543211 | priya@gmail.com | CSE | 3 |

### Column Requirements:
- **Name** - Student full name (required)
- **Enrollment Number** (or Roll/Enrollment) - Student enrollment/roll number (required)
- **Phone** - Mobile number (required, digits only during matching)
- **Gmail** (or Email) - Gmail address (required, lowercase for matching)
- **Branch** - Branch name (optional, helpful for records)
- **Semester** - Semester number (optional)

### Rules:
- Columns can be named flexibly (e.g., "Enrollment Number", "Roll Number", "Email", "Gmail")
- First row must be headers
- No blank rows in the middle
- Enrollment numbers are case-insensitive and trimmed
- Phone numbers can have spaces/dashes (removed during matching)
- Gmail must be lowercase

## API Endpoints

### 1. Upload Student List
**POST** `/api/v1/hod/student-list/upload`

**Authentication:** HOD or ADMIN token required

**Request (multipart/form-data):**
```
Field "studentList" → Excel file (.xlsx, .xls, .csv)
Field "department" → Department name (e.g., "CSE")
Field "campus" → Campus code (e.g., "BIST", "BIRT", "BIRTS")
```

**Response:**
```json
{
  "success": true,
  "message": "Student list uploaded successfully. Total: 150, Verified: 0",
  "data": {
    "listId": "507f1f77bcf86cd799439011",
    "department": "CSE",
    "campus": "BIST",
    "totalStudents": 150,
    "verifiedCount": 0
  }
}
```

### 2. Get Current Student List
**GET** `/api/v1/hod/student-list?department=CSE&campus=BIST`

**Authentication:** HOD or ADMIN token required

**Response:**
```json
{
  "success": true,
  "data": {
    "listId": "507f1f77bcf86cd799439011",
    "department": "CSE",
    "campus": "BIST",
    "totalStudents": 150,
    "verifiedCount": 45,
    "fileName": "cse_students_2024.xlsx",
    "uploadedAt": "2024-07-08T10:30:00Z",
    "students": [
      {
        "name": "Rahul Kumar",
        "enrollmentNumber": "enr001",
        "phone": "9876543210",
        "gmail": "rahul@gmail.com",
        "branch": "CSE",
        "semester": 3,
        "isVerified": true,
        "verifiedAt": "2024-07-08T11:15:00Z"
      },
      // ... more students
    ]
  }
}
```

### 3. Verify Student (Used During Registration)
**GET** `/api/v1/hod/student-list/verify-student?department=CSE&campus=BIST&enrollmentNumber=ENR001&phone=9876543210&gmail=rahul@gmail.com`

**Response (Match Found):**
```json
{
  "success": true,
  "found": true,
  "message": "Student verified against department list",
  "data": {
    "name": "Rahul Kumar",
    "enrollmentNumber": "enr001",
    "branch": "CSE",
    "semester": 3
  }
}
```

**Response (No Match):**
```json
{
  "success": true,
  "found": false,
  "message": "Student details do not match the department list. Please verify your enrollment number, phone, and Gmail."
}
```

### 4. Get Registration Statistics
**GET** `/api/v1/hod/student-list/registration-stats?department=CSE&campus=BIST`

**Authentication:** HOD or ADMIN token required

**Response:**
```json
{
  "success": true,
  "data": {
    "hasStudentList": true,
    "totalStudents": 150,
    "verifiedStudents": 45,
    "registrationProgress": 30,
    "remainingToRegister": 105,
    "uploadedAt": "2024-07-08T10:30:00Z",
    "fileName": "cse_students_2024.xlsx",
    "pendingStudents": [
      {
        "name": "Priya Singh",
        "enrollmentNumber": "enr002",
        "phone": "9876543211",
        "gmail": "priya@gmail.com",
        "branch": "CSE",
        "semester": 3
      },
      // ... more pending students
    ]
  }
}
```

### 5. Get Members WITH Student List Status (HOD Dashboard Integration)
**GET** `/api/v1/hod/members/with-list?department=CSE&campus=BIST&role=STUDENT&page=1&limit=50`

**Authentication:** HOD or ADMIN token required

**Response (Integrated view):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "hasStudentList": true,
      "totalInList": 150,
      "verifiedInList": 45,
      "registeredMembers": 45,
      "remainingToRegister": 105,
      "registrationProgress": 30,
      "lastUploadedAt": "2024-07-08T10:30:00Z",
      "fileName": "cse_students_2024.xlsx"
    },
    "members": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Rahul Kumar",
        "email": "rahul@gmail.com",
        "rollNumber": "enr001",
        "department": "CSE",
        "branch": "CSE",
        "campus": "BIST"
      },
      // ... more members
    ],
    "listId": "507f1f77bcf86cd799439011"
  },
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 50
  }
}
```

### 6. Delete/Deactivate Student List
**DELETE** `/api/v1/hod/student-list/{listId}`

**Authentication:** HOD or ADMIN token required

**Response:**
```json
{
  "success": true,
  "message": "Student list deactivated"
}
```

## Student Registration Flow

### Before
1. Student enters: name, email, password, enrollment, phone, etc.
2. OTP sent immediately

### After (With Excel Validation)
1. Student enters: name, email, password, enrollment, phone, department, campus
2. **System checks if details match HOD's Excel list**
3. If **NO MATCH**: Error message → "Details don't match department records. Contact HOD."
4. If **MATCH**: OTP sent to email
5. Student verifies OTP and completes registration

## Example Excel File

### cse_students.xlsx
```
Name,Enrollment Number,Phone,Gmail,Branch,Semester
Rahul Kumar,ENR001,9876543210,rahul@gmail.com,CSE,3
Priya Singh,ENR002,9876543211,priya@gmail.com,CSE,3
Amit Patel,ENR003,9876543212,amit@gmail.com,CSE,4
```

## Error Messages

| Scenario | Error Message |
|----------|---------------|
| No Excel list for department | "No whitelist found for your department/campus. Contact your HOD to upload the student list." |
| Enrollment mismatch | "Your details do not match the department records. Please verify: enrollment number, phone number, and Gmail address must match exactly." |
| Phone mismatch | Same as above |
| Email mismatch | Same as above |
| Invalid Excel format | "Failed to parse Excel file: [error details]" |

## Frontend Implementation

### HOD Dashboard - Members Section with Upload Option

```javascript
// In HOD dashboard - Members tab
import React, { useState, useEffect } from 'react';

const MembersWithStudentList = () => {
  const [listData, setListData] = useState(null);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch members WITH student list info (integrated view)
  useEffect(() => {
    fetchMembersWithList();
  }, []);

  const fetchMembersWithList = async () => {
    try {
      const response = await fetch(
        `${API_URL}/hod/members/with-list?department=CSE&campus=BIST&role=STUDENT`
      );
      const data = await response.json();
      setStats(data.data.stats);
      setMembers(data.data.members);
      setListData(data.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  // Handle file upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('studentList', uploadFile);
    formData.append('department', 'CSE');
    formData.append('campus', 'BIST');

    try {
      const response = await fetch(`${API_URL}/hod/student-list/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Student list uploaded successfully!');
        setUploadFile(null);
        fetchMembersWithList(); // Refresh data
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch registration stats
  const fetchStats = async () => {
    try {
      const response = await fetch(
        `${API_URL}/hod/student-list/registration-stats?department=CSE&campus=BIST`
      );
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="members-section">
      <h2>Members Management</h2>

      {/* Upload Section */}
      <div className="upload-card">
        <h3>📋 Upload Student List</h3>
        <p>Upload an Excel file to whitelist students. Only whitelisted students can register.</p>
        
        <form onSubmit={handleUpload}>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setUploadFile(e.target.files[0])}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Uploading...' : 'Upload Excel'}
          </button>
        </form>
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="stats-card">
          <h3>📊 Registration Statistics</h3>
          <div className="stats-grid">
            <div className="stat-box">
              <label>Total Students</label>
              <div className="stat-value">{stats.totalInList}</div>
            </div>
            <div className="stat-box">
              <label>Registered</label>
              <div className="stat-value">{stats.verifiedInList}</div>
            </div>
            <div className="stat-box">
              <label>Pending</label>
              <div className="stat-value">{stats.remainingToRegister}</div>
            </div>
            <div className="stat-box">
              <label>Progress</label>
              <div className="stat-value">{stats.registrationProgress}%</div>
            </div>
          </div>

          {stats.lastUploadedAt && (
            <p className="upload-info">
              Last uploaded: {new Date(stats.lastUploadedAt).toLocaleString()}
              <br />
              File: {stats.fileName}
            </p>
          )}
        </div>
      )}

      {/* Registered Members Table */}
      <div className="members-table">
        <h3>✅ Registered Members ({members.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Enrollment</th>
              <th>Branch</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member._id}>
                <td>{member.name}</td>
                <td>{member.email}</td>
                <td>{member.rollNumber}</td>
                <td>{member.branch}</td>
                <td>✓ Verified</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MembersWithStudentList;
```

### Example CSS for Dashboard Integration
```css
.members-section {
  padding: 20px;
  background: #f5f5f5;
}

.upload-card, .stats-card, .members-table {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.upload-card h3, .stats-card h3, .members-table h3 {
  margin-top: 0;
  color: #333;
}

.upload-card input[type="file"],
.upload-card button {
  padding: 10px 15px;
  margin: 10px 10px 0 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.upload-card button {
  background: #4CAF50;
  color: white;
  border: none;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin: 20px 0;
}

.stat-box {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 4px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #4CAF50;
  margin-top: 10px;
}

.upload-info {
  font-size: 12px;
  color: #666;
  margin-top: 15px;
}

.members-table table {
  width: 100%;
  border-collapse: collapse;
}

.members-table th {
  background: #f5f5f5;
  padding: 12px;
  text-align: left;
  border-bottom: 2px solid #ddd;
}

.members-table td {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.members-table tr:hover {
  background: #f9f9f9;
}
```

### Alternative: Quick Stats View
```javascript
// Show pending students list
const fetchPendingStudents = async () => {
  const response = await fetch(
    `${API_URL}/hod/student-list/registration-stats?department=CSE&campus=BIST`
  );
  const data = await response.json();
  
  if (data.data.pendingStudents.length > 0) {
    console.log('Pending registrations:');
    data.data.pendingStudents.forEach(student => {
      console.log(`${student.name} (${student.enrollmentNumber})`);
    });
  }
};
```

## Notes
- **Multiple uploads**: Re-uploading replaces the previous list for that department/campus
- **Case insensitive**: Enrollment numbers and emails are case-insensitive
- **Phone formatting**: System ignores spaces and dashes in phone numbers
- **Verification tracking**: System tracks which students have completed registration
- **Batch operations**: Excel files can contain hundreds of students
- **Member integration**: Use `/hod/members/with-list` endpoint to see members + upload status together
- **Real-time stats**: Use `/hod/student-list/registration-stats` for up-to-date progress tracking

## Integration with Student Registration

### Complete Flow:
1. **HOD uploads Excel sheet** via `/hod/student-list/upload`
2. **Student visits registration page** → Enters enrollment, phone, email
3. **Frontend validates** → Calls `/hod/student-list/verify-student`
4. **If student not found** → Shows error "Details don't match department list"
5. **If student found** → Proceeds with OTP send
6. **After OTP verification** → System can call `/hod/student-list/mark-verified` (optional)
7. **HOD can track progress** → Checks `/hod/student-list/registration-stats`

### Quick Setup for Developers

**Backend ready:** All APIs implemented ✓
**Frontend TODO:**
- [ ] Add Excel upload UI to HOD dashboard
- [ ] Add stats/progress display
- [ ] Update student registration to validate against list
- [ ] Add member management view with upload option
