// =====================================================================
// E-PASS — Approved Pass screen (QR code + Download/Share PDF)
// Uses the "qrcodejs" library (loaded via CDN in index.html) to render
// the QR code client-side from the pass ID.
// =====================================================================

Pages['epass'] = {
  render() {
    return `
      <ion-header><ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="#" id="epass-back-btn"></ion-back-button></ion-buttons>
        <ion-title>Approved Pass</ion-title>
      </ion-toolbar></ion-header>
      <ion-content fullscreen class="ion-padding"><div id="epass-body" style="min-height:calc(100vh - 110px);"><div class="text-center mt-24"><ion-spinner color="primary"></ion-spinner></div></div></ion-content>
    `;
  },

  async afterRender({ leaveRequestId }) {
    document.getElementById('epass-back-btn').addEventListener('click', (e) => { e.preventDefault(); Router.goBack(); });

    const body = document.getElementById('epass-body');
    try {
      const res = await Api.get(`/epass/${leaveRequestId}`);
      const epass = res.data;

      body.innerHTML = `
        <div class="epass-status-icon"><ion-icon name="checkmark"></ion-icon></div>
        <div class="epass-status-title">Leave Approved</div>
        <div class="epass-status-dates">${UI.formatDate(epass.valid_from)} - ${UI.formatDate(epass.valid_to)}</div>
        ${epass.leave_request?.exit_time || epass.leave_request?.exitTime ? `<div style="margin-top:10px;padding:10px;border-radius:10px;background:linear-gradient(90deg, rgba(34,197,94,0.08), rgba(16,185,129,0.03));color:var(--bgi-success);font-weight:700;text-align:center;">Student exited at ${UI.formatTime(epass.leave_request.exit_time || epass.leave_request.exitTime)}</div>` : ''}

        <ion-card class="epass-qr-card" style="padding:16px;">
          <div id="epass-qr-canvas" style="display:flex;justify-content:center;margin-bottom:12px;"></div>
          <div style="font-size:13px;font-weight:700;color:var(--bgi-text);text-align:center;margin-bottom:4px;">${UI.escapeHtml(epass.pass_id || epass.passId || '')}</div>
          <div style="font-size:11px;color:var(--bgi-text-secondary);text-align:center;">Show this pass at the gate</div>
        </ion-card>

        <ion-card style="margin-top:12px;padding:8px 12px;">
          <div style="font-size:12px;font-weight:700;color:var(--bgi-text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Pass Details</div>
          <div style="display:grid;gap:6px;font-size:12px;color:var(--bgi-text);">
            ${(() => {
              const role = (epass.leave_request?.requester_role || epass.leave_request?.requesterRole || epass.requester_role || epass.requesterRole || 'STUDENT').toUpperCase();
              const label = role === 'FACULTY' ? 'Faculty' : role === 'HOD' ? 'HOD' : role === 'DIRECTOR' ? 'Director' : 'Student';
              return `<div><b>${label}:</b> ${UI.escapeHtml(epass.leave_request?.student_name || epass.student_name || epass.studentName || '')}</div>`;
            })()}
            <div><b>Roll No:</b> ${UI.escapeHtml(epass.roll_number || epass.rollNumber || '')}</div>
            <div><b>Branch:</b> ${UI.escapeHtml(epass.branch || '')}</div>
            <div><b>Leave Type:</b> ${UI.escapeHtml(epass.leave_type || epass.leaveType || '')}</div>
            <div><b>Dates:</b> ${UI.escapeHtml(`${UI.formatDate(epass.from_date || epass.fromDate)} - ${UI.formatDate(epass.to_date || epass.toDate)}`)}</div>
            <div><b>Purpose:</b> ${UI.escapeHtml(epass.leave_request?.purpose || epass.purpose || '')}</div>
            ${epass.leave_request?.entry_time || epass.leave_request?.entryTime ? `<div><b>Entry:</b> ${UI.escapeHtml(UI.formatTime(epass.leave_request.entry_time || epass.leave_request.entryTime))}</div>` : ''}
            ${epass.leave_request?.exit_time || epass.leave_request?.exitTime ? `<div><b>Exit:</b> ${UI.escapeHtml(UI.formatTime(epass.leave_request.exit_time || epass.leave_request.exitTime))}</div>` : ''}
            ${epass.hod_approved_by_name || epass.hodApprovedByName ? `<div><b>HOD:</b> ${UI.escapeHtml(epass.hod_approved_by_name || epass.hodApprovedByName)}</div>` : ''}
            ${epass.director_approved_by_name || epass.directorApprovedByName ? `<div><b>Director:</b> ${UI.escapeHtml(epass.director_approved_by_name || epass.directorApprovedByName)}</div>` : ''}
            <div><b>Approved on:</b> ${UI.escapeHtml(epass.approved_at ? new Date(epass.approved_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')}</div>
            ${epass.location_address ? `<div><b>Location:</b> ${UI.escapeHtml(epass.location_address)}</div>` : ''}
          </div>
        </ion-card>

        ${(epass.pdf_url || epass.pdfUrl) ? `<div style="margin-top:16px;">
          <ion-button expand="block" id="epass-download-btn">
            <ion-icon name="download-outline" slot="start"></ion-icon> Download PDF
          </ion-button>
        </div>` : ''}
      `;

      // Render QR code client-side from the pass ID (qrcodejs CDN library)
      // eslint-disable-next-line no-undef
      new QRCode(document.getElementById('epass-qr-canvas'), {
        text: epass.pass_id || epass.passId || '',
        width: 180,
        height: 180,
        colorDark: '#0A4DAD',
        colorLight: '#ffffff',
      });

      if (document.getElementById('epass-download-btn')) {
        document.getElementById('epass-download-btn').addEventListener('click', () => {
          const pdfLink = epass.pdf_url || epass.pdfUrl;
          if (pdfLink) window.open(pdfLink, '_blank');
        });
      }
    } catch (e) {
      body.innerHTML = `<p class="empty-state">${UI.escapeHtml(e.message)}</p>`;
    }
  },
};
