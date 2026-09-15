/* ==========================================================================
   map.js — Écran « MISSION SELECT ».
   Place les nodes, l'avatar, gère la sélection, le clavier et les briefings.
   L'avatar est un élément HTML posé au-dessus du SVG : ses coordonnées
   écran sont recalculées depuis la position SVG des nodes (robuste au
   redimensionnement, transitions CSS fluides).
   ========================================================================== */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Données des missions (coordonnées dans le viewBox 1600x1000) ---------- */
    var NODES = [
        { id: 'parcours',    x: 512,  y: 486, num: '01', code: 'M-01', title: 'PARCOURS',       threat: 'BLUE' },
        { id: 'realisations',x: 858,  y: 356, num: '02', code: 'M-02', title: 'RÉALISATIONS',   threat: 'ORANGE' },
        { id: 'veille',      x: 1132, y: 512, num: '03', code: 'M-03', title: 'VEILLE & LAB',   threat: 'RED' },
        { id: 'contact',     x: 792,  y: 744, num: '04', code: 'M-04', title: 'CONTACT',        threat: 'GREEN' }
    ];

    var svg      = document.getElementById('mapSvg');
    var nodeLayer= document.getElementById('nodeLayer');
    var trail    = document.getElementById('trail');
    var decoLayer= document.getElementById('decoLayer');
    var cloudLayer = document.getElementById('cloudLayer');
    var avatar   = document.getElementById('avatar');
    var briefName= document.getElementById('briefName');
    var briefThreat = document.getElementById('briefThreat');
    var deployBtn = document.getElementById('deployBtn');

    var SVGNS = 'http://www.w3.org/2000/svg';
    var current = 0;

    /* ---------- Générateur pseudo-aléatoire déterministe ---------- */
    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function el(name, attrs) {
        var node = document.createElementNS(SVGNS, name);
        for (var k in attrs) node.setAttribute(k, attrs[k]);
        return node;
    }

    /* ---------- Décor : arbres, buissons, rochers, ville, nuages ---------- */
    function scatterDecor() {
        var rand = mulberry32(1337);

        // Zones boisées (x, y, largeur, hauteur, densité)
        var forests = [
            [430, 300, 260, 150, 26],
            [980, 360, 240, 180, 24],
            [640, 560, 220, 160, 20],
            [860, 640, 200, 130, 16]
        ];
        forests.forEach(function (z) {
            for (var i = 0; i < z[4]; i++) {
                var x = z[0] + rand() * z[2];
                var y = z[1] + rand() * z[3];
                tree(x, y, 0.8 + rand() * 0.6);
            }
        });

        // Rochers épars
        for (var r = 0; r < 14; r++) {
            var rx = 360 + rand() * 900;
            var ry = 260 + rand() * 560;
            var g = el('g', { transform: 'translate(' + rx + ',' + ry + ')' });
            g.appendChild(el('ellipse', { cx: 0, cy: 0, rx: 7 + rand() * 6, ry: 5 + rand() * 3, fill: 'var(--rock)' }));
            decoLayer.appendChild(g);
        }

        // Petite ville près de la mission 02
        var city = [[905, 300], [935, 312], [960, 296], [922, 330], [958, 328], [980, 314]];
        city.forEach(function (b, i) {
            var w = 16 + (i % 3) * 6, h = 20 + (i % 2) * 12;
            var g = el('g', { transform: 'translate(' + b[0] + ',' + b[1] + ')' });
            g.appendChild(el('rect', { x: 0, y: -h, width: w, height: h, fill: 'var(--building)' }));
            g.appendChild(el('rect', { x: 0, y: -h, width: w, height: 5, fill: 'var(--building-2)' }));
            // fenêtres
            for (var wy = -h + 8; wy < -4; wy += 8) {
                for (var wx = 3; wx < w - 3; wx += 7) {
                    g.appendChild(el('rect', { x: wx, y: wy, width: 3, height: 4, fill: 'var(--gold)', opacity: 0.85 }));
                }
            }
            decoLayer.appendChild(g);
        });

        // Nuages
        var clouds = [[120, 5, 1.3], [520, 22, 0.9], [900, 2, 1.1], [1300, 15, 1.0]];
        clouds.forEach(function (c, i) {
            var wrap = el('g', {});
            wrap.style.animationDuration = (38 + i * 9) + 's';
            wrap.style.animationDelay = (-i * 11) + 's';
            var g = el('g', { transform: 'translate(' + c[0] + ',' + (60 + c[1] * 4) + ') scale(' + c[2] + ')' });
            [[0, 0, 34], [30, -8, 26], [60, 2, 30], [26, 10, 24]].forEach(function (p) {
                g.appendChild(el('ellipse', { cx: p[0], cy: p[1], rx: p[2], ry: p[2] * 0.6, class: 'cloud' }));
            });
            wrap.appendChild(g);
            cloudLayer.appendChild(wrap);
        });
    }

    function tree(x, y, s) {
        var g = el('g', { transform: 'translate(' + x + ',' + y + ') scale(' + s + ')' });
        g.appendChild(el('ellipse', { cx: 0, cy: 2, rx: 11, ry: 4, fill: 'rgba(0,0,0,0.15)' }));
        g.appendChild(el('rect', { x: -2, y: -6, width: 4, height: 10, fill: '#6b4a2a' }));
        g.appendChild(el('polygon', { points: '0,-26 -12,-2 12,-2', fill: 'var(--tree)' }));
        g.appendChild(el('polygon', { points: '0,-30 -9,-12 9,-12', fill: 'var(--tree-top)' }));
        decoLayer.appendChild(g);
    }

    /* ---------- Trail reliant les missions ---------- */
    function buildTrail() {
        var d = 'M ' + NODES[0].x + ' ' + NODES[0].y;
        for (var i = 1; i < NODES.length; i++) {
            var p = NODES[i - 1], c = NODES[i];
            var mx = (p.x + c.x) / 2, my = (p.y + c.y) / 2 - 40;
            d += ' Q ' + mx + ' ' + my + ' ' + c.x + ' ' + c.y;
        }
        trail.setAttribute('d', d);
    }

    /* ---------- Nodes ---------- */
    function hexPoints(cx, cy, r) {
        var pts = [];
        for (var i = 0; i < 6; i++) {
            var a = Math.PI / 180 * (60 * i - 90);
            pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
        }
        return pts.join(' ');
    }

    function buildNodes() {
        NODES.forEach(function (n, i) {
            var g = el('g', { class: 'node', tabindex: '0', role: 'button' });
            g.setAttribute('aria-label', 'Mission ' + n.num + ' : ' + n.title);
            g.dataset.index = i;

            g.appendChild(el('polygon', { class: 'node-ring-pulse', points: hexPoints(n.x, n.y, 26) }));
            g.appendChild(el('polygon', { class: 'node-hex', points: hexPoints(n.x, n.y, 26) }));
            var num = el('text', { class: 'node-num', x: n.x, y: n.y + 1 });
            num.textContent = n.num;
            g.appendChild(num);

            // Fanion
            var flag = el('g', { class: 'node-flag' });
            var label = n.title;
            var w = Math.max(96, label.length * 11 + 28);
            flag.appendChild(el('rect', { x: n.x - w / 2, y: n.y - 70, width: w, height: 30, rx: 2 }));
            flag.appendChild(el('polygon', { points: (n.x - 6) + ',' + (n.y - 40) + ' ' + (n.x + 6) + ',' + (n.y - 40) + ' ' + n.x + ',' + (n.y - 32), fill: 'var(--hud-panel)' }));
            var t = el('text', { x: n.x, y: n.y - 54 });
            t.textContent = label;
            flag.appendChild(t);
            g.appendChild(flag);

            g.addEventListener('click', function () { selectNode(i, true); });
            g.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectNode(i, true); }
            });
            g.addEventListener('mouseenter', function () { selectNode(i, false); });
            g.addEventListener('focus', function () { selectNode(i, false); });

            nodeLayer.appendChild(g);
        });
    }

    /* ---------- Position écran d'un node → placement avatar ---------- */
    function nodeScreenCenter(i) {
        var hex = nodeLayer.children[i].querySelector('.node-hex');
        var r = hex.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function placeAvatar(i, animate) {
        var c = nodeScreenCenter(i);
        avatar.style.transition = animate && !reduceMotion
            ? 'left 0.6s cubic-bezier(0.34,1.56,0.64,1), top 0.6s cubic-bezier(0.34,1.56,0.64,1)'
            : 'none';
        avatar.style.left = c.x + 'px';
        avatar.style.top = c.y + 'px';
        if (animate && !reduceMotion) {
            avatar.classList.remove('hop'); void avatar.offsetWidth; avatar.classList.add('hop');
        }
    }

    /* ---------- Sélection ---------- */
    function selectNode(i, moveAvatar) {
        current = i;
        var n = NODES[i];

        Array.prototype.forEach.call(nodeLayer.children, function (g, idx) {
            g.classList.toggle('is-current', idx === i);
        });

        briefName.textContent = n.title;
        briefThreat.innerHTML = 'THREAT LEVEL: <b>' + n.threat + '</b>';
        deployBtn.setAttribute('data-mission', n.id);

        if (moveAvatar) placeAvatar(i, true);
    }

    /* ---------- Briefings (panneaux mission) ---------- */
    var lastFocus = null;

    function openMission(id) {
        var panel = document.getElementById('mission-' + id);
        if (!panel) return;
        lastFocus = document.activeElement;
        panel.classList.add('open');
        panel.setAttribute('aria-hidden', 'false');
        document.body.classList.add('mission-active');
        var close = panel.querySelector('.abort-btn');
        if (close) setTimeout(function () { close.focus(); }, 60);
        // met à jour l'URL pour un lien partageable
        history.replaceState(null, '', '#' + id);
    }

    function closeMission() {
        var open = document.querySelector('.mission.open');
        if (!open) return;
        open.classList.remove('open');
        open.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('mission-active');
        history.replaceState(null, '', location.pathname + location.search);
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.addEventListener('click', function (e) {
        var deploy = e.target.closest('[data-mission]');
        if (deploy) { openMission(deploy.getAttribute('data-mission')); return; }
        if (e.target.closest('[data-abort]') || e.target.classList.contains('mission-backdrop')) {
            closeMission();
        }
    });

    /* ---------- Clavier global ---------- */
    document.addEventListener('keydown', function (e) {
        if (document.querySelector('.mission.open')) {
            if (e.key === 'Escape') closeMission();
            return;
        }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); selectNode((current + 1) % NODES.length, true); focusNode(); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); selectNode((current - 1 + NODES.length) % NODES.length, true); focusNode(); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMission(NODES[current].id); }
    });

    function focusNode() { nodeLayer.children[current].focus({ preventScroll: true }); }

    /* ---------- Réagit au thème (couleurs SVG via variables) ---------- */
    document.documentElement.addEventListener('themechange', function () {
        // rien de spécial : les variables CSS se propagent. On repositionne l'avatar.
        placeAvatar(current, false);
    });

    window.addEventListener('resize', function () { placeAvatar(current, false); });

    /* ---------- Boot ---------- */
    function dismissBoot() {
        var boot = document.getElementById('boot');
        if (!boot) return;
        setTimeout(function () { boot.classList.add('done'); }, reduceMotion ? 200 : 1700);
    }

    /* ---------- Amorçage ---------- */
    function init() {
        scatterDecor();
        buildTrail();
        buildNodes();

        // mission demandée dans l'URL ?
        var hash = (location.hash || '').replace('#', '');
        var startIndex = NODES.findIndex(function (n) { return n.id === hash; });
        if (startIndex < 0) startIndex = 0;

        selectNode(startIndex, false);
        // placement avatar après que le SVG a sa taille définitive
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                placeAvatar(startIndex, false);
                avatar.style.opacity = '1';
            });
        });

        if (hash && startIndex >= 0 && document.getElementById('mission-' + hash)) {
            openMission(hash);
        }
        dismissBoot();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
