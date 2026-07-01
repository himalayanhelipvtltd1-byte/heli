(function () {
    const passengerForm = document.querySelector('[data-passenger-form]');
    if (passengerForm) {
        const countInput = passengerForm.querySelector('[data-passenger-count]');
        const container = passengerForm.querySelector('[data-passenger-container]');
        const priceNode = passengerForm.querySelector('[data-price]');
        const bookButton = passengerForm.querySelector('[data-book-button]');
        const price = priceNode ? Number(priceNode.dataset.price || 0) : 0;

        const passengerTemplate = (index) => `
            <div class="passenger-box">
                <strong>Passenger ${index + 1} Details</strong>
                <label>Full Name:
                    <input name="passengers[${index}][name]" pattern="[A-Za-z][A-Za-z .-]{1,79}" maxlength="80" autocomplete="name" required>
                </label>
                <label>Gender:
                    <select name="passengers[${index}][gender]" required>
                        <option value="">-- Select --</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                    </select>
                </label>
                <label>Age:
                    <input type="number" min="1" max="120" name="passengers[${index}][age]" inputmode="numeric" required>
                </label>
                <label>AADHAAR Number:
                    <input name="passengers[${index}][aadhaar]" maxlength="12" pattern="[0-9]{12}" inputmode="numeric" placeholder="12 digit AADHAAR" required>
                </label>
                <label>Yatra Registration Number:
                    <input name="passengers[${index}][registration]" pattern="[A-Za-z0-9-]{4,30}" maxlength="30" required>
                </label>
                <input type="hidden" name="passengers[${index}][status]" value="Adult">
            </div>`;

        const renderPassengers = () => {
            const count = Math.max(1, Math.min(20, Number(countInput.value || 1)));
            countInput.value = String(count);
            container.innerHTML = Array.from({ length: count }, (_, index) => passengerTemplate(index)).join('');
            if (priceNode) {
                const fare = Math.round(price).toLocaleString('en-IN');
                const total = Math.round(price * count).toLocaleString('en-IN');
                priceNode.textContent = `Final Amount: ₹${total} (₹${fare} x ${count} passenger${count === 1 ? '' : 's'})`;
            }
            if (bookButton) {
                bookButton.textContent = `Book ${count} Seat${count === 1 ? '' : 's'}`;
            }
        };

        countInput.addEventListener('input', renderPassengers);
        renderPassengers();
    }

    const departureInput = document.querySelector('[data-departure-date]');
    const returnInput = document.querySelector('[data-return-date]');
    if (departureInput && returnInput) {
        const shouldAutoReturnDate = returnInput.dataset.autoReturnDate === '1';
        const updateReturnDate = () => {
            if (!departureInput.value) {
                returnInput.min = returnInput.getAttribute('min') || '';
                if (shouldAutoReturnDate) {
                    returnInput.value = '';
                    returnInput.disabled = true;
                }
                return;
            }

            returnInput.min = departureInput.value;
            if (!shouldAutoReturnDate) {
                returnInput.disabled = false;
                return;
            }

            const durationDays = Math.max(1, Number(departureInput.dataset.durationDays || 1));
            const date = new Date(`${departureInput.value}T00:00:00`);
            date.setDate(date.getDate() + durationDays - 1);
            returnInput.disabled = false;
            returnInput.value = date.toISOString().slice(0, 10);
        };

        departureInput.addEventListener('change', updateReturnDate);
        updateReturnDate();
    }

    document.querySelector('[data-package-switch]')?.addEventListener('change', (event) => {
        const packageId = event.target.value;
        if (packageId) {
            window.location.href = `booking_package_id_${encodeURIComponent(packageId)}.html`;
        }
    });

    document.querySelectorAll('[data-copy]').forEach((button) => {
        button.addEventListener('click', async () => {
            const value = button.dataset.copy || '';
            try {
                await navigator.clipboard.writeText(value);
                const original = button.innerHTML;
                button.textContent = 'Copied';
                setTimeout(() => {
                    button.innerHTML = original;
                }, 1200);
            } catch (error) {
                window.prompt('Copy this value', value);
            }
        });
    });

    document.querySelectorAll('[data-rich-mail-form]').forEach((form) => {
        const editor = form.querySelector('[data-rich-editor]');
        const body = form.querySelector('[data-rich-body]');
        if (!editor || !body) {
            return;
        }

        if (typeof window.Quill === 'undefined') {
            form.addEventListener('submit', () => {
                body.value = editor.innerHTML.trim();
            });
            return;
        }

        const quill = new window.Quill(editor, {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link'],
                    ['clean'],
                ],
            },
        });

        const syncBody = () => {
            body.value = quill.root.innerHTML.trim();
        };

        quill.on('text-change', syncBody);
        form.addEventListener('submit', syncBody);
    });

    document.querySelectorAll('[data-dismiss-alert]').forEach((button) => {
        button.addEventListener('click', () => {
            button.closest('.alert')?.remove();
        });
    });

    const dismissActiveModal = () => {
        document.querySelectorAll('.modal-backdrop.active').forEach((modal) => {
            modal.classList.remove('active');
            modal.remove();
        });
    };

    document.querySelectorAll('[data-dismiss-modal]').forEach((button) => {
        button.addEventListener('click', dismissActiveModal);
    });

    document.querySelectorAll('[data-admin-datatable]').forEach((table) => {
        const tbody = table.tBodies[0];
        if (!tbody) {
            return;
        }

        const tableWrap = table.closest('.table-scroll') || table;
        const rows = Array.from(tbody.rows);
        const pageSizes = [10, 25, 50, 100];
        const defaultSize = Number(table.dataset.pageSize || 10);
        let pageSize = pageSizes.includes(defaultSize) ? defaultSize : 10;
        let currentPage = 1;
        let searchTerm = '';
        let sortIndex = -1;
        let sortDirection = 'asc';

        const controls = document.createElement('div');
        controls.className = 'datatable-controls';
        controls.innerHTML = `
            <label>Show
                <select data-datatable-size>
                    ${pageSizes.map((size) => `<option value="${size}"${size === pageSize ? ' selected' : ''}>${size}</option>`).join('')}
                </select>
            </label>
            <label>Search
                <input type="search" data-datatable-search placeholder="Search loaded leads">
            </label>
        `;

        const footer = document.createElement('div');
        footer.className = 'datatable-footer';
        footer.innerHTML = `
            <span data-datatable-info></span>
            <div class="datatable-pages">
                <button type="button" data-datatable-prev>Previous</button>
                <span data-datatable-page></span>
                <button type="button" data-datatable-next>Next</button>
            </div>
        `;

        tableWrap.parentNode?.insertBefore(controls, tableWrap);
        tableWrap.parentNode?.insertBefore(footer, tableWrap.nextSibling);

        const searchInput = controls.querySelector('[data-datatable-search]');
        const sizeSelect = controls.querySelector('[data-datatable-size]');
        const info = footer.querySelector('[data-datatable-info]');
        const pageLabel = footer.querySelector('[data-datatable-page]');
        const prevButton = footer.querySelector('[data-datatable-prev]');
        const nextButton = footer.querySelector('[data-datatable-next]');

        const cellSortValue = (row, index) => {
            const value = (row.cells[index]?.textContent || '').trim();
            const numeric = Number(value.replace(/[^\d.-]/g, ''));
            return value !== '' && Number.isFinite(numeric) && /[\d]/.test(value) ? numeric : value.toLowerCase();
        };

        const filteredRows = () => {
            const filtered = searchTerm
                ? rows.filter((row) => row.textContent.toLowerCase().includes(searchTerm))
                : [...rows];

            if (sortIndex >= 0) {
                filtered.sort((a, b) => {
                    const first = cellSortValue(a, sortIndex);
                    const second = cellSortValue(b, sortIndex);
                    if (first === second) {
                        return 0;
                    }
                    const result = first > second ? 1 : -1;
                    return sortDirection === 'asc' ? result : -result;
                });
            }

            return filtered;
        };

        const renderDataTable = () => {
            const filtered = filteredRows();
            const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
            currentPage = Math.min(currentPage, pageCount);
            const start = (currentPage - 1) * pageSize;
            const visible = filtered.slice(start, start + pageSize);

            rows.forEach((row) => row.remove());
            visible.forEach((row) => tbody.appendChild(row));

            const from = filtered.length === 0 ? 0 : start + 1;
            const to = Math.min(start + pageSize, filtered.length);
            info.textContent = `Showing ${from} to ${to} of ${filtered.length} lead${filtered.length === 1 ? '' : 's'}`;
            pageLabel.textContent = `Page ${currentPage} of ${pageCount}`;
            prevButton.disabled = currentPage <= 1;
            nextButton.disabled = currentPage >= pageCount;
        };

        table.querySelectorAll('thead th').forEach((th, index) => {
            th.classList.add('datatable-sortable');
            th.tabIndex = 0;
            th.setAttribute('aria-sort', 'none');
            const sort = () => {
                if (sortIndex === index) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sortIndex = index;
                    sortDirection = 'asc';
                }
                table.querySelectorAll('thead th').forEach((header) => header.setAttribute('aria-sort', 'none'));
                th.setAttribute('aria-sort', sortDirection === 'asc' ? 'ascending' : 'descending');
                currentPage = 1;
                renderDataTable();
            };
            th.addEventListener('click', sort);
            th.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    sort();
                }
            });
        });

        searchInput?.addEventListener('input', () => {
            searchTerm = searchInput.value.trim().toLowerCase();
            currentPage = 1;
            renderDataTable();
        });

        sizeSelect?.addEventListener('change', () => {
            pageSize = Number(sizeSelect.value || 10);
            currentPage = 1;
            renderDataTable();
        });

        prevButton?.addEventListener('click', () => {
            currentPage = Math.max(1, currentPage - 1);
            renderDataTable();
        });

        nextButton?.addEventListener('click', () => {
            currentPage += 1;
            renderDataTable();
        });

        renderDataTable();
    });

    const siteMenuToggle = document.querySelector('[data-site-menu-toggle]');
    const setSiteMenuOpen = (open) => {
        document.body.classList.toggle('site-menu-open', open);
        siteMenuToggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    siteMenuToggle?.addEventListener('click', () => {
        setSiteMenuOpen(!document.body.classList.contains('site-menu-open'));
    });

    document.querySelectorAll('.nav-bar a').forEach((link) => {
        link.addEventListener('click', () => setSiteMenuOpen(false));
    });

    const adminMenuToggle = document.querySelector('[data-admin-menu-toggle]');
    const adminMenuCloseTargets = document.querySelectorAll('[data-admin-menu-close], .admin-menu a, .admin-logout');
    const setAdminMenuOpen = (open) => {
        document.body.classList.toggle('admin-menu-open', open);
        adminMenuToggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    adminMenuToggle?.addEventListener('click', () => {
        setAdminMenuOpen(!document.body.classList.contains('admin-menu-open'));
    });

    adminMenuCloseTargets.forEach((target) => {
        target.addEventListener('click', () => setAdminMenuOpen(false));
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            dismissActiveModal();
            setSiteMenuOpen(false);
            setAdminMenuOpen(false);
        }
    });
})();
