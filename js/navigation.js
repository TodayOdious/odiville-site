/* ========== PAGE NAVIGATION ========== */

function navigateTo(pageId) {
  const currentPage = document.querySelector('.page.active');
  const targetPage = document.getElementById('page-' + pageId);
  if (!targetPage || currentPage === targetPage) return;

  // Update nav link active state
  document.querySelectorAll('.nav-links a[data-page]').forEach(a => a.classList.remove('active'));
  const activeLink = document.querySelector('.nav-links a[data-page="' + pageId + '"]');
  if (activeLink) activeLink.classList.add('active');

  // Animate out current page
  currentPage.classList.add('exiting');
  currentPage.classList.remove('active');

  setTimeout(() => {
    currentPage.classList.remove('exiting');
    targetPage.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Update URL hash without triggering popstate
    history.pushState(null, '', pageId === 'home' ? window.location.pathname : '#' + pageId);

    // Re-observe reveals on new page
    observeReveals();

    // Re-init torch cards if navigating to home
    if (pageId === 'home') {
      initTorchCards();
    }

    // Init particles for the new page
    initParticles();

    // Observe any newly visible lazy images
    initLazyImages();

    // Autoplay videos in new page
    initVideoAutoplay();
  }, 400);
}

function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* Hamburger / mobile nav */
function closeNav() {
  const navLinks = document.getElementById('nav-links');
  const hamburger = document.getElementById('nav-hamburger');
  if (navLinks) navLinks.classList.remove('open');
  if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}


/* ========== SCROLL REVEAL ========== */

function observeReveals() {
  const reveals = document.querySelectorAll('.page.active .reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach(el => {
    if (!el.classList.contains('visible')) {
      observer.observe(el);
    }
  });
}


/* ========== PARTICLES ========== */

function initParticles() {
  document.querySelectorAll('.page.active .particles').forEach(container => {
    if (container.children.length > 0) return;
    const count = 33;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      const isLarge = Math.random() < 0.3;
      p.className = 'particle' + (isLarge ? ' particle--large' : '');
      const size = isLarge ? (Math.random() * 4 + 4) : (Math.random() * 3 + 1.5);
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const duration = Math.random() * 5.2 + 3.9;
      const delay = -(Math.random() * duration);
      const drift = (Math.random() - 0.5) * 120;
      const rise = -(Math.random() * 300 + 150);
      const opacity = isLarge ? (Math.random() * 0.18 + 0.14) : (Math.random() * 0.22 + 0.12);

      p.style.cssText = `
        width: ${size}px; height: ${size}px;
        left: ${left}%; top: ${top}%;
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
        --p-drift: ${drift}px;
        --p-rise: ${rise}px;
        --p-opacity: ${opacity};
      `;
      container.appendChild(p);
    }
  });
}


/* ========== TORCH CARD EFFECT ========== */

function initTorchCards() {
  if (window.matchMedia('(hover: none)').matches) return;
  const cards = document.querySelectorAll('.page.active .project-card');

  cards.forEach(card => {
    if (card._torchInit) return;
    card._torchInit = true;

    const canvas = card.querySelector('.card-fx');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouseX = -200, mouseY = -200;
    let isHovering = false;
    let animId = null;

    function resize() {
      const rect = card.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    class Mote {
      constructor(x, y) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 40 + 10;
        this.x = x + Math.cos(angle) * dist;
        this.y = y + Math.sin(angle) * dist;
        this.size = Math.random() * 1.2 + 0.3;
        this.life = 1;
        this.decay = Math.random() * 0.006 + 0.003;
        this.vy = -(Math.random() * 0.35 + 0.1);
        this.vx = (Math.random() - 0.5) * 0.15;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx += (Math.random() - 0.5) * 0.008;
        this.life -= this.decay;
      }
      draw(ctx) {
        if (this.life <= 0) return;
        const alpha = this.life * 0.18;
        if (alpha < 0.01) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * (0.5 + this.life * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(234, 230, 222, ${alpha})`;
        ctx.fill();
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (isHovering && Math.random() < 0.3) {
        particles.push(new Mote(mouseX, mouseY));
      }
      particles.forEach(p => { p.update(); p.draw(ctx); });
      particles = particles.filter(p => p.life > 0);
      animId = requestAnimationFrame(animate);
    }

    card.addEventListener('mouseenter', () => {
      isHovering = true;
      resize();
      if (!animId) animate();
    });

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      card.style.setProperty('--mx', mouseX + 'px');
      card.style.setProperty('--my', mouseY + 'px');
    });

    card.addEventListener('mouseleave', () => {
      isHovering = false;
      mouseX = -200;
      mouseY = -200;
      card.style.setProperty('--mx', '-100px');
      card.style.setProperty('--my', '-100px');
      setTimeout(() => {
        if (!isHovering && particles.length === 0) {
          cancelAnimationFrame(animId);
          animId = null;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }, 2500);
    });

    window.addEventListener('resize', resize);
  });
}


/* ========== VIDEO AUTOPLAY (IntersectionObserver) ========== */

function initVideoAutoplay() {
  const videos = document.querySelectorAll('.page.active video[muted]');
  if (!videos.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const v = entry.target;
      if (entry.isIntersecting) {
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, { threshold: 0.25 });

  videos.forEach(v => io.observe(v));
}


/* ========== LAZY IMAGE FADE-IN ========== */

function initLazyImages() {
  const imgs = document.querySelectorAll('img[loading="lazy"]');
  if (!imgs.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      if (img.complete) {
        img.classList.add('loaded');
      } else {
        img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
      }
      io.unobserve(img);
    });
  }, { rootMargin: '200px' });
  imgs.forEach(img => io.observe(img));
}


/* ========== INIT ========== */

document.addEventListener('DOMContentLoaded', () => {
  // Keyboard activation for nav links (they lack href so need keydown)
  document.querySelectorAll('.nav-links a[tabindex]').forEach(a => {
    a.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); a.click(); }
    });
  });

  // Hamburger toggle
  const hamburger = document.getElementById('nav-hamburger');
  const navLinks = document.getElementById('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  // Pages not shown in nav — redirect to home if accessed directly
  const HIDDEN_PAGES = ['owt', 'archive', 'press'];

  // Hash-based routing: browser back/forward
  window.addEventListener('popstate', () => {
    const hash = window.location.hash.slice(1);
    navigateTo(HIDDEN_PAGES.includes(hash) ? 'home' : (hash || 'home'));
  });

  // Deep-link on load
  const initHash = window.location.hash.slice(1);
  const initPage = HIDDEN_PAGES.includes(initHash) ? 'home' : initHash;
  if (initPage && document.getElementById('page-' + initPage)) {
    navigateTo(initPage);
  }

  observeReveals();
  initParticles();
  initTorchCards();
  initLazyImages();
  initVideoAutoplay();
});
