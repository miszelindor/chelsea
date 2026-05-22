// --- Nawigacja: zmiana tla po scrollu ---
const navbar = document.getElementById('navbar');
function updateNavbar() {
    if (window.scrollY > 60) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}
window.addEventListener('scroll', updateNavbar, { passive: true });
updateNavbar();

// --- Menu hamburgerowe ---
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
});

// Zamknij menu po kliknieciu w link
mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
    });
});

// --- Scroll reveal (Intersection Observer) ---
const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
});

revealElements.forEach(el => revealObserver.observe(el));

// --- Aktywna sekcja w nawigacji ---
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

function updateActiveLink() {
    const scrollY = window.scrollY + 120;
    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        if (scrollY >= top && scrollY < top + height) {
            navLinks.forEach(link => {
                link.style.color = '';
                if (link.getAttribute('href') === '#' + id) {
                    link.style.color = 'var(--gold-dark)';
                }
            });
        }
    });
}
window.addEventListener('scroll', updateActiveLink, { passive: true });

// --- Rozwijane oferty ---
document.querySelectorAll('.offer-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const feature = btn.closest('.offer-feature');
        const isOpen = feature.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        btn.querySelector('.offer-toggle-text').textContent = isOpen ? 'Zwiń' : 'Dowiedz się więcej';
    });
});

// --- Karuzela lektorów ---
(function() {
    const slides = document.querySelectorAll('.lektor-slide');
    const dots   = document.querySelectorAll('.lektor-dot');
    const prev   = document.querySelector('.lektor-arrow-prev');
    const next   = document.querySelector('.lektor-arrow-next');
    if (!slides.length) return;

    let current = 0;
    let autoplayId = null;
    const INTERVAL = 5000;

    function show(index) {
        current = (index + slides.length) % slides.length;
        slides.forEach((s, i) => {
            s.classList.toggle('active', i === current);
            s.setAttribute('aria-hidden', i === current ? 'false' : 'true');
        });
        dots.forEach((d, i) => {
            d.classList.toggle('active', i === current);
            d.setAttribute('aria-selected', i === current ? 'true' : 'false');
        });
    }

    function startAutoplay() {
        if (autoplayId) return;
        autoplayId = setInterval(() => show(current + 1), INTERVAL);
    }

    function stopAutoplay() {
        if (!autoplayId) return;
        clearInterval(autoplayId);
        autoplayId = null;
    }

    function manualNavigate(handler) {
        return (e) => {
            stopAutoplay();
            handler(e);
        };
    }

    prev && prev.addEventListener('click', manualNavigate(() => show(current - 1)));
    next && next.addEventListener('click', manualNavigate(() => show(current + 1)));
    dots.forEach(dot => {
        dot.addEventListener('click', manualNavigate(() => show(parseInt(dot.dataset.index, 10))));
    });

    // Swipe na mobile
    const track = document.querySelector('.lektor-track');
    if (track) {
        let startX = 0;
        track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
        track.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 50) {
                stopAutoplay();
                show(current + (dx < 0 ? 1 : -1));
            }
        });
    }

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        startAutoplay();
    }
})();

// --- Marquee opinii (auto-scroll + drag/swipe, bezszwowa pętla) ---
(function() {
    const track = document.getElementById('reviewsTrack');
    if (!track) return;

    const originals = Array.from(track.children);
    if (!originals.length) return;

    // Klonujemy zestaw kart — track ma 2 identyczne zestawy obok siebie.
    originals.forEach(card => {
        const clone = card.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
    });

    const SPEED_PX_PER_SEC = 50;
    let setWidth = 0;
    let offset = 0;          // bieżąca pozycja translateX (zawsze w zakresie -setWidth..0)
    let lastTime = 0;
    let paused = false;

    // Drag state
    let isDragging = false;
    let dragStartX = 0;
    let dragStartOffset = 0;
    let dragMoved = false;

    function measure() {
        setWidth = originals.reduce((sum, c) => {
            const cs = getComputedStyle(c);
            const m = parseFloat(cs.marginRight) || 0;
            return sum + c.offsetWidth + m;
        }, 0);
    }

    function normalize() {
        // utrzymujemy offset w zakresie (-setWidth, 0] — bezszwowo
        if (setWidth <= 0) return;
        while (offset <= -setWidth) offset += setWidth;
        while (offset > 0) offset -= setWidth;
    }

    function tick(time) {
        if (!lastTime) lastTime = time;
        const dt = (time - lastTime) / 1000;
        lastTime = time;

        if (!paused && !isDragging && setWidth > 0) {
            offset -= SPEED_PX_PER_SEC * dt;
            normalize();
        }

        track.style.transform = 'translateX(' + offset + 'px)';
        requestAnimationFrame(tick);
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) paused = true;

    // Pomiar po załadowaniu wszystkich zasobów + start animacji
    function start() {
        measure();
        requestAnimationFrame(tick);
    }
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start);

    // Resize: ponowny pomiar
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            measure();
            normalize();
        }, 200);
    });

    // Pauza na hover (klawiatura/focus pauzuje tak samo)
    const wrapper = track.parentElement;
    wrapper.addEventListener('mouseenter', () => paused = true);
    wrapper.addEventListener('mouseleave', () => paused = false);
    wrapper.addEventListener('focusin',    () => paused = true);
    wrapper.addEventListener('focusout',   () => paused = false);

    // --- Drag / swipe ---
    track.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        isDragging = true;
        dragMoved = false;
        dragStartX = e.clientX;
        dragStartOffset = offset;
        track.classList.add('is-dragging');
        track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', e => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartX;
        if (Math.abs(dx) > 3) dragMoved = true;
        offset = dragStartOffset + dx;
        normalize();
    });

    function endDrag(e) {
        if (!isDragging) return;
        isDragging = false;
        track.classList.remove('is-dragging');
        try { track.releasePointerCapture(e.pointerId); } catch(_) {}
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener('lostpointercapture', endDrag);

    // Zablokuj kliknięcia w linki/przyciski jeśli był drag (żeby nie wywołać linku przypadkiem)
    track.addEventListener('click', e => {
        if (dragMoved) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);
})();

// --- Formularz kontaktowy (Web3Forms) ---
async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;
    const originalBg = btn.style.background;

    // Stan: wysyłanie
    btn.innerHTML = 'Wysyłanie...';
    btn.disabled = true;

    try {
        const response = await fetch(form.action, {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: new FormData(form)
        });
        const data = await response.json();

        if (response.ok && data.success) {
            // Sukces
            btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Wysłano!';
            btn.style.background = '#22c55e';
            form.reset();
        } else {
            throw new Error(data.message || 'Błąd wysyłki');
        }
    } catch (err) {
        // Błąd
        btn.innerHTML = 'Spróbuj ponownie';
        btn.style.background = '#ef4444';
        console.error('Błąd formularza:', err);
    }

    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = originalBg;
        btn.disabled = false;
    }, 3000);
}

