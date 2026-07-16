// =====================================================================
// E-PASS — Shared UI helpers (toast, confirm dialog, formatting, badges)
// Built on top of Ionic's web components (ion-toast, ion-alert).
// =====================================================================

const UI = {
  async toast(message, color = 'dark') {
    const toast = document.createElement('ion-toast');
    toast.message = message;
    toast.duration = 2200;
    toast.color = color;
    toast.position = 'top';
    document.body.appendChild(toast);
    await toast.present();
  },

  async notify(message, title = 'New notification', options = {}) {
    const shouldPlaySound = options.playSound !== false;
    const shouldShowToast = options.showToast !== false;

    if (shouldShowToast) {
      await this.toast(message, options.color || 'primary');
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body: message,
            icon: options.icon || 'assets/images/logo.png',
          });
        } else if (Notification.permission === 'default') {
          await Notification.requestPermission();
          if (Notification.permission === 'granted') {
            new Notification(title, {
              body: message,
              icon: options.icon || 'assets/images/logo.png',
            });
          }
        }
      } catch (_) {}
    }

    if (shouldPlaySound) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gain.gain.value = 0.04;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
        oscillator.stop(ctx.currentTime + 0.3);
        setTimeout(() => ctx.close(), 350);
      } catch (_) {}
    }
  },

  /** Shows a remark + confirm dialog (used for approve/reject). Resolves { confirmed, remark }. */
  confirmWithRemark({ title, confirmText = 'Confirm', confirmColor = 'primary' }) {
    return new Promise((resolve) => {
      const alert = document.createElement('ion-alert');
      alert.header = title;
      alert.inputs = [{ name: 'remark', type: 'textarea', placeholder: 'Add a remark (optional)' }];
      alert.buttons = [
        { text: 'Cancel', role: 'cancel', handler: () => resolve({ confirmed: false, remark: '' }) },
        {
          text: confirmText,
          cssClass: confirmColor === 'danger' ? 'alert-danger-btn' : '',
          handler: (data) => resolve({ confirmed: true, remark: (data && data.remark) || '' }),
        },
      ];
      document.body.appendChild(alert);
      alert.present();
    });
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  formatTime(timeStr) {
    if (!timeStr) return '-';
    if (typeof timeStr !== 'string') {
      const d = new Date(timeStr);
      return Number.isNaN(d.getTime()) ? String(timeStr) : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
      return timeStr;
    }
    const d = new Date(timeStr);
    return Number.isNaN(d.getTime()) ? timeStr : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  },

  statusBadgeHtml(status) {
    const cls = status === 'Approved' ? 'status-approved' : status === 'Rejected' ? 'status-rejected' : 'status-pending';
    return `<span class="status-badge ${cls}">${status}</span>`;
  },

  statusColorVar(status) {
    if (status === 'Approved') return 'var(--bgi-success)';
    if (status === 'Rejected') return 'var(--bgi-danger)';
    return 'var(--bgi-warning)';
  },

  approvalStepHtml(label, status) {
    if (status === 'Approved') {
      return `<span>${label}: <b style="color:var(--bgi-success);">✓ Approved</b></span>`;
    }
    if (status === 'Rejected') {
      return `<span>${label}: <b style="color:var(--bgi-danger);">✕ Rejected</b></span>`;
    }
    return `<span>${label}: <b style="color:var(--bgi-warning);">● Pending</b></span>`;
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  /**
   * Builds the HTML for a single leave-request card.
   * options: { showStudentName, clickableIfApproved, showFacultyActions, showHodActions }
   */
  leaveCardHtml(leave, options = {}) {
    const { showStudentName = false, clickableIfApproved = false, showFacultyActions = false, showHodActions = false, locationText: forcedLocationText, showExitTimeOnly = false } = options;
    const leaveId = leave.id || leave._id || '';
    const clickable = clickableIfApproved && leave.overall_status === 'Approved';

    let actionsHtml = '';
    const facultyStatus = leave.faculty_status || leave.facultyStatus;
    const hodStatus = leave.hod_status || leave.hodStatus;
    const directorStatus = leave.director_status || leave.directorStatus;
    if (showFacultyActions && facultyStatus === 'Pending') {
      actionsHtml = `
        <div class="leave-card-actions">
          <ion-button fill="outline" color="danger" size="small" class="action-reject" data-id="${leaveId}">Reject</ion-button>
          <ion-button color="success" size="small" class="action-approve" data-id="${leaveId}">Approve</ion-button>
        </div>`;
    } else if (showHodActions && hodStatus === 'Pending') {
      actionsHtml = `
        <div class="leave-card-actions">
          <ion-button fill="outline" color="danger" size="small" class="action-reject" data-id="${leaveId}">Reject</ion-button>
          <ion-button color="success" size="small" class="action-approve" data-id="${leaveId}">Approve</ion-button>
        </div>`;
    }

    const studentName = leave.studentName || leave.student_name || leave.student?.name || '';
    const rollNumber = leave.rollNumber || leave.roll_number || leave.enrollmentNumber || leave.enrollment_number || '';
    const branch = leave.branch || leave.student?.branch || '';
    const semester = leave.semester || leave.student?.semester || '';
    const tgName = leave.tgName || leave.tg_name || '';
    const purpose = leave.purpose || leave.reason || '';
    const locationText = forcedLocationText || (leave.location
      ? (leave.location.address || `${leave.location.lat != null ? leave.location.lat.toFixed(4) : '-'}, ${leave.location.lng != null ? leave.location.lng.toFixed(4) : '-'}`)
      : '');
    const requesterRole = (leave.requesterRole || leave.student?.role || leave.studentRole || '').toUpperCase();
    const isFacultyRequest = requesterRole === 'FACULTY';
    const employeeId = leave.employeeId || leave.student?.employeeId || '';
    const designation = leave.designation || leave.student?.designation || '';
    const department = leave.department || leave.student?.department || '';
    const entryTimeText = leave.entryTime ? this.formatTime(leave.entryTime) : '';
    const exitTimeText = leave.exitTime ? this.formatTime(leave.exitTime) : '';
    const exitTimeHtml = showExitTimeOnly && (entryTimeText || exitTimeText)
      ? `<div class="leave-card-meta">${entryTimeText ? `Entry: ${this.escapeHtml(entryTimeText)}` : ''}${entryTimeText && exitTimeText ? ' &nbsp;&bull;&nbsp; ' : ''}${exitTimeText ? `Exit: ${this.escapeHtml(exitTimeText)}` : ''}</div>`
      : '';

    return `
      <ion-card class="leave-card ${clickable ? 'leave-card-clickable' : ''}" ${clickable ? `data-leave-id="${leaveId}"` : ''} style="${clickable ? 'cursor:pointer;' : ''}">
        <div class="leave-card-header">
          <div class="leave-card-dates">${this.formatDate(leave.from_date || leave.fromDate)} - ${this.formatDate(leave.to_date || leave.toDate)}</div>
          ${this.statusBadgeHtml(leave.overall_status || leave.overallStatus)}
        </div>
        ${showStudentName && studentName ? `<div class="leave-card-student">${this.escapeHtml(studentName)}${!isFacultyRequest && rollNumber ? ` &nbsp;&bull;&nbsp; ${this.escapeHtml(rollNumber)}` : ''}</div>` : ''}
        ${purpose ? `<div class="leave-card-meta">Purpose: ${this.escapeHtml(purpose)}</div>` : ''}
        ${isFacultyRequest ? `${employeeId ? `<div class="leave-card-meta">Emp ID: ${this.escapeHtml(employeeId)}</div>` : ''}${designation ? `<div class="leave-card-meta">Designation: ${this.escapeHtml(designation)}</div>` : ''}${department ? `<div class="leave-card-meta">Department: ${this.escapeHtml(department)}</div>` : ''}` : `${(branch || semester || tgName) ? `<div class="leave-card-meta">${[branch ? `Branch: ${this.escapeHtml(branch)}` : '', semester ? `Sem: ${this.escapeHtml(semester)}` : '', tgName ? `TG: ${this.escapeHtml(tgName)}` : ''].filter(Boolean).join(' &nbsp;&bull;&nbsp; ')}</div>` : ''}`}
        ${locationText ? `<div class="leave-card-meta">Location: ${this.escapeHtml(locationText)}</div>` : ''}
        ${exitTimeHtml}
        <div class="leave-card-meta">Applied on: ${this.formatDate(leave.applied_on || leave.appliedOn)}</div>
        <div class="leave-card-statuses">
          ${this.approvalStepHtml('HOD', hodStatus)}
          ${isFacultyRequest ? this.approvalStepHtml('Director', directorStatus) : ''}
        </div>
        ${actionsHtml}
      </ion-card>
    `;
  },

  async leaveCardsHtml(requests, options = {}) {
    const cards = [];
    for (const leave of requests || []) {
      let resolvedLocationText = undefined;
      if (leave?.location && !leave.location.address && leave.location.lat != null && leave.location.lng != null && typeof Api !== 'undefined') {
        try {
          const resolved = await Api.reverseGeocode(leave.location.lat, leave.location.lng);
          if (resolved) {
            leave.location.address = resolved;
            resolvedLocationText = resolved;
          }
        } catch (_) {}
      }
      cards.push(this.leaveCardHtml(leave, { ...options, locationText: resolvedLocationText }));
    }
    return cards.join('');
  },

  /** Attaches delegated click handlers for approve/reject buttons + clickable cards inside a container. */
  attachLeaveCardHandlers(container, { onApprove, onReject, onCardClick } = {}) {
    if (onApprove) {
      container.querySelectorAll('.action-approve').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          onApprove(btn.dataset.id);
        });
      });
    }
    if (onReject) {
      container.querySelectorAll('.action-reject').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          onReject(btn.dataset.id);
        });
      });
    }
    if (onCardClick) {
      container.querySelectorAll('.leave-card-clickable').forEach((card) => {
        card.addEventListener('click', () => onCardClick(card.dataset.leaveId));
      });
    }
  },
};
