/**
 * Garment & Textile ERP — client runtime (ES6 + jQuery).
 * Exposes window.ERP with page initialisers; all requests carry the CSRF token.
 */
(($) => {
    'use strict';

    const csrf = document.querySelector('meta[name="csrf-token"]')?.content ?? '';
    const baseUrl = (document.querySelector('meta[name="base-url"]')?.content ?? '/').replace(/\/?$/, '/');
    const url = (p) => baseUrl + String(p).replace(/^\//, '');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    $.ajaxSetup({ headers: { 'X-CSRF-TOKEN': csrf, 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' } });

    const toast = (message, type = 'success') => {
        const el = $(`<div class="toast align-items-center text-bg-${type === 'error' ? 'danger' : type} border-0" role="alert">
            <div class="d-flex"><div class="toast-body">${esc(message)}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>`);
        $('#toasts').append(el);
        const t = new bootstrap.Toast(el[0], { delay: 4000 });
        t.show();
        el.on('hidden.bs.toast', () => el.remove());
    };

    const statusBadge = (s) => s ? `<span class="badge erp-status-${esc(s.value)}">${esc(s.label)}</span>` : '';

    const handleError = (xhr, $form) => {
        const res = xhr.responseJSON ?? {};
        if (xhr.status === 401) { window.location = url('login'); return; }
        if ($form && res.errors) {
            Object.entries(res.errors).forEach(([field, msg]) => {
                const $input = $form.find(`[name="${field}"], [name="${field}[]"]`).first();
                $input.addClass('is-invalid');
                $input.closest('div').find('.invalid-feedback').first().text(msg);
            });
            $form.find('.is-invalid').first().trigger('focus');
        }
        toast(res.message ?? `Request failed (${xhr.status})`, 'error');
    };

    // ------------------------------------------------------------------ global behaviours
    const initGlobal = () => {
        // theme
        const saved = localStorage.getItem('erp-theme');
        if (saved) document.documentElement.setAttribute('data-bs-theme', saved);
        $('#themeToggle').on('click', () => {
            const next = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', next);
            localStorage.setItem('erp-theme', next);
        });
        // sidebar
        $('#sidebarToggle').on('click', () => {
            document.body.classList.toggle(window.innerWidth < 992 ? 'sidebar-open' : 'sidebar-collapsed');
        });

        if ($.fn.select2) {
            $('.select2').each(function () {
                $(this).select2({ theme: 'bootstrap-5', width: '100%', allowClear: !this.required, placeholder: '— Select —' });
            });
        }

        // AJAX forms: <form data-ajax>
        $(document).on('submit', 'form[data-ajax]', function (e) {
            e.preventDefault();
            const $form = $(this);
            if ($form.data('confirm') && !window.confirm($form.data('confirm'))) return;
            const fd = new FormData(this);
            const submitter = e.originalEvent?.submitter;
            if (submitter?.name) fd.append(submitter.name, submitter.value);
            if (typeof $form.data('beforeSubmit') === 'function') $form.data('beforeSubmit')(fd);

            $form.find('.is-invalid').removeClass('is-invalid');
            const $btn = $form.find('button:not([type=button])').prop('disabled', true);
            $.ajax({ url: this.action, method: 'POST', data: fd, processData: false, contentType: false })
                .done((res) => {
                    toast(res.message ?? 'Saved');
                    if (res.redirect) setTimeout(() => { window.location = res.redirect; }, 500);
                })
                .fail((xhr) => handleError(xhr, $form))
                .always(() => $btn.prop('disabled', false));
        });

        // delete buttons: <button data-delete="url">
        $(document).on('click', '[data-delete]', function () {
            if (!window.confirm($('html').attr('lang') === 'bn' ? 'আপনি কি নিশ্চিত?' : 'Are you sure you want to delete this record?')) return;
            $.ajax({ url: $(this).data('delete'), method: 'POST', data: { _method: 'DELETE' } })
                .done((res) => {
                    toast(res.message ?? 'Deleted');
                    const $grid = $('table.dataTable');
                    if ($grid.length) $grid.DataTable().ajax.reload(null, false); else setTimeout(() => location.reload(), 400);
                })
                .fail((xhr) => handleError(xhr));
        });

        // permission matrix helpers
        $(document).on('click', '[data-toggle-row]', function () {
            const $cb = $(this).closest('tr').find('input[type=checkbox]');
            $cb.prop('checked', !$cb.first().prop('checked'));
        });
        $(document).on('click', '[data-toggle-all]', function () {
            const $cb = $(this).closest('.card').find('input[type=checkbox]');
            $cb.prop('checked', !$cb.first().prop('checked'));
        });
    };

    const actionButtons = (id, editTpl, deleteTpl) => {
        let html = '';
        if (editTpl) html += `<a class="btn btn-sm btn-light" href="${esc(editTpl.replace('{id}', id))}" title="Edit"><i class="bi bi-pencil"></i></a> `;
        if (deleteTpl) html += `<button class="btn btn-sm btn-light text-danger" data-delete="${esc(deleteTpl.replace('{id}', id))}" title="Delete"><i class="bi bi-trash"></i></button>`;
        return html;
    };

    const dtDefaults = {
        serverSide: true,
        processing: true,
        pageLength: 25,
        lengthMenu: [10, 25, 50, 100],
        stateSave: true,
        language: { processing: '<div class="spinner-border spinner-border-sm"></div>' },
    };

    const ERP = {
        url, toast, esc,

        resourceGrid(selector) {
            const $t = $(selector);
            const columns = $t.find('th[data-col]').map(function () {
                const col = $(this).data('col');
                return { data: col, render: (v) => (col === 'status' ? statusBadge(v) : esc(v)) };
            }).get();
            columns.push({ data: 'id', orderable: false, className: 'text-end text-nowrap', render: (id) => actionButtons(id, $t.data('edit'), $t.data('delete')) });
            const dt = $t.DataTable({ ...dtDefaults, ajax: { url: $t.data('source') }, columns, order: [[0, 'asc']] });
            // keep export in sync with the current search
            dt.on('search.dt', () => {
                const $e = $('#exportBtn');
                if ($e.length) $e.attr('href', $e.attr('href').split('?')[0] + '?q=' + encodeURIComponent(dt.search()));
            });
        },

        usersGrid(selector) {
            const $t = $(selector);
            const canEdit = $t.data('can-edit') === 1, canDel = $t.data('can-delete') === 1;
            $t.DataTable({
                ...dtDefaults,
                ajax: { url: url('admin/users/data') },
                order: [[1, 'asc']],
                columns: [
                    { data: 'employee_code', render: esc },
                    { data: 'full_name', render: (v, _, r) => `<strong>${esc(v)}</strong>${r.is_super_admin == 1 ? ' <span class="badge text-bg-dark">Super Admin</span>' : ''}<div class="small text-body-secondary">${esc(r.designation)}</div>` },
                    { data: 'username', render: esc },
                    { data: 'email', render: esc },
                    { data: 'department', render: esc },
                    { data: 'roles', orderable: false, render: (v) => (v ? v.split(', ').map((r) => `<span class="badge text-bg-light">${esc(r)}</span>`).join(' ') : '') },
                    { data: 'last_login_at', render: (v) => esc(v ?? 'Never') },
                    { data: 'status', render: (v, _, r) => statusBadge({ value: v, label: v }) + (r.locked_until && new Date(r.locked_until.replace(' ', 'T')) > new Date() ? ' <span class="badge text-bg-danger"><i class="bi bi-lock"></i></span>' : '') },
                    { data: 'id', orderable: false, className: 'text-end text-nowrap', render: (id, _, r) => {
                        let h = '';
                        if (canEdit && r.locked_until) h += `<button class="btn btn-sm btn-light" data-unlock="${id}" title="Unlock"><i class="bi bi-unlock"></i></button> `;
                        return h + actionButtons(id, canEdit ? url('admin/users/{id}/edit') : '', canDel ? url('admin/users/{id}') : '');
                    } },
                ],
            });
            $(document).on('click', '[data-unlock]', function () {
                $.post(url(`admin/users/${$(this).data('unlock')}/unlock`)).done((r) => { toast(r.message); $t.DataTable().ajax.reload(null, false); }).fail((x) => handleError(x));
            });
        },

        auditGrid(selector) {
            const $t = $(selector);
            const filters = () => {
                const f = {};
                $('#auditFilters [data-filter]').each(function () { f[$(this).data('filter')] = $(this).val(); });
                return f;
            };
            const diff = (oldV, newV) => {
                const o = oldV ? JSON.parse(oldV) : {}, n = newV ? JSON.parse(newV) : {};
                const keys = [...new Set([...Object.keys(o), ...Object.keys(n)])];
                if (!keys.length) return '';
                return '<table class="table table-sm table-borderless mb-0 small">' + keys.map((k) =>
                    `<tr><td class="text-body-secondary">${esc(k)}</td><td class="text-danger text-decoration-line-through">${esc(o[k] ?? '')}</td><td class="text-success">${esc(n[k] ?? '')}</td></tr>`).join('') + '</table>';
            };
            const dt = $t.DataTable({
                ...dtDefaults,
                stateSave: false,
                pageLength: 50,
                ordering: false,
                ajax: { url: url('admin/audit/data'), data: (d) => { d.filter = filters(); } },
                columns: [
                    { data: 'created_at', className: 'text-nowrap', render: esc },
                    { data: 'full_name', render: (v) => esc(v ?? 'System') },
                    { data: 'action', render: (v) => `<span class="badge text-bg-${{ create: 'success', update: 'primary', delete: 'danger' }[v] ?? 'secondary'}">${esc(v)}</span>` },
                    { data: 'table_name', render: esc },
                    { data: 'record_id', render: esc },
                    { data: 'ip_address', render: esc },
                    { data: null, render: (r) => diff(r.old_values, r.new_values) },
                ],
            });
            $('#auditFilters [data-filter]').on('change', () => dt.ajax.reload());
        },

        workflowDesigner() {
            const $steps = $('#steps');
            const renumber = () => $steps.children('.erp-step').each(function (i) { $(this).find('.erp-step-no').text(i + 1); });

            $('#addStep').on('click', () => {
                const $clone = $steps.children('.erp-step').first().clone();
                $clone.find('input[type=text], input:not([type]), input[type=number]').val('');
                $clone.find('select').prop('selectedIndex', 0).trigger('change');
                $clone.find('input[type=checkbox]').prop('checked', true);
                $steps.append($clone);
                renumber();
            });
            $steps.on('click', '[data-remove-step]', function () {
                if ($steps.children('.erp-step').length > 1) { $(this).closest('.erp-step').remove(); renumber(); }
            });
            $steps.on('change', '[data-name="approver_type"]', function () {
                const isUser = this.value === 'user';
                const $s = $(this).closest('.erp-step');
                $s.find('.step-user').toggleClass('d-none', !isUser);
                $s.find('.step-role').toggleClass('d-none', isUser);
            });

            // native HTML5 drag & drop reordering
            let dragged = null;
            $steps.on('dragstart', '.erp-step', function () { dragged = this; this.classList.add('dragging'); });
            $steps.on('dragend', '.erp-step', function () { this.classList.remove('dragging'); renumber(); });
            $steps.on('dragover', (e) => {
                e.preventDefault();
                const after = [...$steps.children('.erp-step:not(.dragging)')].find((el) => e.originalEvent.clientY < el.getBoundingClientRect().top + el.offsetHeight / 2);
                if (after) $steps[0].insertBefore(dragged, after); else $steps[0].appendChild(dragged);
            });

            // serialise steps into steps[i][field] at submit time
            $steps.closest('form').data('beforeSubmit', (fd) => {
                $steps.children('.erp-step').each(function (i) {
                    $(this).find('[data-name]').each(function () {
                        const name = $(this).data('name');
                        if (this.type === 'checkbox') { if (this.checked) fd.append(`steps[${i}][${name}]`, '1'); } else fd.append(`steps[${i}][${name}]`, this.value);
                    });
                });
            });
        },

        signaturePad() {
            const canvas = document.getElementById('sigPad');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            let drawing = false, dirty = false;
            const pos = (e) => {
                const r = canvas.getBoundingClientRect();
                return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
            };
            ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0b2a6b';
            canvas.addEventListener('pointerdown', (e) => { drawing = true; dirty = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); canvas.setPointerCapture(e.pointerId); });
            canvas.addEventListener('pointermove', (e) => { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); });
            ['pointerup', 'pointerleave'].forEach((ev) => canvas.addEventListener(ev, () => { drawing = false; }));
            $('#sigClear').on('click', () => { ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = false; });

            $('#sigForm').data('beforeSubmit', (fd) => {
                const file = $('#sigForm input[type=file]')[0].files.length;
                if (!file && dirty) fd.set('signature_data', canvas.toDataURL('image/png'));
            });
        },

        dashboard() {
            if (typeof ApexCharts === 'undefined') return;
            const dark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
            const base = { chart: { toolbar: { show: false }, background: 'transparent', fontFamily: 'inherit' }, theme: { mode: dark ? 'dark' : 'light' } };
            $.getJSON(url('dashboard/charts')).done((d) => {
                new ApexCharts(document.querySelector('#chartCapacity'), {
                    ...base,
                    chart: { ...base.chart, type: 'bar', height: 300 },
                    series: [{ name: 'Capacity (pcs/day)', data: d.capacity.map((r) => +r.capacity) }, { name: 'Production units', data: d.capacity.map((r) => +r.units) }],
                    xaxis: { categories: d.capacity.map((r) => r.name) },
                    yaxis: [{ title: { text: 'pcs/day' } }, { opposite: true, title: { text: 'units' } }],
                    plotOptions: { bar: { borderRadius: 4, columnWidth: '45%' } },
                    dataLabels: { enabled: false },
                    noData: { text: 'No factories configured' },
                }).render();
                new ApexCharts(document.querySelector('#chartUnits'), {
                    ...base,
                    chart: { ...base.chart, type: 'donut', height: 300 },
                    series: d.unitTypes.map((r) => +r.total),
                    labels: d.unitTypes.map((r) => r.label.replace('_', ' ')),
                    legend: { position: 'bottom' },
                    noData: { text: 'No production units' },
                }).render();
                new ApexCharts(document.querySelector('#chartActivity'), {
                    ...base,
                    chart: { ...base.chart, type: 'area', height: 120, sparkline: { enabled: true } },
                    series: [{ name: 'Changes', data: d.activity.map((r) => ({ x: r.day, y: +r.total })) }],
                    stroke: { curve: 'smooth', width: 2 },
                    tooltip: { x: { show: true } },
                }).render();
            });
        },
    };

    window.ERP = ERP;
    $(initGlobal);
})(jQuery);
