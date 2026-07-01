(function () {
    const STORAGE_KEY = 'heliBookingDraft';

    const PAYMENT_DETAILS = {
        merchant: 'Trans Bharat Aviation',
        manager: 'Raja Kumar',
        accountNumber: '38408100014453',
        ifsc: 'BARB0FATWAH',
        bank: 'Bank of Baroda',
        qrImage: 'assets/images/payment-qr.png',
    };

    const COMPANY_GST = '05AAACT0236C2Z2';
    const COMPANY_NAME = 'Trans Bharat Aviation';

    const API_BASE = window.HELI_API_BASE ?? '';
    let apiEnabled = window.HELI_USE_MOCK === true ? false : null;

    const apiUrl = (path) => `${API_BASE}${path}`;

    const checkApi = async () => {
        if (apiEnabled !== null) return apiEnabled;
        try {
            const res = await fetch(apiUrl('/api/health'), { method: 'GET' });
            if (!res.ok) throw new Error('health failed');
            const data = await res.json();
            apiEnabled = Boolean(data.ok && data.supabase);
        } catch {
            apiEnabled = false;
        }
        return apiEnabled;
    };

    const apiFetch = async (path, options = {}) => {
        const res = await fetch(apiUrl(path), options);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    };

    const PACKAGES = {
        '1': {
            name: 'Chardham Yatra',
            total: 89499,
            route: 'Dehradun - Yamunotri - Gangotri - Kedarnath - Badrinath',
            from: 'Dehradun',
            to: 'Dehradun',
            helipad: 'Dehradun Helipad',
            operator: 'Trans Bharat Aviation',
            merchant: 'Himalayan heli service Pvt Ltd',
            manager: 'Ajmar Kullu',
            hasReturn: true,
        },
        '2': {
            name: 'Do Dham Yatra',
            total: 39999,
            route: 'Dehradun - Kedarnath - Badrinath',
            from: 'Dehradun',
            to: 'Dehradun',
            helipad: 'Dehradun Helipad',
            operator: 'Trans Bharat Aviation',
            merchant: 'Himalayan heli service Pvt Ltd',
            manager: 'Ajmar Kullu',
            hasReturn: true,
        },
        '8': {
            name: 'Sersi to Kedarnath Yatra - Two Way',
            total: 6086,
            route: 'Sersi - Kedarnath',
            from: 'Sersi',
            to: 'Kedarnath',
            helipad: 'Sersi Helipad',
            operator: 'Trans Bharat Aviation',
            merchant: 'Arrow Aircraft',
            manager: 'Booking Desk',
            hasReturn: true,
        },
        '7': {
            name: 'Sersi to Kedarnath Yatra - One Way',
            total: 3043,
            route: 'Sersi - Kedarnath',
            from: 'Sersi',
            to: 'Kedarnath',
            helipad: 'Sersi Helipad',
            operator: 'Trans Bharat Aviation',
            merchant: 'Arrow Aircraft',
            manager: 'Booking Desk',
            hasReturn: false,
        },
        '10': {
            name: 'Guptkashi to Kedarnath Yatra - Two Way',
            total: 12154,
            route: 'Guptkashi - Kedarnath',
            from: 'Guptkashi',
            to: 'Kedarnath',
            helipad: 'Guptkashi Helipad',
            operator: 'Trans Bharat Aviation',
            merchant: 'Trans Bharat Aviations',
            manager: 'Booking Desk',
            hasReturn: true,
        },
        '9': {
            name: 'Guptkashi to Kedarnath Yatra - One Way',
            total: 6077,
            route: 'Guptkashi - Kedarnath',
            from: 'Guptkashi',
            to: 'Kedarnath',
            helipad: 'Guptkashi Helipad',
            operator: 'Trans Bharat Aviation',
            merchant: 'Trans Bharat Aviations',
            manager: 'Booking Desk',
            hasReturn: false,
        },
        '12': {
            name: 'Phata to Kedarnath Yatra - Two Way',
            total: 9680,
            route: 'Phata - Kedarnath',
            from: 'Phata',
            to: 'Kedarnath',
            helipad: 'Phata Helipad',
            operator: 'Trans Bharat Aviation',
            merchant: 'United Helicopters',
            manager: 'Booking Desk',
            hasReturn: true,
        },
        '11': {
            name: 'Phata to Kedarnath Yatra - One Way',
            total: 4840,
            route: 'Phata - Kedarnath',
            from: 'Phata',
            to: 'Kedarnath',
            helipad: 'Phata Helipad',
            operator: 'Trans Bharat Aviation',
            merchant: 'United Helicopters',
            manager: 'Booking Desk',
            hasReturn: false,
        },
        '4': {
            name: 'Dehradun to Kedarnath Yatra - Two Way',
            total: 22500,
            route: 'Dehradun - Kedarnath',
            from: 'Dehradun',
            to: 'Kedarnath',
            helipad: 'Dehradun Helipad',
            operator: 'Trans Bharat Aviation',
            merchant: 'United Helicopters',
            manager: 'Booking Desk',
            hasReturn: true,
        },
        '3': {
            name: 'Dehradun to Kedarnath Yatra - One Way',
            total: 11250,
            route: 'Dehradun - Kedarnath',
            from: 'Dehradun',
            to: 'Kedarnath',
            helipad: 'Dehradun Helipad',
            operator: 'Trans Bharat Aviation',
            merchant: 'United Helicopters',
            manager: 'Booking Desk',
            hasReturn: false,
        },
    };

    const fmtInr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
    const fmtDate = (iso) => {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    };
    const fmtDateDash = (iso) => {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        return `${d}-${m}-${y}`;
    };
    const bookingTimestamp = () => {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const hours = now.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        return `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(h12)}:${pad(now.getMinutes())} ${ampm}`;
    };
    const maskAadhaar = (value) => {
        const digits = String(value || '').replace(/\D/g, '');
        if (digits.length < 4) return 'XXXXXXXX';
        return `XXXXXXXX${digits.slice(-4)}`;
    };
    const maskReg = (value) => {
        const raw = String(value || '');
        if (raw.length <= 4) return raw;
        return `XXXXXXXX${raw.slice(-4)}`;
    };

    const priceBreakdown = (total) => {
        const convenience = Math.max(99, Math.round(total * 0.00172));
        const helicopter = total - convenience;
        const fare = Math.round(helicopter / 1.05);
        const gst = helicopter - fare;
        return { fare, gst, helicopter, convenience, total };
    };

    const hydrateDraft = (draft) => {
        if (!draft || typeof draft !== 'object') return null;
        const packageId = String(draft.packageId || '1');
        if (!draft.pkg || !draft.pkg.name) {
            draft.pkg = PACKAGES[packageId] || PACKAGES['1'];
        }
        if (!draft.packageName) draft.packageName = draft.pkg.name;
        if (!draft.total) draft.total = draft.pkg.total * (draft.passengerCount || 1);
        return draft;
    };

    const readDraft = () => {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw || raw === 'undefined' || raw === 'null') return null;
            return hydrateDraft(JSON.parse(raw));
        } catch {
            return null;
        }
    };

    const saveDraft = (draft) => {
        if (!draft || typeof draft !== 'object') return;
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(hydrateDraft(draft)));
    };

    const formToDraft = (form) => {
        const fd = new FormData(form);
        const passengers = [];
        const count = Number(fd.get('passenger_count') || 1);
        for (let i = 0; i < count; i += 1) {
            passengers.push({
                name: fd.get(`passengers[${i}][name]`) || '',
                gender: fd.get(`passengers[${i}][gender]`) || '',
                age: fd.get(`passengers[${i}][age]`) || '',
                aadhaar: fd.get(`passengers[${i}][aadhaar]`) || '',
                registration: fd.get(`passengers[${i}][registration]`) || '',
            });
        }
        const packageId = String(fd.get('package_id') || '1');
        const pkg = PACKAGES[packageId] || PACKAGES['1'];
        return {
            packageId,
            packageName: pkg.name,
            departureDate: fd.get('departure_date') || '',
            returnDate: fd.get('return_date') || '',
            timeSlot: fd.get('time_slot') || '',
            returnTimeSlot: fd.get('return_time_slot') || '',
            email: fd.get('email') || '',
            mobile: fd.get('mobile') || '',
            passengerCount: count,
            passengers,
            total: pkg.total * count,
            pkg,
            bookingId: String(Math.floor(1000000000 + Math.random() * 9000000000)),
            token: Math.random().toString(36).slice(2) + Date.now().toString(36),
        };
    };

    const passengerRows = (passengers) => passengers.map((p) => `
        <div class="heli-passenger-row">
            <span class="heli-check">✓</span>
            <strong>${p.name}</strong>
            <span>${p.gender}</span>
            <span>${p.age}</span>
            <span>${p.registration}</span>
            <span class="heli-row-arrow">›</span>
        </div>`).join('');

    const renderSummary = (draft) => {
        const { pkg, passengerCount, passengers, total } = draft;
        const prices = priceBreakdown(total);
        const seatLabel = passengerCount === 1 ? '1 seat' : `${passengerCount} seats`;
        const bookLabel = `Book ${passengerCount} Seat${passengerCount === 1 ? '' : 's'}`;
        const returnBlock = pkg.hasReturn && draft.returnDate ? `
            <div class="heli-route-card">
                <div class="heli-route-label">Return</div>
                <div class="heli-route-segment">
                    <div>
                        <strong>${pkg.to}</strong>
                        <span>${fmtDate(draft.returnDate)}</span>
                        ${draft.returnTimeSlot ? `<b>${draft.returnTimeSlot}</b>` : ''}
                        <small>${pkg.helipad}</small>
                    </div>
                </div>
            </div>` : '';

        document.title = 'Booking Summary - Trans Bharat Aviation';
        const main = document.querySelector('[data-mock-summary]');
        if (!main) return;
        main.innerHTML = `
    <section class="heli-summary-shell" aria-label="Booking summary">
        <div class="heli-summary-main">
            <div class="heli-route-card">
                <div class="heli-route-label">Onward</div>
                <div class="heli-route-segment">
                    <div>
                        <strong>${pkg.route}</strong>
                        <span>${fmtDate(draft.departureDate)}</span>
                        <b>${draft.timeSlot}</b>
                        <small>${pkg.helipad}</small>
                        <em>${COMPANY_NAME}</em>
                    </div>
                    <div class="heli-route-divider">to</div>
                    <div>
                        <strong>${pkg.to}</strong>
                        <span>${fmtDate(draft.departureDate)}</span>
                        <small>${pkg.helipad}</small>
                    </div>
                </div>
            </div>
            ${returnBlock}
            <section class="heli-passenger-panel">
                <div class="heli-panel-head">
                    <div>
                        <h1>Travelling Passengers</h1>
                        <p>Verify and edit govt. ID details after selection</p>
                    </div>
                    <a href="booking_package_id_${draft.packageId}.html">Change</a>
                </div>
                <div class="heli-pilgrim-row">
                    <span>Pilgrims</span>
                    <strong>${passengerCount} / ${passengerCount} Selected</strong>
                </div>
                <div class="heli-passenger-table">${passengerRows(passengers)}</div>
                <div class="heli-id-note">Kindly carry the original ID proofs along with the ticket</div>
                <a class="heli-book-button" href="payment.html" data-mock-to-payment>${bookLabel}</a>
            </section>
        </div>
        <aside class="heli-price-card">
            <h2>Price Details (${seatLabel})</h2>
            <div class="heli-price-group">
                <button type="button" aria-label="Helicopter fare expanded">⌃</button>
                <strong>Helicopter Fare</strong>
                <span>${fmtInr(prices.helicopter)}</span>
            </div>
            <div class="heli-price-line"><span>Fare</span><strong>${fmtInr(prices.fare)}</strong></div>
            <div class="heli-price-line"><span>GST</span><strong>${fmtInr(prices.gst)}</strong></div>
            <div class="heli-price-group">
                <button type="button" aria-label="Convenience fee expanded">⌃</button>
                <strong>Convenience Fee</strong>
                <span>${fmtInr(prices.convenience)}</span>
            </div>
            <div class="heli-price-total"><span>Total</span><strong>${fmtInr(total)}</strong></div>
        </aside>
    </section>`;
    };

    const renderPayment = (draft) => {
        const { pkg, total } = draft;
        document.title = 'Payment - Trans Bharat Aviation';
        const main = document.querySelector('[data-mock-payment]');
        if (!main) return;
        main.innerHTML = `
    <section class="payment-shell">
        <div class="payment-main">
            <span class="secure-pill"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>Secure UPI Checkout</span>
            <h1>Complete Your Payment</h1>
            <p>Secure your ${pkg.name} booking by completing the payment below.</p>
            <div class="pay-apps" aria-label="Supported UPI payment apps">
                <button type="button" class="pay-app-btn" data-show-upi-qr="Google Pay" aria-label="Pay with Google Pay">
                    <img src="assets/images/payment-google-pay.svg" alt="">
                </button>
                <button type="button" class="pay-app-btn" data-show-upi-qr="PhonePe" aria-label="Pay with PhonePe">
                    <img src="assets/images/payment-phonepe.svg" alt="">
                </button>
                <button type="button" class="pay-app-btn" data-show-upi-qr="BHIM UPI" aria-label="Pay with BHIM UPI">
                    <img src="assets/images/payment-bhim-upi.svg" alt="">
                </button>
                <button type="button" class="pay-app-btn" data-show-upi-qr="Paytm" aria-label="Pay with Paytm">
                    <img src="assets/images/payment-paytm.svg" alt="">
                </button>
            </div>
            <p class="pay-apps-hint">Tap a payment app to view the UPI QR code.</p>
            <div class="payment-card">
                <div class="card-heading">
                    <span>Secure Payment Details — Please transfer the booking amount to the company account mentioned below for booking confirmation.</span>
                </div>
                <br>
                <div class="merchant-grid">
                    <div class="copy-tile"><span>Merchant Name</span><strong>${PAYMENT_DETAILS.merchant}</strong><button type="button" data-copy="${PAYMENT_DETAILS.merchant}"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><rect x="2" y="2" width="13" height="13" rx="2"/></svg>Copy</button></div>
                    <div class="copy-tile"><span>Booking Manager</span><strong>${PAYMENT_DETAILS.manager}</strong><button type="button" data-copy="${PAYMENT_DETAILS.manager}"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><rect x="2" y="2" width="13" height="13" rx="2"/></svg>Copy</button></div>
                    <div class="copy-tile"><span>Account Number</span><strong>${PAYMENT_DETAILS.accountNumber}</strong><button type="button" data-copy="${PAYMENT_DETAILS.accountNumber}"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><rect x="2" y="2" width="13" height="13" rx="2"/></svg>Copy</button></div>
                    <div class="copy-tile"><span>IFSC</span><strong>${PAYMENT_DETAILS.ifsc}</strong><button type="button" data-copy="${PAYMENT_DETAILS.ifsc}"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><rect x="2" y="2" width="13" height="13" rx="2"/></svg>Copy</button></div>
                    <div class="copy-tile"><span>Bank</span><strong>${PAYMENT_DETAILS.bank}</strong><button type="button" data-copy="${PAYMENT_DETAILS.bank}"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><rect x="2" y="2" width="13" height="13" rx="2"/></svg>Copy</button></div>
                </div>
            </div>
            <form class="payment-card confirm-card" method="post" enctype="multipart/form-data" data-mock-payment-form>
                <div class="card-heading">
                    <h2><svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Confirm Ticket</h2><span>Proof</span>
                </div>
                <p>After completing payment, enter your UTR number and upload screenshot.</p>
                <label>Transaction ID / UTR
                    <input name="payment_utr" pattern="[0-9]{3,99}" minlength="3" maxlength="99" inputmode="numeric" placeholder="Enter transaction ID / UTR" required>
                </label>
                <label>Upload Payment Screenshot
                    <input type="file" name="payment_screenshot" accept=".jpg,.jpeg,.png,.webp,.pdf" required>
                </label>
                <button class="btn btn-red full" type="submit"><svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Confirm Ticket</button>
                <small>Payment once completed is refundable as per service policy.</small>
            </form>
        </div>
        <aside class="amount-card">
            <span>Amount to Pay</span>
            <strong>${fmtInr(total)}</strong>
            <p>Total fare for ${pkg.name} booking</p>
        </aside>
    </section>`;
        initPaymentPage(main, draft);
    };

    const showUpiQrModal = (appName, total) => {
        const existing = document.querySelector('[data-upi-qr-modal]');
        existing?.remove();

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop active';
        backdrop.setAttribute('data-upi-qr-modal', '');
        backdrop.innerHTML = `
            <div class="modal payment-qr-modal" role="dialog" aria-modal="true" aria-label="UPI QR code">
                <button class="modal-close" type="button" data-dismiss-modal aria-label="Close">
                    <svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
                <h2 style="margin:0 0 8px">Pay with ${appName}</h2>
                <p style="margin:0 0 16px;color:#64748b">Scan this QR to pay <strong>${fmtInr(total)}</strong></p>
                <img class="qr-image" src="${PAYMENT_DETAILS.qrImage}" alt="UPI payment QR code" data-qr-image>
                <p class="qr-fallback" data-qr-fallback hidden>QR image missing. Save your QR as <code>assets/images/payment-qr.png</code></p>
                <p style="margin:12px 0 0;font-size:13px;color:#64748b">You can also transfer using the bank details on this page.</p>
                <div class="modal-actions">
                    <button class="btn btn-light" type="button" data-dismiss-modal>Close</button>
                </div>
            </div>`;
        document.body.appendChild(backdrop);

        backdrop.querySelector('[data-qr-image]')?.addEventListener('error', () => {
            const img = backdrop.querySelector('[data-qr-image]');
            const fallback = backdrop.querySelector('[data-qr-fallback]');
            if (img) img.style.display = 'none';
            if (fallback) fallback.hidden = false;
        });

        const close = () => backdrop.remove();
        backdrop.querySelectorAll('[data-dismiss-modal]').forEach((el) => {
            el.addEventListener('click', close);
        });
        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop) close();
        });
    };

    const initPaymentPage = (main, draft) => {
        main.querySelectorAll('[data-show-upi-qr]').forEach((button) => {
            button.addEventListener('click', () => {
                showUpiQrModal(button.getAttribute('data-show-upi-qr') || 'UPI', draft.total);
            });
        });
    };

    const downloadTicketPdf = async (draft) => {
        const hydrated = hydrateDraft({ ...draft });
        const saveBlob = (blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ticket-${hydrated.bookingId || 'booking'}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        };

        if (hydrated.bookingId && hydrated.token) {
            try {
                const res = await fetch(
                    apiUrl(`/api/bookings/${hydrated.bookingId}/ticket.pdf?token=${encodeURIComponent(hydrated.token)}`),
                );
                if (res.ok) {
                    saveBlob(await res.blob());
                    return;
                }
            } catch {
                /* fall through */
            }
        }

        if (hydrated.bookingId && hydrated.confirmed) {
            try {
                const res = await fetch(
                    apiUrl(`/api/bookings/verify/${encodeURIComponent(hydrated.bookingId)}/ticket.pdf`),
                );
                if (res.ok) {
                    saveBlob(await res.blob());
                    return;
                }
            } catch {
                /* fall through */
            }
        }

        try {
            const res = await fetch(apiUrl('/api/tickets/generate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(hydrated),
            });
            if (!res.ok) throw new Error('PDF generation failed');
            saveBlob(await res.blob());
        } catch (err) {
            alert(err.message || 'Could not download ticket PDF');
        }
    };

    const showConfirmModal = (draft) => {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop active';
        backdrop.innerHTML = `
            <div class="modal" role="dialog" aria-modal="true" aria-label="Booking confirmed">
                <button class="modal-close" type="button" data-dismiss-modal aria-label="Close">
                    <svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
                <h2 style="margin:0 0 8px;color:#166534;">Booking Confirmed</h2>
                <p style="margin:0;color:#334155;">Your payment proof has been received. Booking ID <strong>${draft.bookingId}</strong> is confirmed.</p>
                <div class="modal-actions">
                    <button class="btn btn-red" type="button" data-download-ticket>Download Ticket</button>
                    <button class="btn btn-light" type="button" data-dismiss-modal>Close</button>
                </div>
            </div>`;
        document.body.appendChild(backdrop);
        backdrop.querySelector('[data-download-ticket]')?.addEventListener('click', () => {
            downloadTicketPdf(draft);
        });
        backdrop.querySelectorAll('[data-dismiss-modal]').forEach((button) => {
            button.addEventListener('click', () => backdrop.remove());
        });
    };

    const renderTicket = (draft) => {
        document.title = 'Ticket - Trans Bharat Aviation';
        const main = document.querySelector('[data-mock-ticket]');
        if (!main) return;
        const { pkg, passengerCount, passengers, total } = draft;
        const bookedAt = draft.bookedAt || bookingTimestamp();
        const passengerRows = passengers.map((p, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${p.name}</td>
                <td>${p.gender}</td>
                <td>${p.age}</td>
                <td>Aadhaar ${maskAadhaar(p.aadhaar || '')}</td>
                <td>${maskReg(p.registration)}</td>
                <td>CONFIRMED</td>
            </tr>`).join('');
        const returnBlock = pkg.hasReturn && draft.returnDate ? `
            <div class="heli-route-card">
                <div class="heli-route-label">Return</div>
                <div class="heli-route-segment">
                    <div>
                        <strong>${pkg.to}</strong>
                        <span>${fmtDate(draft.returnDate)}</span>
                        <small>${pkg.helipad}</small>
                    </div>
                </div>
            </div>` : '';

        main.innerHTML = `
    <div class="alert success" data-ticket-alert>
        <strong>Booking confirmed successfully.</strong> Your ticket is ready.${sessionStorage.getItem('heliEmailSent') ? ' A confirmation email has been sent to your registered address.' : ''} Use the download button below to save your Trans Bharat Aviation ticket PDF.
        <button type="button" data-dismiss-alert aria-label="Dismiss">×</button>
    </div>
    <article class="screen-ticket" id="ticket-print-root">
        <div class="screen-ticket-head">
            <h1>Trans Bharat Aviation Ticket</h1>
            <p>Official helicopter yatra booking confirmation</p>
            <span>Status: CONFIRMED</span>
        </div>
        <div class="screen-ticket-body">
            <div class="screen-ticket-grid ticket-grid">
                <div><span>Booking ID</span><strong>${draft.bookingId}</strong></div>
                <div><span>Booking Date &amp; Time</span><strong>${bookedAt}</strong></div>
                <div><span>Number of Passengers</span><strong>${passengerCount}</strong></div>
                <div><span>Booking Type</span><strong>GENERAL</strong></div>
                <div><span>Reporting Time</span><strong>${fmtDate(draft.departureDate)} ${draft.timeSlot}</strong></div>
                <div><span>Package</span><strong>${draft.packageName}</strong></div>
            </div>
            <div class="heli-route-card" style="margin-bottom:18px;">
                <div class="heli-route-label">Onward</div>
                <div class="heli-route-segment">
                    <div>
                        <strong>${pkg.route}</strong>
                        <span>${fmtDate(draft.departureDate)}</span>
                        <b>${draft.timeSlot}</b>
                        <small>${pkg.helipad}</small>
                        <em>${COMPANY_NAME}</em>
                    </div>
                    <div class="heli-route-divider">to</div>
                    <div>
                        <strong>${pkg.to}</strong>
                        <span>${fmtDate(draft.departureDate)}</span>
                        <small>${pkg.helipad}</small>
                    </div>
                </div>
            </div>
            ${returnBlock}
            <h2>Passenger Details</h2>
            <div class="screen-ticket-table table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>S No.</th>
                            <th>Name</th>
                            <th>Gender</th>
                            <th>Age</th>
                            <th>ID Proof</th>
                            <th>Yatra Reg. No.</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${passengerRows}</tbody>
                </table>
            </div>
            <div class="screen-total-box total-box">Total Paid: ${fmtInr(total)}</div>
            <h2 style="margin-top:30px;">GST Details</h2>
            <div class="screen-ticket-grid ticket-grid">
                <div><span>Booker Name</span><strong>-</strong></div>
                <div><span>Booker GST No.</span><strong>-</strong></div>
                <div><span>Helicopter Service Operator</span><strong>${COMPANY_NAME}</strong></div>
                <div><span>Service Provider Name</span><strong>Trans Bharat Aviation</strong></div>
                <div><span>GST No. (Operator)</span><strong>${COMPANY_GST}</strong></div>
                <div><span>GST No. (Trans Bharat Aviation)</span><strong>${COMPANY_GST}</strong></div>
                <div><span>Place of Supply</span><strong>Uttarakhand</strong></div>
                <div><span>State Code</span><strong>Delhi</strong></div>
                <div><span>Booker State</span><strong>Delhi</strong></div>
            </div>
        </div>
        <div class="screen-ticket-notes ticket-notes">
            <strong>Important:</strong>
            <ul>
                <li>Kindly carry the original ID proofs along with the ticket.</li>
                <li>Report at the designated helipad at least 2 hours before departure.</li>
                <li>Ticket booking is subject to weather and operational clearance.</li>
            </ul>
        </div>
    </article>
    <div class="screen-ticket-actions ticket-actions">
        <a class="btn btn-light" href="index.html">Back to Home</a>
        <button class="btn btn-blue" type="button" data-download-ticket>Download Ticket</button>
    </div>`;

        main.querySelector('[data-download-ticket]')?.addEventListener('click', () => downloadTicketPdf(draft));
        if (draft.showConfirmModal !== false) {
            showConfirmModal(draft);
        }
    };

    const renderVerify = async (code) => {
        const main = document.querySelector('.verify-check-form')?.closest('main');
        if (!main) return;

        let draft = null;
        if (await checkApi()) {
            try {
                const data = await apiFetch(`/api/bookings/verify/${encodeURIComponent(code)}`);
                draft = data.draft;
            } catch {
                draft = null;
            }
        } else {
            draft = readDraft();
            if (!draft || String(draft.bookingId) !== String(code)) draft = null;
        }
        if (!draft) {
            const form = main.querySelector('.verify-check-form');
            const err = document.createElement('p');
            err.className = 'alert';
            err.style.marginTop = '16px';
            err.textContent = 'Booking not found or not confirmed. Check your 10-digit booking ID.';
            main.querySelector('.verify-error')?.remove();
            err.classList.add('verify-error');
            form?.insertAdjacentElement('afterend', err);
            return;
        }

        document.title = 'Verify Booking - Trans Bharat Aviation';
        const rows = draft.passengers.map((p) => `
            <tr><td>${p.name}</td><td>${p.gender}</td><td>${p.age}</td><td>${p.registration}</td></tr>`).join('');
        const form = main.querySelector('.verify-check-form');
        if (form) form.style.display = 'none';
        const result = document.createElement('div');
        result.className = 'verify-paid-result';
        result.innerHTML = `
        <div class="verify-status-strip">
            <span>Booking Status</span>
            <strong>CONFIRMED</strong>
        </div>
        <div class="verify-paid-meta">
            <p>Booking ID <strong>${code || draft.bookingId}</strong></p>
            <p>Package <strong>${draft.packageName}</strong></p>
            <p>Journey <strong>${fmtDate(draft.departureDate)} · ${draft.timeSlot}</strong></p>
        </div>
        <div class="verify-passenger-card">
            <h2>Passenger Details</h2>
            <table>
                <thead><tr><th>Name</th><th>Gender</th><th>Age</th><th>Registration</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <div class="verify-paid-total"><span>Total</span><strong>${fmtInr(draft.total)}</strong></div>
        <div class="verify-paid-actions">
            <button class="btn btn-blue" type="button" data-download-ticket>Download Ticket</button>
        </div>`;
        main.appendChild(result);
        result.querySelector('[data-download-ticket]')?.addEventListener('click', () => downloadTicketPdf(draft));
    };

    document.querySelectorAll('[data-passenger-form]').forEach((form) => {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const draft = formToDraft(form);
            saveDraft(draft);

            if (await checkApi()) {
                try {
                    const data = await apiFetch('/api/bookings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            packageId: draft.packageId,
                            departureDate: draft.departureDate,
                            returnDate: draft.returnDate,
                            timeSlot: draft.timeSlot,
                            returnTimeSlot: draft.returnTimeSlot,
                            email: draft.email,
                            mobile: draft.mobile,
                            passengerCount: draft.passengerCount,
                            passengers: draft.passengers,
                        }),
                    });
                    if (data.draft) {
                        saveDraft({ ...draft, ...data.draft, pkg: draft.pkg });
                    }
                } catch (err) {
                    console.warn('API booking save failed, continuing with local draft:', err.message);
                }
            }

            window.location.href = '/booking_summary.html';
        });
    });

    document.querySelector('[data-mock-summary]')?.addEventListener('click', (event) => {
        if (event.target.closest('[data-mock-to-payment]')) {
            event.preventDefault();
            window.location.href = 'payment.html';
        }
    });

    document.addEventListener('submit', async (event) => {
        const form = event.target;
        if (form.matches('[data-mock-payment-form]')) {
            event.preventDefault();
            const draft = readDraft();
            if (!draft) {
                window.location.href = 'index.html';
                return;
            }
            if (await checkApi()) {
                const fd = new FormData(form);
                try {
                    const res = await fetch(apiUrl(`/api/bookings/${draft.bookingId}/confirm`), {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${draft.token}` },
                        body: fd,
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                        alert(data.error || 'Payment confirmation failed');
                        return;
                    }
                    saveDraft(data.draft);
                    if (data.emailSent) {
                        sessionStorage.setItem('heliEmailSent', '1');
                    } else if (data.emailError) {
                        console.warn('Email not sent:', data.emailError);
                    }
                } catch (err) {
                    alert(err.message || 'Payment confirmation failed');
                    return;
                }
            } else {
                draft.paymentUtr = new FormData(form).get('payment_utr');
                draft.bookedAt = bookingTimestamp();
                draft.confirmed = true;
                saveDraft(draft);
            }
            window.location.href = 'ticket.html';
            return;
        }
        if (form.matches('.verify-check-form')) {
            event.preventDefault();
            const code = new FormData(form).get('booking_code');
            await renderVerify(String(code || ''));
        }
    });

    const draft = readDraft();
    const boot = async () => {
        if (document.querySelector('[data-mock-summary]')) {
            if (!draft) {
                const main = document.querySelector('[data-mock-summary]');
                if (main) {
                    main.innerHTML = `
                        <section class="content-section narrow" style="padding:40px 20px;text-align:center">
                            <p class="alert">No booking found. Please fill the form and click Book Seat again.</p>
                            <a class="btn btn-blue" href="index.html">Back to Home</a>
                        </section>`;
                }
            } else {
                renderSummary(draft);
            }
        }
        if (document.querySelector('[data-mock-payment]')) {
            if (!draft) {
                window.location.href = 'index.html';
            } else {
                renderPayment(draft);
            }
        }
        if (document.querySelector('[data-mock-ticket]')) {
            if (!draft) {
                window.location.href = 'index.html';
                return;
            }
            if (await checkApi() && draft.bookingId && draft.token) {
                try {
                    const data = await apiFetch(
                        `/api/bookings/${encodeURIComponent(draft.bookingId)}?token=${encodeURIComponent(draft.token)}`,
                    );
                    if (!data.draft.confirmed) {
                        window.location.href = 'index.html';
                        return;
                    }
                    saveDraft(data.draft);
                    renderTicket(data.draft);
                    return;
                } catch {
                    if (!draft.confirmed) {
                        window.location.href = 'index.html';
                        return;
                    }
                }
            }
            if (!draft.confirmed) {
                window.location.href = 'index.html';
            } else {
                renderTicket(draft);
            }
        }
        if (document.querySelector('[data-mock-success]')) {
            if (!draft || !draft.confirmed) {
                window.location.href = 'index.html';
            } else {
                window.location.href = 'ticket.html';
            }
        }
    };
    boot();
})();
