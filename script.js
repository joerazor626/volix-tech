// ============================================
// Volix Tech — Landing Page Scripts
// Smooth scroll (Lenis) + intro loader + scroll-spy side-nav + reveals.
// ============================================

(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ----------------------------------------
    // Smooth scroll (Lenis lerp glide)
    // ----------------------------------------
    var lenis = null;
    function initSmoothScroll() {
        if (reduceMotion || typeof window.Lenis === 'undefined') return;
        lenis = new window.Lenis({
            duration: 1.15,
            easing: function (t) { return 1 - Math.pow(1 - t, 3); },
            smoothWheel: true,
        });
        function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
    }

    function scrollToTarget(target) {
        if (!target) return;
        if (lenis) lenis.scrollTo(target, { offset: 0 });
        else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    // In-page nav links glide
    document.querySelectorAll('[data-nav]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            var id = a.getAttribute('href');
            if (!id || id.charAt(0) !== '#' || id.length < 2) return;
            var target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            scrollToTarget(target);
        });
    });

    // ----------------------------------------
    // Intro loader (0 -> 100)
    // ----------------------------------------
    function initIntro() {
        var loader = document.getElementById('loader');
        if (!loader) { document.body.classList.add('loaded'); return; }
        if (reduceMotion) {
            loader.style.display = 'none';
            document.body.classList.add('loaded');
            return;
        }
        var count = document.getElementById('loader-count');
        var fill = document.getElementById('loader-fill');
        var status = document.getElementById('loader-status');
        var pct = 0;
        var tick = setInterval(function () {
            pct = Math.min(100, pct + Math.ceil(Math.random() * 8) + 4);
            if (count) count.textContent = pct;
            if (fill) fill.style.width = pct + '%';
            if (pct >= 100) {
                clearInterval(tick);
                if (status) status.textContent = 'Ready to explore';
                setTimeout(function () {
                    loader.classList.add('loader-done');
                    document.body.classList.add('loaded');
                }, 350);
            }
        }, 85);
    }

    // ----------------------------------------
    // Full-screen menu overlay
    // ----------------------------------------
    var menuToggle = document.getElementById('menu-toggle');
    var menuOverlay = document.getElementById('menu-overlay');
    var menuLabel = menuToggle && menuToggle.querySelector('.menu-label');

    function setMenu(open) {
        if (!menuToggle || !menuOverlay) return;
        menuOverlay.classList.toggle('menu-open', open);
        menuToggle.classList.toggle('is-active', open);
        document.body.classList.toggle('menu-active', open);
        menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        menuOverlay.setAttribute('aria-hidden', open ? 'false' : 'true');
        if (menuLabel) menuLabel.textContent = open ? 'CLOSE' : 'MENU';
        // Lenis can keep scrolling underneath the overlay — stop/start it
        if (lenis) { open ? lenis.stop() : lenis.start(); }
    }

    if (menuToggle && menuOverlay) {
        menuToggle.addEventListener('click', function () {
            setMenu(!menuOverlay.classList.contains('menu-open'));
        });
        // Overlay links: close the menu first (restarts Lenis), then scroll.
        // The shared [data-nav] handler calls preventDefault, so we own the scroll here.
        menuOverlay.querySelectorAll('a[data-nav]').forEach(function (a) {
            a.addEventListener('click', function () {
                var target = document.querySelector(a.getAttribute('href'));
                setMenu(false);
                if (!target) return;
                requestAnimationFrame(function () { scrollToTarget(target); });
            });
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') setMenu(false);
        });
    }

    // ----------------------------------------
    // Background music toggle
    // Browsers block autoplay until a user gesture, so we kick it off on the
    // first interaction anywhere (click / scroll / tap / key). The manual
    // toggle still works and cancels the auto-start if used first.
    // ----------------------------------------
    function initMusic() {
        var audio = document.getElementById('bg-music');
        var btn = document.getElementById('sound-toggle');
        if (!audio || !btn) return;
        var label = btn.querySelector('.sound-label');
        var fade = null;
        var TARGET = 0.45;          // comfortable background level
        audio.volume = 0;

        function fadeTo(vol, onDone) {
            if (fade) clearInterval(fade);
            fade = setInterval(function () {
                var d = vol - audio.volume;
                if (Math.abs(d) < 0.03) {
                    audio.volume = vol;
                    clearInterval(fade); fade = null;
                    if (onDone) onDone();
                } else {
                    audio.volume = Math.max(0, Math.min(1, audio.volume + d * 0.2));
                }
            }, 40);
        }

        var playing = false;
        function setPlaying(on) {
            playing = on;
            btn.classList.toggle('is-playing', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            if (label) label.textContent = on ? 'SOUND ON' : 'SOUND OFF';
            if (on) {
                var pr = audio.play();
                if (pr && pr.catch) pr.catch(function () {/* needs user gesture */});
                fadeTo(TARGET);
            } else {
                fadeTo(0, function () { audio.pause(); });
            }
        }

        // Auto-start on the first user interaction (one-shot).
        var armed = true;
        var events = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
        var opts = { passive: true };
        function disarm() {
            armed = false;
            events.forEach(function (ev) { window.removeEventListener(ev, autoStart, opts); });
        }
        function autoStart() {
            if (!armed) return;
            disarm();
            if (!playing) setPlaying(true);
        }
        events.forEach(function (ev) { window.addEventListener(ev, autoStart, opts); });

        btn.addEventListener('click', function () {
            disarm();               // an explicit click takes over the auto-start
            setPlaying(!playing);
        });
    }

    // ----------------------------------------
    // Scroll-spy: highlight active section in side-nav
    // ----------------------------------------
    function initScrollSpy() {
        var items = Array.prototype.slice.call(document.querySelectorAll('.sidenav-item'));
        if (!items.length) return;
        var byId = {};
        items.forEach(function (it) { byId[it.getAttribute('data-target')] = it; });

        var ids = ['hero', 'projects', 'expertise', 'team', 'clients', 'contact'];
        var sections = ids
            .map(function (id) { return document.getElementById(id); })
            .filter(Boolean);
        if (!sections.length) return;

        function setActive(id) {
            items.forEach(function (it) {
                it.classList.toggle('active', it.getAttribute('data-target') === id);
            });
        }

        // Pick the section whose top has passed a line ~38% down the viewport.
        // This works even when a section is taller than the viewport (Projects,
        // Expertise), where a visibility-threshold observer never fires.
        function update() {
            var line = window.innerHeight * 0.38;
            var current = sections[0];
            for (var i = 0; i < sections.length; i++) {
                if (sections[i].getBoundingClientRect().top <= line) current = sections[i];
            }
            setActive(current.id);
        }

        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update, { passive: true });
        update();
    }

    // ----------------------------------------
    // Stat counter animation
    // ----------------------------------------
    function animateCounters() {
        document.querySelectorAll('[data-count]').forEach(function (el) {
            if (el.dataset.animated) return;
            var rect = el.getBoundingClientRect();
            if (rect.top > window.innerHeight || rect.bottom < 0) return;

            el.dataset.animated = 'true';
            var target = parseInt(el.dataset.count, 10);
            var duration = 1400;
            var start = performance.now();
            function update(now) {
                var progress = Math.min((now - start) / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(eased * target);
                if (progress < 1) requestAnimationFrame(update);
            }
            requestAnimationFrame(update);
        });
    }

    // ----------------------------------------
    // Scroll-triggered reveals — slow clip/slide, coordinated stagger
    // ----------------------------------------
    function initReveals() {
        if (reduceMotion) return;
        var revealEls = Array.prototype.slice.call(
            document.querySelectorAll(
                '.project-card, .expertise-group, .team-card, .client-card, .contact-card, .section-header'
            )
        );
        var groupCounters = {};
        revealEls.forEach(function (el) {
            el.classList.add('reveal');
            var key = (el.parentNode && el.parentNode.className) || 'root';
            groupCounters[key] = groupCounters[key] || 0;
            el.style.setProperty('--reveal-delay', (groupCounters[key] * 110) + 'ms');
            groupCounters[key]++;
        });
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });
        revealEls.forEach(function (el) { observer.observe(el); });
    }

    // ----------------------------------------
    // Top bar + scene dimming on scroll
    // The 3D hero scene fades back once you scroll past the hero so it
    // never competes with section content for legibility.
    // ----------------------------------------
    var topbar = document.getElementById('topbar');
    function onScroll() {
        var y = window.scrollY || 0;
        if (topbar) topbar.classList.toggle('topbar-scrolled', y > 50);
        // Past ~70% of the first viewport, mark body so the canvas dims
        document.body.classList.toggle('past-hero', y > window.innerHeight * 0.7);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ----------------------------------------
    // Boot
    // ----------------------------------------
    initSmoothScroll();
    initIntro();
    initScrollSpy();
    initReveals();
    initMusic();
    window.addEventListener('scroll', animateCounters, { passive: true });
    animateCounters();
})();
