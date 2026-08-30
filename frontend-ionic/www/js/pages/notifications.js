// =====================================================================
// E-PASS — Notifications Screen
// =====================================================================

Pages['notifications'] = {
  render() {
    return `
      <ion-header><ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="#" id="notif-back-btn"></ion-back-button></ion-buttons>
        <ion-title>Notifications</ion-title>
      </ion-toolbar></ion-header>
      <ion-content fullscreen class="ion-padding" style="--background:var(--bgi-bg);">
        <div id="notif-list" style="min-height:calc(100vh - 112px);">
          <div class="text-center mt-24"><ion-spinner color="primary"></ion-spinner></div>
        </div>
      </ion-content>
    `;
  },

  async afterRender() {
    const syncUnreadState = async () => {
      try {
        const unreadRes = await Api.get('/notifications/unread-count');
        const count = Number(unreadRes?.data?.count || 0);
        document.querySelectorAll('#notif-bell-badge, .notif-badge').forEach((badge) => {
          if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
          } else {
            badge.textContent = '';
            badge.style.display = 'none';
          }
        });
        window.dispatchEvent(new CustomEvent('notifications:state-changed', { detail: { unreadCount: count } }));
        const badge = document.getElementById('notif-badge');
        if (badge) {
          badge.style.display = count > 0 ? 'block' : 'none';
          badge.textContent = count > 99 ? '99+' : count;
        }
      } catch (_) {
        document.querySelectorAll('#notif-bell-badge, .notif-badge').forEach((badge) => {
          badge.textContent = '';
          badge.style.display = 'none';
        });
        window.dispatchEvent(new CustomEvent('notifications:state-changed', { detail: { unreadCount: 0 } }));
      }
    };

    document.getElementById('notif-back-btn').addEventListener('click', async (e) => {
      e.preventDefault();
      await syncUnreadState();
      Router.goBack();
    });

    const list = document.getElementById('notif-list');
    const currentUser = Auth.getCurrentUser() || Storage.getUser() || {};
    try {
      const res = await Api.get('/notifications');
      const notifications = res.data || [];
      if (notifications.length === 0) {
        list.innerHTML = `<p class="empty-state">No notifications yet</p>`;
        return;
      }

      const unreadIds = notifications
        .filter((n) => !(n.isRead ?? n.is_read))
        .map((n) => n.id || n._id)
        .filter(Boolean);

      if (unreadIds.length) {
        await Promise.all(unreadIds.map(async (id) => {
          try {
            await Api.put(`/notifications/${id}/read`, {});
          } catch (_) {}
        }));
        await syncUnreadState();
      }

      const iconFor = (type) => {
        if (type === 'FACULTY_APPROVED' || type === 'HOD_APPROVED') return 'checkmark-circle-outline';
        if (type === 'FACULTY_REJECTED' || type === 'HOD_REJECTED') return 'close-circle-outline';
        if (type === 'LEAVE_SUBMITTED') return 'send-outline';
        return 'notifications-outline';
      };

      list.innerHTML = notifications.map((n) => {
        const leaveReq = n.leave_request || n.leaveRequest || n.leave_request_id || '';
        const isRead = Boolean(n.isRead ?? n.is_read);
        const isHod = (currentUser.role === 'HOD');
        const markReadButton = !isRead
          ? `<ion-button size="small" fill="clear" color="medium" class="notif-read-btn" data-id="${n.id}" style="font-size:11px;">Mark as Read</ion-button>`
          : '';
        const actionButtons = (isHod && n.type === 'LEAVE_SUBMITTED' && leaveReq)
          ? `<div style="padding:10px 14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:flex-end;">
               <ion-button size="small" color="success" class="notif-approve-btn" data-leave="${leaveReq}" data-id="${n.id}">Approve</ion-button>
               <ion-button size="small" color="danger" class="notif-reject-btn" data-leave="${leaveReq}" data-id="${n.id}">Reject</ion-button>
               ${markReadButton}
             </div>`
          : `<div style="padding:10px 14px;display:flex;justify-content:flex-end;">${markReadButton}</div>`;

        return `
        <ion-card class="notif-item ${isRead ? '' : 'unread'}" data-id="${n.id}" data-type="${n.type}" data-leave-request="${leaveReq}" style="cursor:pointer;">
          <ion-item lines="none">
            <ion-icon name="${iconFor(n.type)}" slot="start" color="primary"></ion-icon>
            <ion-label>
              <h3 style="font-weight:600;">${UI.escapeHtml(n.title)}</h3>
              <p>${UI.escapeHtml(n.message)}</p>
            </ion-label>
            <ion-note slot="end">${UI.formatDate(n.created_at || n.createdAt)}</ion-note>
          </ion-item>
          ${actionButtons}
        </ion-card>`;
      }).join('');

      const markNotificationRead = async (id, el) => {
        try {
          await Api.put(`/notifications/${id}/read`, {});
          if (el) el.classList.remove('unread');
          await syncUnreadState();
        } catch (_) {}
      };

      // Mark read on click and wire approve/reject buttons
      list.querySelectorAll('.notif-item').forEach((card) => {
        card.addEventListener('click', async () => {
          await markNotificationRead(card.dataset.id, card);
        });
      });

      list.querySelectorAll('.notif-read-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          if (!id) return;
          const card = btn.closest('.notif-item');
          await markNotificationRead(id, card);
        });
      });

      // Approve button handler (HOD)
      list.querySelectorAll('.notif-approve-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const leaveId = btn.dataset.leave;
          if (!leaveId) return UI.toast('Leave ID missing', 'danger');
          try {
            await Api.put(`/hod/requests/${leaveId}/approve`, { remark: 'Approved via notification' });
            UI.toast('Approved', 'success');
            // mark notification read
            const nid = btn.dataset.id;
            if (nid) await Api.put(`/notifications/${nid}/read`, {});
            await syncUnreadState();
            btn.disabled = true;
            // refresh list
            this.afterRender();
          } catch (err) { UI.toast(err.message || 'Approve failed', 'danger'); }
        });
      });

      list.querySelectorAll('.notif-reject-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const leaveId = btn.dataset.leave;
          if (!leaveId) return UI.toast('Leave ID missing', 'danger');
          const { confirmed, remark } = await UI.confirmWithRemark({ title: 'Reject Leave?', confirmText: 'Reject', confirmColor: 'danger' });
          if (!confirmed) return;
          try {
            await Api.put(`/hod/requests/${leaveId}/reject`, { remark });
            UI.toast('Rejected', 'medium');
            const nid = btn.dataset.id;
            if (nid) await Api.put(`/notifications/${nid}/read`, {});
            await syncUnreadState();
            btn.disabled = true;
            this.afterRender();
          } catch (err) { UI.toast(err.message || 'Reject failed', 'danger'); }
        });
      });
    } catch (e) {
      list.innerHTML = `<p class="empty-state">${UI.escapeHtml(e.message)}</p>`;
    }
  },
};
