(function () {
    const TOKEN_KEY = 'heliAdminToken';
    const API_BASE = window.HELI_API_BASE ?? '';

    const apiUrl = (path) => `${API_BASE}${path}`;

    const loginEl = document.querySelector('[data-admin-login]');
    const shellEl = document.querySelector('[data-admin-shell]');
    const loginForm = document.querySelector('[data-admin-login-form]');
    const loginError = document.querySelector('[data-admin-login-error]');
    const bookingsBody = document.querySelector('[data-bookings-body]');
    const bookingFilter = document.querySelector('[data-booking-filter]');
    const bookingSearch = document.querySelector('[data-booking-search]');
    const bookingModal = document.querySelector('[data-booking-modal]');
    const bookingModalBody = document.querySelector('[data-booking-modal-body]');
    const bookingModalTitle = document.querySelector('[data-booking-modal-title]');
    const paymentForm = document.querySelector('[data-payment-settings-form]');
    const paymentStatus = document.querySelector('[data-payment-settings-status]');
    const qrForm = document.querySelector('[data-payment-qr-form]');
    const qrStatus = document.querySelector('[data-payment-qr-status]');
    const qrPreview = document.querySelector('[data-payment-qr-preview]');
    const qrEmpty = document.querySelector('[data-payment-qr-empty]');
    const adminTitle = document.querySelector('[data-admin-title]');
    const refreshBtn = document.querySelector('[data-admin-refresh]');
    const adminUrlHint = document.querySelector('[data-admin-url-hint]');

    let screenshotObjectUrl = null;

    const getSiteOrigin = async () => {
        if (window.location.protocol.startsWith('http')) {
            return window.location.origin;
        }
        try {
            const res = await fetch(apiUrl('/api/config'));
            if (res.ok) {
                const data = await res.json();
                if (data.appUrl) return String(data.appUrl).replace(/\/+$/, '');
            }
        } catch {
            /* ignore */
        }
        return '';
    };

    const updateAdminUrlHint = async () => {
        if (!adminUrlHint) return;
        const origin = await getSiteOrigin();
        if (origin) {
            adminUrlHint.innerHTML = `Open <strong>${origin}/admin.html</strong> on your live site.`;
        } else {
            adminUrlHint.textContent = 'Run npm start and open /admin.html on your server (not the HTML file directly).';
        }
    };

    const getToken = () => sessionStorage.getItem(TOKEN_KEY) || '';

    const setToken = (token) => {
        if (token) sessionStorage.setItem(TOKEN_KEY, token);
        else sessionStorage.removeItem(TOKEN_KEY);
    };

    const authHeaders = (json = true) => {
        const headers = { Authorization: `Bearer ${getToken()}` };
        if (json) headers['Content-Type'] = 'application/json';
        return headers;
    };

    const fmtInr = (value) => new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(Number(value || 0));

    const fmtDate = (value) => {
        if (!value) return '—';
        return new Date(value).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const showLogin = () => {
        setToken('');
        loginEl.hidden = false;
        shellEl.hidden = true;
    };

    const showShell = () => {
        loginEl.hidden = true;
        shellEl.hidden = false;
    };

    const setStatus = (el, message, ok) => {
        if (!el) return;
        if (!message) {
            el.hidden = true;
            el.textContent = '';
            return;
        }
        el.hidden = false;
        el.textContent = message;
        el.classList.toggle('success', ok);
        el.classList.toggle('error', !ok);
    };

    const adminFetch = async (path, options = {}) => {
        const res = await fetch(apiUrl(path), {
            ...options,
            headers: {
                ...authHeaders(!(options.body instanceof FormData)),
                ...(options.headers || {}),
            },
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
            setToken('');
            showLogin();
            throw new Error('Session expired. Please sign in again.');
        }
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    };

    let allBookings = [];

    const renderStats = (bookings, stats) => {
        document.querySelector('[data-stat-total]').textContent = stats?.total ?? bookings.length;
        document.querySelector('[data-stat-pending]').textContent = stats?.pending ?? 0;
        document.querySelector('[data-stat-confirmed]').textContent = stats?.confirmed ?? 0;
        document.querySelector('[data-stat-screenshots]').textContent = bookings.filter((b) => b.hasScreenshot).length;
    };

    const filterBookings = (bookings) => {
        const term = String(bookingSearch?.value || '').trim().toLowerCase();
        if (!term) return bookings;
        return bookings.filter((booking) => [
            booking.bookingId,
            booking.packageName,
            booking.email,
            booking.mobile,
            booking.paymentUtr,
            booking.status,
        ].some((value) => String(value || '').toLowerCase().includes(term)));
    };

    const renderBookings = (bookings) => {
        if (!bookings.length) {
            bookingsBody.innerHTML = '<tr><td colspan="8">No bookings found.</td></tr>';
            return;
        }
        bookingsBody.innerHTML = bookings.map((booking) => `
            <tr>
                <td><strong>${escapeHtml(booking.bookingId)}</strong></td>
                <td>${escapeHtml(booking.packageName)}</td>
                <td>
                    <div>${escapeHtml(booking.email)}</div>
                    <small class="muted">${escapeHtml(booking.mobile)}</small>
                </td>
                <td>${fmtInr(booking.totalAmount)}</td>
                <td><span class="status-pill">${escapeHtml(booking.status)}</span></td>
                <td>${escapeHtml(booking.paymentUtr || '—')}</td>
                <td>${fmtDate(booking.createdAt)}</td>
                <td class="admin-table-actions">
                    <button type="button" class="admin-table-btn" data-view-booking="${escapeHtml(booking.bookingId)}">View</button>
                </td>
            </tr>
        `).join('');
    };

    const loadBookings = async () => {
        bookingsBody.innerHTML = '<tr><td colspan="8">Loading bookings…</td></tr>';
        const status = bookingFilter?.value || '';
        const query = status ? `?status=${encodeURIComponent(status)}` : '';
        const data = await adminFetch(`/api/admin/bookings${query}`);
        allBookings = data.bookings || [];
        renderStats(allBookings, data.stats);
        renderBookings(filterBookings(allBookings));
    };

    const renderPassengersTable = (passengers) => {
        if (!passengers?.length) return '<p class="muted">No passenger data.</p>';
        const rows = passengers.map((p) => `
            <tr>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(p.gender)}</td>
                <td>${escapeHtml(p.age)}</td>
            </tr>
        `).join('');
        return `
            <table class="admin-table">
                <thead><tr><th>Name</th><th>Gender</th><th>Age</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>`;
    };

    const clearScreenshotPreview = () => {
        if (screenshotObjectUrl) {
            URL.revokeObjectURL(screenshotObjectUrl);
            screenshotObjectUrl = null;
        }
    };

    const openBookingModal = async (bookingId) => {
        const data = await adminFetch(`/api/admin/bookings/${encodeURIComponent(bookingId)}`);
        const booking = data.booking;
        bookingModalTitle.textContent = `Booking ${booking.bookingId}`;
        clearScreenshotPreview();

        let screenshotHtml = '<p class="muted">No payment screenshot uploaded.</p>';
        if (booking.hasScreenshot) {
            const res = await fetch(apiUrl(`/api/admin/bookings/${encodeURIComponent(bookingId)}/screenshot`), {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.ok) {
                const blob = await res.blob();
                screenshotObjectUrl = URL.createObjectURL(blob);
                if (blob.type === 'application/pdf') {
                    screenshotHtml = `<iframe class="admin-screenshot-frame" src="${screenshotObjectUrl}" title="Payment screenshot PDF"></iframe>`;
                } else {
                    screenshotHtml = `<img class="admin-screenshot-image" src="${screenshotObjectUrl}" alt="Payment screenshot">`;
                }
            }
        }

        bookingModalBody.innerHTML = `
            <div class="admin-detail-card">
                <h3>Booking</h3>
                <dl class="admin-facts">
                    <div><dt>Status</dt><dd><span class="status-pill">${escapeHtml(booking.status)}</span></dd></div>
                    <div><dt>Package</dt><dd>${escapeHtml(booking.packageName)}</dd></div>
                    <div><dt>Departure</dt><dd>${escapeHtml(booking.departureDate)} ${escapeHtml(booking.timeSlot || '')}</dd></div>
                    <div><dt>Return</dt><dd>${escapeHtml(booking.returnDate || '—')} ${escapeHtml(booking.returnTimeSlot || '')}</dd></div>
                    <div><dt>Total</dt><dd>${fmtInr(booking.totalAmount)}</dd></div>
                    <div><dt>UTR</dt><dd>${escapeHtml(booking.paymentUtr || '—')}</dd></div>
                    <div><dt>Booked At</dt><dd>${fmtDate(booking.bookedAt)}</dd></div>
                    <div><dt>Email Sent</dt><dd>${fmtDate(booking.emailSentAt)}</dd></div>
                </dl>
            </div>
            <div class="admin-detail-card">
                <h3>Customer</h3>
                <dl class="admin-facts">
                    <div><dt>Email</dt><dd>${escapeHtml(booking.email)}</dd></div>
                    <div><dt>Mobile</dt><dd>${escapeHtml(booking.mobile)}</dd></div>
                    <div><dt>Passengers</dt><dd>${escapeHtml(booking.passengerCount)}</dd></div>
                </dl>
                ${renderPassengersTable(booking.passengers)}
            </div>
            <div class="admin-detail-card admin-detail-wide">
                <h3>Payment Screenshot</h3>
                ${screenshotHtml}
            </div>`;

        bookingModal.hidden = false;
        bookingModal.classList.add('active');
    };

    const closeBookingModal = () => {
        bookingModal.hidden = true;
        bookingModal.classList.remove('active');
        clearScreenshotPreview();
        bookingModalBody.innerHTML = '';
    };

    const fillPaymentForm = (settings) => {
        if (!paymentForm || !settings) return;
        paymentForm.merchant.value = settings.merchant || '';
        paymentForm.manager.value = settings.manager || '';
        paymentForm.accountNumber.value = settings.accountNumber || '';
        paymentForm.ifsc.value = settings.ifsc || '';
        paymentForm.bank.value = settings.bank || '';

        if (settings.qrImage && !settings.qrImage.includes('assets/images/payment-qr.png')) {
            qrPreview.src = settings.qrImage;
            qrPreview.hidden = false;
            qrEmpty.hidden = true;
        } else {
            qrPreview.hidden = true;
            qrEmpty.hidden = false;
        }
    };

    const loadPaymentSettings = async () => {
        const data = await adminFetch('/api/admin/payment-settings');
        fillPaymentForm(data.settings);
    };

    const switchView = (view) => {
        document.querySelectorAll('[data-admin-view]').forEach((section) => {
            section.hidden = section.getAttribute('data-admin-view') !== view;
        });
        document.querySelectorAll('[data-admin-nav]').forEach((link) => {
            link.classList.toggle('active', link.getAttribute('data-admin-nav') === view);
        });
        adminTitle.textContent = view === 'payment' ? 'Payment Details' : 'Bookings';
    };

    loginForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        setStatus(loginError, '', true);
        const password = String(new FormData(loginForm).get('password') || '').trim();
        if (!password) {
            setStatus(loginError, 'Enter your admin password.', false);
            return;
        }
        if (window.location.protocol === 'file:') {
            const origin = await getSiteOrigin();
            const target = origin ? `${origin}/admin.html` : '/admin.html on your server';
            setStatus(loginError, `Open ${target} in the browser (do not open the HTML file directly).`, false);
            return;
        }
        try {
            const res = await fetch(apiUrl('/api/admin/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (res.status === 503) {
                    throw new Error('Admin password is not set on the server. Add ADMIN_PASSWORD to .env and restart npm start.');
                }
                throw new Error(data.error || 'Login failed');
            }
            setToken(data.token);
            showShell();
            await loadBookings();
        } catch (err) {
            const message = err?.message === 'Failed to fetch'
                ? `Cannot reach the server. Open ${(await getSiteOrigin()) || 'your site'}/admin.html`
                : err.message;
            setStatus(loginError, message, false);
        }
    });

    document.querySelector('[data-admin-logout]')?.addEventListener('click', (event) => {
        event.preventDefault();
        setToken('');
        showLogin();
    });

    document.querySelectorAll('[data-admin-nav]').forEach((link) => {
        link.addEventListener('click', async (event) => {
            const view = link.getAttribute('data-admin-nav');
            if (!view) return;
            event.preventDefault();
            switchView(view);
            if (view === 'bookings') await loadBookings();
            if (view === 'payment') await loadPaymentSettings();
        });
    });

    bookingFilter?.addEventListener('change', () => {
        loadBookings().catch((err) => alert(err.message));
    });

    bookingSearch?.addEventListener('input', () => {
        renderBookings(filterBookings(allBookings));
    });

    refreshBtn?.addEventListener('click', async () => {
        const active = document.querySelector('[data-admin-view]:not([hidden])')?.getAttribute('data-admin-view');
        if (active === 'payment') await loadPaymentSettings();
        else await loadBookings();
    });

    bookingsBody?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-view-booking]');
        if (!button) return;
        openBookingModal(button.getAttribute('data-view-booking')).catch((err) => alert(err.message));
    });

    bookingModal?.querySelector('[data-dismiss-booking-modal]')?.addEventListener('click', closeBookingModal);
    bookingModal?.addEventListener('click', (event) => {
        if (event.target === bookingModal) closeBookingModal();
    });

    paymentForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        setStatus(paymentStatus, '', true);
        const body = Object.fromEntries(new FormData(paymentForm).entries());
        try {
            const data = await adminFetch('/api/admin/payment-settings', {
                method: 'PUT',
                body: JSON.stringify(body),
            });
            fillPaymentForm(data.settings);
            setStatus(paymentStatus, 'Bank details saved.', true);
        } catch (err) {
            setStatus(paymentStatus, err.message, false);
        }
    });

    qrForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        setStatus(qrStatus, '', true);
        const fd = new FormData(qrForm);
        try {
            const data = await adminFetch('/api/admin/payment-settings/qr', {
                method: 'POST',
                body: fd,
            });
            fillPaymentForm(data.settings);
            qrForm.reset();
            setStatus(qrStatus, 'QR image uploaded.', true);
        } catch (err) {
            setStatus(qrStatus, err.message, false);
        }
    });

    const boot = async () => {
        await updateAdminUrlHint();
        if (!getToken()) {
            showLogin();
            return;
        }
        try {
            await adminFetch('/api/admin/bookings');
            showShell();
            await loadBookings();
        } catch {
            showLogin();
        }
    };

    boot();
})();
