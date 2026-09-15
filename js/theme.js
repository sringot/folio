/* ==========================================================================
   theme.js — Bascule clair / sombre, partagée par toutes les pages.

   Le thème initial est posé par un court script inline dans le <head> de
   chaque page (voir index.html) : c'est ce qui évite le « flash blanc » au
   chargement quand le thème sombre est actif. Ce fichier ne gère que
   l'interaction et la synchronisation.
   ========================================================================== */
(function () {
    'use strict';

    var STORAGE_KEY = 'theme';
    var root = document.documentElement;

    var META_COLORS = { light: '#EDE8DE', dark: '#2A2A2C' };

    function readStored() {
        try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
    }

    function store(theme) {
        try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* mode privé */ }
    }

    function currentTheme() {
        return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    /**
     * Applique un thème et notifie le reste de la page.
     * @param {'light'|'dark'} theme
     * @param {boolean} persist  true si le choix vient de l'utilisateur.
     */
    function applyTheme(theme, persist) {
        root.setAttribute('data-theme', theme);
        if (persist) store(theme);

        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', META_COLORS[theme]);

        Array.prototype.forEach.call(
            document.querySelectorAll('[data-theme-toggle]'),
            function (btn) {
                btn.setAttribute(
                    'aria-label',
                    theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'
                );
            }
        );

        // Le tracé SVG de la timeline se redessine à la couleur du thème.
        root.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
    }

    document.addEventListener('click', function (event) {
        var toggle = event.target.closest('[data-theme-toggle]');
        if (!toggle) return;
        applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
    });

    // Suit la préférence système tant que l'utilisateur n'a pas tranché.
    var media = window.matchMedia('(prefers-color-scheme: dark)');
    var onSystemChange = function (event) {
        if (readStored()) return;
        applyTheme(event.matches ? 'dark' : 'light', false);
    };
    if (media.addEventListener) media.addEventListener('change', onSystemChange);
    else if (media.addListener) media.addListener(onSystemChange);

    // Aligne meta[theme-color] et les libellés sur le thème déjà posé par le <head>.
    applyTheme(currentTheme(), false);
})();
