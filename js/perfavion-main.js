/**
 * PerfAvion — Calculateur de performances aéronautiques
 * Nextcloud App v1.0.0
 *
 * Utilise OC.ready() car DOMContentLoaded est déjà passé
 * quand Nextcloud charge les scripts via Util::addScript.
 */
(function (window, OC) {
    'use strict';

    /* ══════════════════════════════════════════════
       DONNÉES PAR DÉFAUT
    ══════════════════════════════════════════════ */
    var STORAGE_KEY = 'perfavion_nc32_v1';

    var DEFAULT_DB = [{
        id: 'c172',
        name: 'C172 S — F-DEMO',
        empty: 743, mtow: 1111, mzf: 1043,
        fuel_max: 212, fuel_density: 0.72,
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

    /* ══════════════════════════════════════════════
       PERSISTANCE
    ══════════════════════════════════════════════ */
    function loadDB() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_DB));
        } catch (e) {
            return JSON.parse(JSON.stringify(DEFAULT_DB));
        }
    }
    function saveDB(d) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    }

    var db      = loadDB();
    var idx     = 0;
    var isAdmin = false;   // lu depuis le DOM après init

    /* ══════════════════════════════════════════════
       HELPERS
    ══════════════════════════════════════════════ */
    function esc(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    function gv(id) {
        var el = document.getElementById(id);
        return el ? (parseFloat(el.value) || 0) : 0;
    }
    function sv(id, val, unit) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = val + '<span class="u">' + unit + '</span>';
    }
    function fmt(v, d) {
        d = d || 0;
        return isNaN(v) || v === null ? '—' : Number(v).toFixed(d);
    }
    function radio(name) {
        var el = document.querySelector('input[name="' + name + '"]:checked');
        return el ? el.value : '';
    }

    /* ══════════════════════════════════════════════
       SIDEBAR
    ══════════════════════════════════════════════ */
    function renderSidebar() {
        var ul = document.getElementById('aircraft-list');
        if (!ul) return;
        ul.innerHTML = '';

        db.forEach(function (a, i) {
            var li  = document.createElement('li');
            li.className = i === idx ? 'active' : '';

            var delBtn = '';
            if (isAdmin) {
                delBtn =
                    '<button class="aircraft-del-btn" title="Supprimer" ' +
                    'onclick="event.stopPropagation();PerfAvion.deleteAircraft(' + i + ')">' +
                    '&#x2715;</button>';   // ✕
            }

            li.innerHTML =
                '<svg class="aircraft-icon" viewBox="0 0 24 24" fill="currentColor">' +
                '<path d="M21 16L13 11V4.5C13 3.67 12.33 3 11.5 3S10 3.67 10 ' +
                '4.5V11L2 16V18L10 15.5V20L8 21.5V23L11.5 22L15 23V21.5L13 20V15.5L21 18V16Z"/>' +
                '</svg>' +
                '<span class="aircraft-name">' + esc(a.name) + '</span>' +
                delBtn;

            li.addEventListener('click', (function (ii) {
                return function () { selectAircraft(ii); };
            })(i));

            ul.appendChild(li);
        });
    }

    function selectAircraft(i) {
        idx = i;
        renderSidebar();
        fillFields();
        resetResults();
        drawCG(null, null);
    }

    function fillFields() {
        var a = db[idx];
        var el;
        el = document.getElementById('m_empty');
        if (el) el.value = a.empty;
        el = document.getElementById('toolbar-aircraft-name');
        if (el) el.textContent = a.name;
        updateFuelKg();
    }

    /* ══════════════════════════════════════════════
       AVIONS CRUD
    ══════════════════════════════════════════════ */
    function newAircraft() {
        var a = JSON.parse(JSON.stringify(DEFAULT_DB[0]));
        a.id   = 'avion_' + Date.now();
        a.name = 'Nouvel avion';
        db.push(a);
        idx = db.length - 1;
        saveDB(db);
        renderSidebar();
        fillFields();
        openModal(idx);
    }

    function deleteAircraft(i) {
        if (!isAdmin) return;
        var target = (i !== undefined) ? i : idx;
        if (db.length === 1) {
            alert('Il doit rester au moins un avion configuré.');
            return;
        }
        if (!confirm('Supprimer « ' + db[target].name + ' » ?')) return;
        db.splice(target, 1);
        idx = Math.min(idx, db.length - 1);
        saveDB(db);
        renderSidebar();
        fillFields();
        resetResults();
        drawCG(null, null);
    }

    /* ══════════════════════════════════════════════
       CARBURANT
    ══════════════════════════════════════════════ */
    function updateFuelKg() {
        var L  = gv('fuel_dep');
        var kg = (L * db[idx].fuel_density).toFixed(1);
        var el = document.getElementById('fuel_mass_info');
        if (el) el.textContent = '≈ ' + kg + ' kg';
    }

    /* ══════════════════════════════════════════════
       CALCULS
    ══════════════════════════════════════════════ */
    function calculate() {
        var a = db[idx];

        var m_e  = gv('m_empty') || a.empty;
        var m_p  = gv('m_pilot');
        var m_pf = gv('m_pax_f');
        var m_r1 = gv('m_pax_r1');
        var m_r2 = gv('m_pax_r2');
        var m_b  = gv('m_baggage');
        var fd   = gv('fuel_dep');
        var fb   = gv('fuel_burn');
        var fa   = Math.max(0, fd - fb);
        var mfd  = fd * a.fuel_density;
        var mfa  = fa * a.fuel_density;

        var mzf   = m_e + m_p + m_pf + m_r1 + m_r2 + m_b;
        var mtow_ = mzf + mfd;
        var m_ldg = mzf + mfa;

        var alt  = gv('alt_terrain');
        var tmp  = gv('temp');
        var qnh  = gv('qnh');
        var wdir = gv('wind_dir');
        var wspd = gv('wind_spd');
        var qfu  = gv('qfu');
        var wet   = radio('rw_wet')  === 'wet';
        var grass = radio('rw_surf') === 'grass';
        var humid = radio('humidity') === 'high';

        var palt = alt + (1013.25 - qnh) * 27.31;
        var isa  = 15 - 1.98 * (palt / 1000);
        var idev = tmp - isa;
        var dalt = palt + 120 * idev;

        var ang = (wdir - qfu) * Math.PI / 180;
        var hw  = wspd * Math.cos(ang);
        var xw  = Math.abs(wspd * Math.sin(ang));

        var mr  = mtow_ / a.mtow;
        var af  = 1 + (dalt / 1000) * 0.10;
        var wTO = Math.max(0.5, 1 - hw * 0.01);
        var wLD = Math.max(0.5, 1 - hw * 0.008);
        var wf  = wet   ? 1.15 : 1;
        var gTO = grass ? 1.15 : 1;
        var gLD = grass ? 1.10 : 1;
        var hf  = humid ? 1.02 : 1;

        var todr_ = Math.round(a.todr * mr * mr * af * wTO * gTO * hf);
        var tod_  = Math.round(a.tod  * mr * mr * af * wTO * gTO * hf);
        var lr    = m_ldg / a.mtow;
        var ldr_  = Math.round(a.ldr  * lr * af * wLD * wf  * gLD);
        var ld_   = Math.round(a.ld   * lr * af * wLD * wf  * gLD);

        /* CG */
        var am = {};
        a.arms.forEach(function (x) { am[x.key] = x.arm; });
        function B(m, k, d) { return m * (am[k] || d); }
        var base = B(m_e,'empty',1000) + B(m_p,'pilot',1000) + B(m_pf,'pax_f',1000)
                 + B(m_r1,'pax_r1',1600) + B(m_r2,'pax_r2',1600) + B(m_b,'baggage',2000);
        var cgTO  = mtow_  > 0 ? (base + mfd * (am.fuel || 1200)) / mtow_  : 0;
        var cgArr = m_ldg > 0 ? (base + mfa * (am.fuel || 1200)) / m_ldg : 0;

        /* Affichage masses */
        var over = mtow_ > a.mtow;
        var rv = document.getElementById('r_mtow');
        if (rv) {
            rv.innerHTML = fmt(mtow_) + '<span class="u">kg</span>';
            rv.className = 'result-item__value ' + (over ? 'val-error' : 'val-success');
        }
        sv('r_mzf',       fmt(mzf),    'kg');
        sv('r_mlanding',  fmt(m_ldg),  'kg');
        sv('r_fuel_arr',  fmt(fa),     'L');
        sv('r_mtow_limit', fmt(a.mtow), 'kg');

        var mb = document.getElementById('mtow_badge');
        var mr_row = document.getElementById('mtow_status_row');
        if (mb) mb.innerHTML = over
            ? '<span class="nc-badge nc-badge--error">DÉPASSÉ</span>'
            : '<span class="nc-badge nc-badge--success">OK</span>';
        if (mr_row) mr_row.className = 'result-item ' + (over ? 'result-item--error' : 'result-item--success');

        /* Affichage atmosphère */
        var wc = document.getElementById('r_wind_comp');
        if (wc) wc.innerHTML = hw >= 0
            ? '↓ ' + fmt(hw, 1) + ' kt face'
            : '↑ ' + fmt(-hw, 1) + ' kt arrière';
        sv('r_xwind',    fmt(xw, 1), 'kt');
        sv('r_press_alt', fmt(palt), 'ft');
        sv('r_dens_alt',  fmt(dalt), 'ft');
        var id_el = document.getElementById('r_isa_dev');
        if (id_el) id_el.innerHTML = (idev >= 0 ? '+' : '') + fmt(idev, 1) + '<span class="u">°C</span>';

        /* Affichage perfs */
        sv('r_todr', fmt(todr_), 'm');
        sv('r_tod',  fmt(tod_),  'm');
        sv('r_ldr',  fmt(ldr_),  'm');
        sv('r_ld',   fmt(ld_),   'm');

        /* CG */
        sv('r_cg_to',  fmt(cgTO,  0), 'mm');
        sv('r_cg_arr', fmt(cgArr, 0), 'mm');

        var inTO  = pointInEnv(a.envelope, mtow_,  cgTO);
        var inArr = pointInEnv(a.envelope, m_ldg, cgArr);
        var cb = document.getElementById('cg_badge');
        var cs_row = document.getElementById('cg_status_row');
        if (cb) cb.innerHTML = (inTO && inArr)
            ? '<span class="nc-badge nc-badge--success">Dans l\'enveloppe</span>'
            : '<span class="nc-badge nc-badge--error">Hors enveloppe !</span>';
        if (cs_row) cs_row.className = 'result-item ' + ((inTO && inArr) ? 'result-item--success' : 'result-item--error');

        drawCG([
            { mass: mtow_,  cg: cgTO,  label: 'TO',  ok: inTO },
            { mass: m_ldg, cg: cgArr, label: 'LDG', ok: inArr },
        ], a);
    }

    function resetResults() {
        var ids = ['r_mtow','r_mzf','r_mlanding','r_fuel_arr','r_mtow_limit',
                   'r_press_alt','r_dens_alt','r_isa_dev',
                   'r_todr','r_tod','r_ldr','r_ld',
                   'r_cg_to','r_cg_arr','r_wind_comp'];
        ids.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.innerHTML = '—';
        });
        var mb = document.getElementById('mtow_badge');
        var cb = document.getElementById('cg_badge');
        if (mb) mb.innerHTML = '—';
        if (cb) cb.innerHTML = '—';
    }

    function resetFields() {
        ['m_pax_f','m_pax_r1','m_pax_r2','m_baggage'].forEach(function (id) {
            var el = document.getElementById(id); if (el) el.value = 0;
        });
        var map = {
            m_pilot: 80, fuel_dep: 120, fuel_burn: 40,
            temp: 15, qnh: 1013, alt_terrain: 0,
            wind_spd: 0, wind_dir: 0, qfu: 0
        };
        Object.keys(map).forEach(function (id) {
            var el = document.getElementById(id); if (el) el.value = map[id];
        });
        var checks = { rw_dry: true, rs_paved: true, hum_norm: true };
        Object.keys(checks).forEach(function (id) {
            var el = document.getElementById(id); if (el) el.checked = true;
        });
        updateFuelKg();
        resetResults();
        drawCG(null, null);
    }

    /* ══════════════════════════════════════════════
       EXPORT / IMPORT
    ══════════════════════════════════════════════ */
    function exportData() {
        var blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'perfavion-avions.json';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function importData(input) {
        var file = input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
            try {
                var data = JSON.parse(e.target.result);
                if (!Array.isArray(data) || !data[0].name) throw new Error();
                db = data; idx = 0;
                saveDB(db);
                renderSidebar();
                fillFields();
                alert('Import réussi — ' + db.length + ' avion(s).');
            } catch (err) {
                alert('Fichier invalide.');
            }
        };
        reader.readAsText(file);
        input.value = '';
    }

    function toggleSettings() {
        var c = document.getElementById('app-settings-content');
        if (c) c.classList.toggle('open');
    }

    /* ══════════════════════════════════════════════
       GRAPHIQUE CG
    ══════════════════════════════════════════════ */
    function pointInEnv(env, mass, cg) {
        if (!env || env.length < 2) return true;
        var poly = env.map(function (p) { return { x: p.fwd, y: p.mass }; })
            .concat(env.slice().reverse().map(function (p) { return { x: p.aft, y: p.mass }; }));
        var inside = false;
        for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            var xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
            if (((yi > mass) !== (yj > mass)) && (cg < (xj - xi) * (mass - yi) / (yj - yi) + xi))
                inside = !inside;
        }
        return inside;
    }

    function drawCG(points, aircraft) {
        var canvas = document.getElementById('cgCanvas');
        var wrap   = document.querySelector('.canvas-wrap');
        if (!canvas || !wrap) return;

        /* Taille : toute la largeur disponible, ratio 4/3 */
        var W = wrap.clientWidth - 20;
        var H = Math.round(W * 0.68);
        canvas.width  = W;
        canvas.height = H;

        var ctx = canvas.getContext('2d');
        var pad = { top: 28, right: 46, bottom: 42, left: 64 };

        ctx.clearRect(0, 0, W, H);

        /* Couleurs depuis variables CSS Nextcloud */
        var cs = getComputedStyle(document.documentElement);
        function cv(v, fb) { return cs.getPropertyValue(v).trim() || fb; }
        var bgCol   = cv('--color-background-dark',    '#ededed');
        var priCol  = cv('--color-primary-element',    '#00679e');
        var bdCol   = cv('--color-border',             '#ededed');
        var bdDark  = cv('--color-border-dark',        '#dbdbdb');
        var txtCol  = cv('--color-text-maxcontrast',   '#6b6b6b');
        var mainTxt = cv('--color-main-text',          '#222222');
        var succCol = cv('--color-success',            '#2d7b41');
        var errCol  = cv('--color-error',              '#db0606');
        var warnTxt = cv('--color-warning-text',       '#7f5900');

        ctx.fillStyle = bgCol;
        ctx.fillRect(0, 0, W, H);

        var a   = aircraft || db[idx];
        var env = a.envelope;

        if (!env || env.length < 2) {
            ctx.fillStyle = txtCol;
            ctx.font = '13px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('Configurez l\'enveloppe CG dans les paramètres avion', W / 2, H / 2);
            return;
        }

        var masses = env.map(function (p) { return p.mass; });
        var cgs    = env.map(function (p) { return p.fwd; })
                       .concat(env.map(function (p) { return p.aft; }));
        var minM = Math.min.apply(null, masses) * 0.95;
        var maxM = Math.max.apply(null, masses) * 1.05;
        var minC = Math.min.apply(null, cgs) * 0.97;
        var maxC = Math.max.apply(null, cgs) * 1.03;

        var chartW = W - pad.left - pad.right;
        var chartH = H - pad.top  - pad.bottom;

        function cx(c) { return pad.left + (c - minC) / (maxC - minC) * chartW; }
        function cy(m) { return H - pad.bottom - (m - minM) / (maxM - minM) * chartH; }

        /* Grille */
        ctx.strokeStyle = bdCol; ctx.lineWidth = 1;
        for (var i = 0; i <= 5; i++) {
            var gy = pad.top + i * chartH / 5;
            ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(W - pad.right, gy); ctx.stroke();
            var gx = pad.left + i * chartW / 5;
            ctx.beginPath(); ctx.moveTo(gx, pad.top); ctx.lineTo(gx, H - pad.bottom); ctx.stroke();
        }
        ctx.strokeStyle = bdDark; ctx.lineWidth = 1;
        ctx.strokeRect(pad.left, pad.top, chartW, chartH);

        /* Étiquettes axes */
        ctx.fillStyle = txtCol; ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        for (var i = 0; i <= 5; i++) {
            var lx = pad.left + i * chartW / 5;
            ctx.fillText((minC + i * (maxC - minC) / 5).toFixed(0), lx, H - pad.bottom + 16);
        }
        ctx.textAlign = 'right';
        for (var i = 0; i <= 5; i++) {
            var ly = H - pad.bottom - i * chartH / 5;
            ctx.fillText((minM + i * (maxM - minM) / 5).toFixed(0), pad.left - 5, ly + 3);
        }
        ctx.fillStyle = mainTxt; ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('CG (mm)', W / 2, H - 3);
        ctx.save();
        ctx.translate(11, H / 2); ctx.rotate(-Math.PI / 2);
        ctx.fillText('Masse (kg)', 0, 0);
        ctx.restore();

        /* Enveloppe */
        ctx.beginPath();
        env.forEach(function (p, ii) {
            ii === 0 ? ctx.moveTo(cx(p.fwd), cy(p.mass)) : ctx.lineTo(cx(p.fwd), cy(p.mass));
        });
        env.slice().reverse().forEach(function (p) { ctx.lineTo(cx(p.aft), cy(p.mass)); });
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,103,158,.09)'; ctx.fill();
        ctx.strokeStyle = priCol; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = priCol; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
        ctx.fillText('Enveloppe', cx(minC + (maxC - minC) * .02), cy(maxM) + 14);

        /* MTOW */
        if (a.mtow && a.mtow >= minM && a.mtow <= maxM) {
            var ym = cy(a.mtow);
            ctx.strokeStyle = 'rgba(163,114,0,.7)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(pad.left, ym); ctx.lineTo(W - pad.right, ym); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = warnTxt; ctx.font = '10px system-ui'; ctx.textAlign = 'right';
            ctx.fillText('MTOW', W - pad.right - 3, ym - 3);
        }

        /* Points TO / LDG */
        if (points && points.length === 2) {
            var p0 = points[0], p1 = points[1];
            if (!isNaN(p0.cg) && !isNaN(p1.cg) && p0.mass > 0 && p1.mass > 0) {
                ctx.beginPath();
                ctx.moveTo(cx(p0.cg), cy(p0.mass));
                ctx.lineTo(cx(p1.cg), cy(p1.mass));
                ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
            }
            points.forEach(function (pt) {
                if (isNaN(pt.cg) || pt.mass <= 0) return;
                var x = cx(pt.cg), y = cy(pt.mass);
                ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fillStyle = pt.ok ? succCol : errCol;
                ctx.shadowBlur = 8; ctx.shadowColor = ctx.fillStyle;
                ctx.fill(); ctx.shadowBlur = 0;
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                ctx.fillStyle = mainTxt; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'left';
                ctx.fillText(pt.label, x + 9, y + 4);
            });
        }
    }

    window.addEventListener('resize', function () { drawCG(null, null); });

    /* ══════════════════════════════════════════════
       MODAL
    ══════════════════════════════════════════════ */
    function openModal(i) {
        if (i !== undefined) idx = i;
        var a = db[idx];
        var setVal = function (id, v) { var el = document.getElementById(id); if (el) el.value = v; };
        var title = document.getElementById('modal_title');
        if (title) title.textContent = 'Configuration — ' + a.name;
        setVal('cfg_name',         a.name);
        setVal('cfg_empty',        a.empty);
        setVal('cfg_mtow',         a.mtow);
        setVal('cfg_mzf',          a.mzf || '');
        setVal('cfg_fuel_max',     a.fuel_max || '');
        setVal('cfg_fuel_density', a.fuel_density || 0.72);
        setVal('cfg_todr',         a.todr);
        setVal('cfg_tod',          a.tod);
        setVal('cfg_ldr',          a.ldr);
        setVal('cfg_ld',           a.ld);
        renderArmsTable(a.arms);
        renderEnvTable(a.envelope);
        switchTab('tab-general');
        var modal = document.getElementById('configModal');
        if (modal) modal.classList.add('open');
    }

    function closeModal() {
        var modal = document.getElementById('configModal');
        if (modal) modal.classList.remove('open');
    }

    function saveAircraft() {
        var a = db[idx];
        var gf = function (id, fb) { return parseFloat(document.getElementById(id).value) || fb; };
        var gs = function (id)     { return document.getElementById(id).value || ''; };
        a.name         = gs('cfg_name') || 'Avion';
        a.empty        = gf('cfg_empty',        a.empty);
        a.mtow         = gf('cfg_mtow',         a.mtow);
        a.mzf          = gf('cfg_mzf',          a.mzf);
        a.fuel_max     = gf('cfg_fuel_max',     a.fuel_max);
        a.fuel_density = gf('cfg_fuel_density', 0.72);
        a.todr         = gf('cfg_todr',         a.todr);
        a.tod          = gf('cfg_tod',          a.tod);
        a.ldr          = gf('cfg_ldr',          a.ldr);
        a.ld           = gf('cfg_ld',           a.ld);
        a.arms         = readArmsTable();
        a.envelope     = readEnvTable();
        saveDB(db);
        renderSidebar();
        var tn = document.getElementById('toolbar-aircraft-name');
        if (tn) tn.textContent = a.name;
        var me = document.getElementById('m_empty');
        if (me) me.value = a.empty;
        updateFuelKg();
        closeModal();
    }

    /* ── Bras de levier ── */
    var ARM_KEYS = ['empty','pilot','pax_f','pax_r1','pax_r2','baggage','fuel'];

    function renderArmsTable(arms) {
        var tb = document.getElementById('armsTbody');
        if (!tb) return;
        tb.innerHTML = '';
        (arms || []).forEach(function (arm) { tb.appendChild(makeArmRow(arm)); });
    }
    function makeArmRow(arm) {
        var tr   = document.createElement('tr');
        var opts = ARM_KEYS.map(function (k) {
            return '<option value="' + k + '"' + (arm.key === k ? ' selected' : '') + '>' + k + '</option>';
        }).join('');
        tr.innerHTML =
            '<td><input type="text"   class="arm-label" value="' + esc(arm.label) + '"></td>' +
            '<td><select class="arm-key">' + opts + '</select></td>' +
            '<td><input type="number" class="arm-val" value="' + arm.arm + '" step="1" style="width:80px;"></td>' +
            '<td><button class="btn-del" onclick="this.closest(\'tr\').remove()">✕</button></td>';
        return tr;
    }
    function addArmRow() {
        var tb = document.getElementById('armsTbody');
        if (tb) tb.appendChild(makeArmRow({ label: 'Nouveau poste', key: 'empty', arm: 1000 }));
    }
    function readArmsTable() {
        return Array.from(document.querySelectorAll('#armsTbody tr')).map(function (tr) {
            return {
                label: tr.querySelector('.arm-label').value,
                key:   tr.querySelector('.arm-key').value,
                arm:   parseFloat(tr.querySelector('.arm-val').value) || 1000,
            };
        });
    }

    /* ── Enveloppe ── */
    function renderEnvTable(env) {
        var tb = document.getElementById('envTbody');
        if (!tb) return;
        tb.innerHTML = '';
        (env || []).forEach(function (p, i) { tb.appendChild(makeEnvRow(p, i)); });
    }
    function makeEnvRow(p, i) {
        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td style="color:var(--color-text-maxcontrast);font-size:12px;padding-left:6px;">' + (i + 1) + '</td>' +
            '<td><input type="number" class="env-mass" value="' + p.mass + '" step="1" style="width:75px;"></td>' +
            '<td><input type="number" class="env-fwd"  value="' + p.fwd  + '" step="1" style="width:75px;"></td>' +
            '<td><input type="number" class="env-aft"  value="' + p.aft  + '" step="1" style="width:75px;"></td>' +
            '<td><button class="btn-del" onclick="this.closest(\'tr\').remove()">✕</button></td>';
        return tr;
    }
    function addEnvRow() {
        var tb   = document.getElementById('envTbody');
        var rows = tb ? tb.querySelectorAll('tr') : [];
        var last = rows[rows.length - 1];
        var mass = last ? parseFloat(last.querySelector('.env-mass').value) + 50 : 500;
        if (tb) {
            tb.appendChild(makeEnvRow({ mass: mass, fwd: 900, aft: 1100 }, rows.length));
            Array.from(tb.rows).forEach(function (tr, i) { tr.cells[0].textContent = i + 1; });
        }
    }
    function readEnvTable() {
        return Array.from(document.querySelectorAll('#envTbody tr')).map(function (tr) {
            return {
                mass: parseFloat(tr.querySelector('.env-mass').value) || 0,
                fwd:  parseFloat(tr.querySelector('.env-fwd').value)  || 0,
                aft:  parseFloat(tr.querySelector('.env-aft').value)  || 0,
            };
        });
    }

    /* ── Onglets ── */
    function switchTab(id) {
        document.querySelectorAll('.tab-content').forEach(function (el) { el.classList.remove('active'); });
        document.querySelectorAll('.nc-tab').forEach(function (el) { el.classList.remove('active'); });
        var target = document.getElementById(id);
        if (target) target.classList.add('active');
        var ids  = ['tab-general','tab-arms','tab-envelope','tab-perf'];
        var tabs = document.querySelectorAll('.nc-tab');
        var ii   = ids.indexOf(id);
        if (tabs[ii]) tabs[ii].classList.add('active');
    }

    /* ══════════════════════════════════════════════
       INIT — utilise OC.ready() pour s'assurer que
       le DOM Nextcloud est prêt
    ══════════════════════════════════════════════ */
    function init() {
        /* Lire isAdmin depuis le data-attr injecté par PHP */
        var ul = document.getElementById('aircraft-list');
        isAdmin = ul && ul.dataset.isAdmin === '1';

        renderSidebar();
        fillFields();
        drawCG(null, null);
    }

    /* OC.ready() est la bonne façon d'initialiser dans NC */
    if (typeof OC !== 'undefined' && OC.ready) {
        OC.ready(init);
    } else {
        /* Fallback si OC non disponible (dev local) */
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    /* ══════════════════════════════════════════════
       API PUBLIQUE
    ══════════════════════════════════════════════ */
    window.PerfAvion = {
        newAircraft:    newAircraft,
        deleteAircraft: deleteAircraft,
        updateFuelKg:   updateFuelKg,
        calculate:      calculate,
        resetFields:    resetFields,
        openModal:      openModal,
        closeModal:     closeModal,
        saveAircraft:   saveAircraft,
        addArmRow:      addArmRow,
        addEnvRow:      addEnvRow,
        switchTab:      switchTab,
        exportData:     exportData,
        importData:     importData,
        toggleSettings: toggleSettings,
    };

}(window, window.OC));
