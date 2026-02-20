/**
 * PerfAvion — Calculateur de performances aéronautiques
 * Nextcloud App v1.0.0
 */

/* global OC */

(function(window) {
    'use strict';

    const STORAGE_KEY = 'perfavion_nc32_v1';

    const DEFAULT_DB = [{
        id: 'c172',
        name: 'C172 S — F-DEMO',
        empty: 743, mtow: 1111, mzf: 1043, fuel_max: 212, fuel_density: 0.72,
        todr: 268, tod: 498, ldr: 176, ld: 413,
        arms: [
            { label: 'Masse à vide',       key: 'empty',   arm: 1023 },
            { label: 'Pilote',             key: 'pilot',   arm: 1003 },
            { label: 'Passager avant',     key: 'pax_f',   arm: 1003 },
            { label: 'Passager arrière 1', key: 'pax_r1',  arm: 1615 },
            { label: 'Passager arrière 2', key: 'pax_r2',  arm: 1615 },
            { label: 'Bagages',            key: 'baggage', arm: 2030 },
            { label: 'Carburant',          key: 'fuel',    arm: 1193 },
        ],
        envelope: [
            { mass: 700,  fwd: 889, aft: 1143 },
            { mass: 885,  fwd: 889, aft: 1143 },
            { mass: 1111, fwd: 940, aft: 1073 },
        ],
    }];

    // ════════════════════════════════════════════════════════
    // PERSISTANCE
    // ════════════════════════════════════════════════════════

    function loadDB() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY))
                || JSON.parse(JSON.stringify(DEFAULT_DB));
        } catch (e) {
            return JSON.parse(JSON.stringify(DEFAULT_DB));
        }
    }

    function saveDB(d) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    }

    let db  = loadDB();
    let idx = 0;

    // ════════════════════════════════════════
    // SIDEBAR — LISTE DES AVIONS
    // ════════════════════════════════════════

    function renderSidebar() {
        const ul = document.getElementById('aircraft-list');
        ul.innerHTML = '';

        db.forEach(function(a, i) {
            const li = document.createElement('li');
            li.className = i === idx ? 'active' : '';
            li.dataset.idx = i;

            li.innerHTML =
                '<svg class="aircraft-icon" viewBox="0 0 24 24" fill="currentColor">' +
                '<path d="M21 16L13 11V4.5C13 3.67 12.33 3 11.5 3S10 3.67 10 4.5V11' +
                'L2 16V18L10 15.5V20L8 21.5V23L11.5 22L15 23V21.5L13 20V15.5L21 18V16Z"/>' +
                '</svg>' +
                '<span class="aircraft-name">' + escHtml(a.name) + '</span>' +
                '<div class="aircraft-actions">' +
                '  <button class="aircraft-action-btn" title="Configurer" ' +
                '    onclick="event.stopPropagation();PerfAvion.openModal(' + i + ')">⚙</button>' +
                '  <button class="aircraft-action-btn delete" title="Supprimer" ' +
                '    onclick="event.stopPropagation();PerfAvion.deleteAircraft(' + i + ')">✕</button>' +
                '</div>';

            li.addEventListener('click', function() {
                selectAircraft(i);
            });

            ul.appendChild(li);
        });
    }

    function selectAircraft(i) {
        idx = i;
        renderSidebar();
        loadAircraftFields();
    }

    function loadAircraftFields() {
        const a = db[idx];
        document.getElementById('m_empty').value = a.empty;
        document.getElementById('toolbar-aircraft-name').textContent = a.name;
        updateFuelKg();
        drawCG(null, null);
        resetResults();
    }

    function escHtml(s) {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // function loadAircraft() {
    //     idx = parseInt(document.getElementById('aircraftSelect').value, 10);
    //     document.getElementById('m_empty').value = db[idx].empty;
    //     updateFuelKg();
    //     drawCG(null, null);
    // }

    function newAircraft() {
        const a = JSON.parse(JSON.stringify(DEFAULT_DB[0]));
        a.id   = 'avion_' + Date.now();
        a.name = 'Nouvel avion';
        db.push(a);
        idx = db.length - 1;
        saveDB(db);
        populateSelect();
        loadAircraft();
        openModal();
    }

    function deleteAircraft() {
        if (db.length === 1) {
            // Utilise OC.dialogs si disponible, sinon alert natif
            alert('Il doit rester au moins un avion configuré.');
            return;
        }
        if (!confirm('Supprimer cet avion définitivement ?')) return;
        db.splice(idx, 1);
        idx = 0;
        saveDB(db);
        populateSelect();
        loadAircraft();
    }

    // ════════════════════════════════════════════════════════
    // CARBURANT
    // ════════════════════════════════════════════════════════

    function updateFuelKg() {
        const L  = parseFloat(document.getElementById('fuel_dep').value) || 0;
        const kg = (L * db[idx].fuel_density).toFixed(1);
        document.getElementById('fuel_mass_info').textContent =
            '≈ ' + kg + ' kg de carburant au départ';
    }

    // ════════════════════════════════════════════════════════
    // CALCULS PRINCIPAUX
    // ════════════════════════════════════════════════════════

    function calculate() {
        const a   = db[idx];
        const g   = function(id) { return parseFloat(document.getElementById(id).value) || 0; };
        const rad = function(n) {
            const el = document.querySelector('input[name=' + n + ']:checked');
            return el ? el.value : '';
        };

        // Masses
        const m_e   = g('m_empty') || a.empty;
        const m_p   = g('m_pilot');
        const m_pf  = g('m_pax_f');
        const m_r1  = g('m_pax_r1');
        const m_r2  = g('m_pax_r2');
        const m_b   = g('m_baggage');
        const fd    = g('fuel_dep');
        const fb    = g('fuel_burn');
        const fa    = Math.max(0, fd - fb);
        const mfd   = fd * a.fuel_density;
        const mfa   = fa * a.fuel_density;

        const mzf   = m_e + m_p + m_pf + m_r1 + m_r2 + m_b;
        const mtow_ = mzf + mfd;
        const m_ldg = mzf + mfa;

        // Météo
        const alt   = g('alt_terrain');
        const tmp   = g('temp');
        const qnh   = g('qnh');
        const wdir  = g('wind_dir');
        const wspd  = g('wind_spd');
        const qfu   = g('qfu');
        const wet   = rad('rw_wet')  === 'wet';
        const grass = rad('rw_surf') === 'grass';
        const humid = rad('humidity') === 'high';

        // Atmosphère
        const palt = alt + (1013.25 - qnh) * 27.31;
        const isa  = 15 - 1.98 * (palt / 1000);
        const idev = tmp - isa;
        const dalt = palt + 120 * idev;

        // Vent
        const ang = (wdir - qfu) * Math.PI / 180;
        const hw  = wspd * Math.cos(ang);
        const xw  = Math.abs(wspd * Math.sin(ang));

        // Facteurs de correction performances
        const mr  = mtow_ / a.mtow;
        const af  = 1 + (dalt / 1000) * 0.10;
        const wTO = Math.max(0.5, 1 - hw * 0.01);
        const wLD = Math.max(0.5, 1 - hw * 0.008);
        const wf  = wet   ? 1.15 : 1;
        const gTO = grass ? 1.15 : 1;
        const gLD = grass ? 1.10 : 1;
        const hf  = humid ? 1.02 : 1;

        const todr_ = Math.round(a.todr * mr * mr * af * wTO * gTO * hf);
        const tod_  = Math.round(a.tod  * mr * mr * af * wTO * gTO * hf);
        const lr    = m_ldg / a.mtow;
        const ldr_  = Math.round(a.ldr  * lr  * af * wLD * wf  * gLD);
        const ld_   = Math.round(a.ld   * lr  * af * wLD * wf  * gLD);

        // Centrage
        const am = {};
        a.arms.forEach(function(x) { am[x.key] = x.arm; });
        const B = function(m, k, d) { return m * (am[k] || d); };
        const base = B(m_e, 'empty', 1000) + B(m_p, 'pilot', 1000)
                   + B(m_pf, 'pax_f', 1000) + B(m_r1, 'pax_r1', 1600)
                   + B(m_r2, 'pax_r2', 1600) + B(m_b, 'baggage', 2000);
        const cgTO  = mtow_  > 0 ? (base + mfd * (am.fuel || 1200)) / mtow_  : 0;
        const cgArr = m_ldg > 0 ? (base + mfa * (am.fuel || 1200)) / m_ldg : 0;

        // ── AFFICHAGE ──
        const fmt = function(v, d) {
            d = d || 0;
            return isNaN(v) ? '—' : v.toFixed(d);
        };
        const sv = function(id, v, u) {
            document.getElementById(id).innerHTML = v + '<span class="u">' + u + '</span>';
        };

        const over = mtow_ > a.mtow;
        const rv = document.getElementById('r_mtow');
        rv.innerHTML = fmt(mtow_) + '<span class="u">kg</span>';
        rv.className = 'result-item__value ' + (over ? 'val-error' : 'val-success');

        sv('r_mzf',       fmt(mzf),    'kg');
        sv('r_mlanding',  fmt(m_ldg),  'kg');
        sv('r_fuel_arr',  fmt(fa),     'L');
        sv('r_mtow_limit', fmt(a.mtow), 'kg');

        document.getElementById('mtow_badge').innerHTML = over
            ? '<span class="nc-badge nc-badge--error">DÉPASSÉ</span>'
            : '<span class="nc-badge nc-badge--success">OK</span>';
        document.getElementById('mtow_status_row').className =
            'result-item ' + (over ? 'result-item--error' : 'result-item--success');

        const hwLabel = hw >= 0
            ? '↓ ' + fmt(hw, 1) + ' kt face'
            : '↑ ' + fmt(-hw, 1) + ' kt arrière';
        document.getElementById('r_wind_comp').innerHTML = hwLabel;
        sv('r_xwind',    fmt(xw, 1),  'kt');
        sv('r_press_alt', fmt(palt),  'ft');
        sv('r_dens_alt',  fmt(dalt),  'ft');
        document.getElementById('r_isa_dev').innerHTML =
            (idev >= 0 ? '+' : '') + fmt(idev, 1) + '<span class="u">°C</span>';

        sv('r_todr', fmt(todr_), 'm');
        sv('r_tod',  fmt(tod_),  'm');
        sv('r_ldr',  fmt(ldr_),  'm');
        sv('r_ld',   fmt(ld_),   'm');
        sv('r_cg_to',  fmt(cgTO, 0),  'mm');
        sv('r_cg_arr', fmt(cgArr, 0), 'mm');

        const inTO  = pointInEnv(a.envelope, mtow_,  cgTO);
        const inArr = pointInEnv(a.envelope, m_ldg, cgArr);
        document.getElementById('cg_badge').innerHTML = (inTO && inArr)
            ? '<span class="nc-badge nc-badge--success">Dans l\'enveloppe</span>'
            : '<span class="nc-badge nc-badge--error">Hors enveloppe !</span>';

        drawCG([
            { mass: mtow_,  cg: cgTO,  label: 'TO',  ok: inTO },
            { mass: m_ldg, cg: cgArr, label: 'LDG', ok: inArr },
        ], a);
    }

    // ════════════════════════════════════════════════════════
    // GRAPHIQUE CG (Canvas)
    // ════════════════════════════════════════════════════════

    function pointInEnv(env, mass, cg) {
        if (!env || env.length < 2) return true;
        const poly = env.map(function(p) { return { x: p.fwd, y: p.mass }; })
            .concat(env.slice().reverse().map(function(p) { return { x: p.aft, y: p.mass }; }));
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y;
            const xj = poly[j].x, yj = poly[j].y;
            if (((yi > mass) !== (yj > mass)) && (cg < (xj - xi) * (mass - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    function drawCG(points, aircraft) {
        const canvas  = document.getElementById('cgCanvas');
        const wrap    = document.querySelector('.canvas-wrap');
        if (!canvas || !wrap) return;

        canvas.width  = wrap.clientWidth - 32;
        canvas.height = 340;
        const ctx = canvas.getContext('2d');
        const W   = canvas.width;
        const H   = canvas.height;
        const pad = { top: 32, right: 50, bottom: 48, left: 72 };

        ctx.clearRect(0, 0, W, H);

        // Fond : utilise --color-background-dark via getComputedStyle
        const cs   = getComputedStyle(document.documentElement);
        const bgCol = cs.getPropertyValue('--color-background-dark').trim() || '#ededed';
        const priCol = cs.getPropertyValue('--color-primary-element').trim() || '#00679e';
        const bdCol  = cs.getPropertyValue('--color-border').trim() || '#ededed';
        const bdDark = cs.getPropertyValue('--color-border-dark').trim() || '#dbdbdb';
        const txtCol = cs.getPropertyValue('--color-text-maxcontrast').trim() || '#6b6b6b';
        const mainTxt = cs.getPropertyValue('--color-main-text').trim() || '#222';
        const succCol = cs.getPropertyValue('--color-success').trim() || '#2d7b41';
        const errCol  = cs.getPropertyValue('--color-error').trim() || '#db0606';
        const warnTxt = cs.getPropertyValue('--color-warning-text').trim() || '#7f5900';

        ctx.fillStyle = bgCol;
        ctx.fillRect(0, 0, W, H);

        const a   = aircraft || db[idx];
        const env = a.envelope;

        if (!env || env.length < 2) {
            ctx.fillStyle = txtCol;
            ctx.font = '13px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(
                'Configurez l\'enveloppe CG dans les paramètres avion',
                W / 2, H / 2
            );
            return;
        }

        const masses = env.map(function(p) { return p.mass; });
        const cgs    = env.map(function(p) { return p.fwd; })
            .concat(env.map(function(p) { return p.aft; }));

        const minM  = Math.min.apply(null, masses) * 0.95;
        const maxM  = Math.max.apply(null, masses) * 1.05;
        const minCG = Math.min.apply(null, cgs) * 0.97;
        const maxCG = Math.max.apply(null, cgs) * 1.03;

        const cx = function(c) {
            return pad.left + (c - minCG) / (maxCG - minCG) * (W - pad.left - pad.right);
        };
        const cy = function(m) {
            return H - pad.bottom - (m - minM) / (maxM - minM) * (H - pad.top - pad.bottom);
        };

        // Grille
        ctx.strokeStyle = bdCol;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = pad.top + i * (H - pad.top - pad.bottom) / 5;
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
            const x = pad.left + i * (W - pad.left - pad.right) / 5;
            ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, H - pad.bottom); ctx.stroke();
        }

        // Bordure zone
        ctx.strokeStyle = bdDark;
        ctx.lineWidth = 1;
        ctx.strokeRect(pad.left, pad.top, W - pad.left - pad.right, H - pad.top - pad.bottom);

        // Étiquettes axes
        ctx.fillStyle = txtCol;
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        for (let i = 0; i <= 5; i++) {
            const x = pad.left + i * (W - pad.left - pad.right) / 5;
            ctx.fillText(
                (minCG + i * (maxCG - minCG) / 5).toFixed(0) + 'mm',
                x, H - pad.bottom + 20
            );
        }
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const y = H - pad.bottom - i * (H - pad.top - pad.bottom) / 5;
            ctx.fillText(
                (minM + i * (maxM - minM) / 5).toFixed(0) + 'kg',
                pad.left - 6, y + 4
            );
        }
        ctx.fillStyle = mainTxt;
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('CG (mm)', W / 2, H - 4);
        ctx.save();
        ctx.translate(13, H / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Masse (kg)', 0, 0);
        ctx.restore();

        // Enveloppe
        ctx.beginPath();
        env.forEach(function(p, i) {
            i === 0 ? ctx.moveTo(cx(p.fwd), cy(p.mass)) : ctx.lineTo(cx(p.fwd), cy(p.mass));
        });
        env.slice().reverse().forEach(function(p) { ctx.lineTo(cx(p.aft), cy(p.mass)); });
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,103,158,.08)';
        ctx.fill();
        ctx.strokeStyle = priCol;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label enveloppe
        ctx.fillStyle = priCol;
        ctx.font = '11px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText('Enveloppe de vol', cx(minCG + (maxCG - minCG) * .02), cy(maxM) + 18);

        // Ligne MTOW
        if (a.mtow && a.mtow >= minM && a.mtow <= maxM) {
            const ym = cy(a.mtow);
            ctx.strokeStyle = 'rgba(163,114,0,.7)';
            ctx.setLineDash([6, 4]);
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(pad.left, ym); ctx.lineTo(W - pad.right, ym); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = warnTxt;
            ctx.font = '11px system-ui';
            ctx.textAlign = 'right';
            ctx.fillText('MTOW', W - pad.right - 4, ym - 4);
        }

        // Points TO / LDG
        if (points) {
            if (points.length === 2
                && !isNaN(points[0].cg) && !isNaN(points[1].cg)
                && points[0].mass > 0   && points[1].mass > 0) {
                ctx.beginPath();
                ctx.moveTo(cx(points[0].cg), cy(points[0].mass));
                ctx.lineTo(cx(points[1].cg), cy(points[1].mass));
                ctx.strokeStyle = 'rgba(0,0,0,.18)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            points.forEach(function(pt) {
                if (isNaN(pt.mass) || isNaN(pt.cg) || pt.mass === 0) return;
                const x = cx(pt.cg), y = cy(pt.mass);
                ctx.beginPath();
                ctx.arc(x, y, 7, 0, Math.PI * 2);
                ctx.fillStyle = pt.ok ? succCol : errCol;
                ctx.shadowBlur  = 10;
                ctx.shadowColor = pt.ok ? succCol : errCol;
                ctx.fill();
                ctx.shadowBlur  = 0;
                ctx.strokeStyle = '#fff';
                ctx.lineWidth   = 2;
                ctx.stroke();
                ctx.fillStyle   = mainTxt;
                ctx.font        = 'bold 11px system-ui';
                ctx.textAlign   = 'left';
                ctx.fillText(pt.label, x + 11, y + 4);
            });
        }
    }

    // ════════════════════════════════════════════════════════
    // MODAL CONFIGURATION
    // ════════════════════════════════════════════════════════

    function openModal() {
        const a = db[idx];
        document.getElementById('modal_title').textContent = 'Configuration — ' + a.name;
        document.getElementById('cfg_name').value          = a.name;
        document.getElementById('cfg_empty').value         = a.empty;
        document.getElementById('cfg_mtow').value          = a.mtow;
        document.getElementById('cfg_mzf').value           = a.mzf || '';
        document.getElementById('cfg_fuel_max').value      = a.fuel_max || '';
        document.getElementById('cfg_fuel_density').value  = a.fuel_density || 0.72;
        document.getElementById('cfg_todr').value          = a.todr;
        document.getElementById('cfg_tod').value           = a.tod;
        document.getElementById('cfg_ldr').value           = a.ldr;
        document.getElementById('cfg_ld').value            = a.ld;
        renderArmsTable(a.arms);
        renderEnvTable(a.envelope);
        switchTab('tab-general');
        document.getElementById('configModal').classList.add('open');
    }

    function closeModal() {
        document.getElementById('configModal').classList.remove('open');
    }

    function saveAircraft() {
        const a = db[idx];
        a.name         = document.getElementById('cfg_name').value || 'Avion';
        a.empty        = parseFloat(document.getElementById('cfg_empty').value)        || a.empty;
        a.mtow         = parseFloat(document.getElementById('cfg_mtow').value)         || a.mtow;
        a.mzf          = parseFloat(document.getElementById('cfg_mzf').value)          || a.mzf;
        a.fuel_max     = parseFloat(document.getElementById('cfg_fuel_max').value)     || a.fuel_max;
        a.fuel_density = parseFloat(document.getElementById('cfg_fuel_density').value) || 0.72;
        a.todr         = parseFloat(document.getElementById('cfg_todr').value)         || a.todr;
        a.tod          = parseFloat(document.getElementById('cfg_tod').value)          || a.tod;
        a.ldr          = parseFloat(document.getElementById('cfg_ldr').value)          || a.ldr;
        a.ld           = parseFloat(document.getElementById('cfg_ld').value)           || a.ld;
        a.arms         = readArmsTable();
        a.envelope     = readEnvTable();
        saveDB(db);
        populateSelect();
        loadAircraft();
        closeModal();
    }

    // ── Table bras ──
    const ARM_KEYS = ['empty', 'pilot', 'pax_f', 'pax_r1', 'pax_r2', 'baggage', 'fuel'];

    function renderArmsTable(arms) {
        const tb = document.getElementById('armsTbody');
        tb.innerHTML = '';
        (arms || []).forEach(function(arm) { tb.appendChild(makeArmRow(arm)); });
    }

    function makeArmRow(arm) {
        const tr   = document.createElement('tr');
        const opts = ARM_KEYS.map(function(k) {
            return '<option value="' + k + '"' + (arm.key === k ? ' selected' : '') + '>' + k + '</option>';
        }).join('');
        tr.innerHTML =
            '<td><input type="text" class="arm-label" value="' + arm.label + '"></td>' +
            '<td><select class="arm-key">' + opts + '</select></td>' +
            '<td><input type="number" class="arm-val" value="' + arm.arm + '" step="1" style="width:85px;"></td>' +
            '<td><button class="btn-del" onclick="this.closest(\'tr\').remove()">✕</button></td>';
        return tr;
    }

    function addArmRow() {
        document.getElementById('armsTbody')
            .appendChild(makeArmRow({ label: 'Nouveau poste', key: 'empty', arm: 1000 }));
    }

    function readArmsTable() {
        return Array.from(document.querySelectorAll('#armsTbody tr')).map(function(tr) {
            return {
                label: tr.querySelector('.arm-label').value,
                key:   tr.querySelector('.arm-key').value,
                arm:   parseFloat(tr.querySelector('.arm-val').value) || 1000,
            };
        });
    }

    // ── Table enveloppe ──
    function renderEnvTable(env) {
        const tb = document.getElementById('envTbody');
        tb.innerHTML = '';
        (env || []).forEach(function(p, i) { tb.appendChild(makeEnvRow(p, i)); });
    }

    function makeEnvRow(p, i) {
        const tr = document.createElement('tr');
        tr.innerHTML =
            '<td style="color:var(--color-text-maxcontrast);font-size:12px;padding-left:8px;">' + (i + 1) + '</td>' +
            '<td><input type="number" class="env-mass" value="' + p.mass + '" step="1" style="width:80px;"></td>' +
            '<td><input type="number" class="env-fwd"  value="' + p.fwd  + '" step="1" style="width:80px;"></td>' +
            '<td><input type="number" class="env-aft"  value="' + p.aft  + '" step="1" style="width:80px;"></td>' +
            '<td><button class="btn-del" onclick="this.closest(\'tr\').remove()">✕</button></td>';
        return tr;
    }

    function addEnvRow() {
        const tb   = document.getElementById('envTbody');
        const rows = tb.querySelectorAll('tr');
        const last = rows[rows.length - 1];
        const mass = last
            ? parseFloat(last.querySelector('.env-mass').value) + 50
            : 500;
        tb.appendChild(makeEnvRow({ mass: mass, fwd: 900, aft: 1100 }, rows.length));
        Array.from(tb.rows).forEach(function(tr, i) { tr.cells[0].textContent = i + 1; });
    }

    function readEnvTable() {
        return Array.from(document.querySelectorAll('#envTbody tr')).map(function(tr) {
            return {
                mass: parseFloat(tr.querySelector('.env-mass').value) || 0,
                fwd:  parseFloat(tr.querySelector('.env-fwd').value)  || 0,
                aft:  parseFloat(tr.querySelector('.env-aft').value)  || 0,
            };
        });
    }

    // ── Onglets ──
    function switchTab(id) {
        document.querySelectorAll('.tab-content').forEach(function(el) {
            el.classList.remove('active');
        });
        document.querySelectorAll('.nc-tab').forEach(function(el) {
            el.classList.remove('active');
        });
        document.getElementById(id).classList.add('active');
        const ids = ['tab-general', 'tab-arms', 'tab-envelope', 'tab-perf'];
        const tabs = document.querySelectorAll('.nc-tab');
        const i = ids.indexOf(id);
        if (tabs[i]) tabs[i].classList.add('active');
    }

    // ════════════════════════════════════════════════════════
    // RESET
    // ════════════════════════════════════════════════════════

    function resetFields() {
        ['m_pax_f', 'm_pax_r1', 'm_pax_r2', 'm_baggage'].forEach(function(id) {
            document.getElementById(id).value = 0;
        });
        document.getElementById('m_pilot').value   = 80;
        document.getElementById('fuel_dep').value  = 120;
        document.getElementById('fuel_burn').value = 40;
        document.getElementById('temp').value      = 15;
        document.getElementById('qnh').value       = 1013;
        document.getElementById('alt_terrain').value = 0;
        document.getElementById('wind_spd').value  = 0;
        document.getElementById('wind_dir').value  = 0;
        document.getElementById('qfu').value       = 0;
        document.getElementById('rw_dry').checked  = true;
        document.getElementById('rs_paved').checked = true;
        document.getElementById('hum_norm').checked = true;
        updateFuelKg();
        [
            'r_mtow', 'r_mzf', 'r_mlanding', 'r_fuel_arr',
            'r_press_alt', 'r_dens_alt', 'r_isa_dev',
            'r_todr', 'r_tod', 'r_ldr', 'r_ld',
            'r_cg_to', 'r_cg_arr',
        ].forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '—';
        });
        document.getElementById('mtow_badge').innerHTML   = '—';
        document.getElementById('cg_badge').innerHTML     = '—';
        document.getElementById('r_wind_comp').innerHTML  = '—';
        drawCG(null, null);
    }

    // ════════════════════════════════════════════════════════
    // INIT
    // ════════════════════════════════════════════════════════

    function init() {
        populateSelect();
        loadAircraft();
        document.getElementById('m_empty').value = db[idx].empty;
        updateFuelKg();
        drawCG(null, null);
        window.addEventListener('resize', function() { drawCG(null, null); });
    }

    document.addEventListener('DOMContentLoaded', init);

    // ════════════════════════════════════════════════════════
    // API PUBLIQUE (appelée depuis le template HTML)
    // ════════════════════════════════════════════════════════
    window.PerfAvion = {
        loadAircraft:  loadAircraft,
        newAircraft:   newAircraft,
        deleteAircraft: deleteAircraft,
        updateFuelKg:  updateFuelKg,
        calculate:     calculate,
        resetFields:   resetFields,
        openModal:     openModal,
        closeModal:    closeModal,
        saveAircraft:  saveAircraft,
        addArmRow:     addArmRow,
        addEnvRow:     addEnvRow,
        switchTab:     switchTab,
    };

}(window));
