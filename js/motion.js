// Scroll-reveal motion, tab switching animation, ripple and confetti effects.
import { state } from './state.js';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// 'full' = มี animation, 'reduced' = ผู้ใช้ตั้งค่าเครื่องให้ลดการเคลื่อนไหว
export function applyMotionPreference(mode) {
    const effective = mode === 'full' || mode === 'reduced' ? mode : (prefersReducedMotion() ? 'reduced' : 'full');
    document.documentElement.dataset.motion = effective;
    document.documentElement.dataset.motionChoice = effective;
    return effective;
}

const motionEnabled = () => document.documentElement.dataset.motion === 'full';

export function setMotionMode(mode) {
    applyMotionPreference(mode);
    setupScrollMotion(true);
    replayMotionWithin(document.querySelector('.app-shell'));
}

export function getMotionTargets(root = document) {
    const selectors = [
        '.sacred-header', '.app-tabs', '.slip-meta-card',
        '.section-content > .grid', '.section-content > .card',
        '.app-shell > .mt-8', '.device-vault', 'footer'
    ];
    const targets = [];
    if (root.matches?.(selectors.join(','))) targets.push(root);
    root.querySelectorAll?.(selectors.join(',')).forEach(element => targets.push(element));
    return [...new Set(targets)];
}

export function replayMotionWithin(root) {
    if (!root || document.documentElement.dataset.motion !== 'full') return;
    const targets = getMotionTargets(root).filter(element => !element.classList.contains('hidden'));
    targets.forEach((element, index) => {
        element.style.setProperty('--motion-delay', `${Math.min(index * 55, 220)}ms`);
        element.classList.remove('is-visible');
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
        targets.forEach(element => element.classList.add('is-visible'));
    }));
}

export function setupScrollMotion(reset = false) {
    if (reset && window.__jodHuayMotionObserver) window.__jodHuayMotionObserver.disconnect();
    const targets = getMotionTargets();
    targets.forEach((element, index) => {
        element.classList.add('motion-reveal');
        element.style.setProperty('--motion-delay', `${(index % 4) * 55}ms`);
    });

    if (document.documentElement.dataset.motion !== 'full' || !('IntersectionObserver' in window)) {
        targets.forEach(element => element.classList.add('is-visible'));
        return;
    }

    targets.forEach(element => element.classList.remove('is-visible'));
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
    targets.forEach(element => observer.observe(element));
    window.__jodHuayMotionObserver = observer;
}

let tabTransitionActive = false;
let queuedTab = null;

export function setTabState(tab) {
    const governmentTab = document.getElementById('tabGovernment');
    const undergroundTab = document.getElementById('tabUnderground');
    [governmentTab, undergroundTab].forEach(button => {
        const isActive = button === (tab === 'government' ? governmentTab : undergroundTab);
        button?.classList.toggle('active', isActive);
        button?.setAttribute('aria-selected', String(isActive));
    });
    // ปุ่มล้างข้อมูลล้างเฉพาะแท็บที่เปิดอยู่ จึงบอกชื่อแท็บให้ชัด
    const clearButton = document.getElementById('clearDataBtn');
    if (clearButton) clearButton.textContent = `ล้างรายการหวย${tab === 'underground' ? 'ใต้ดิน' : 'รัฐบาล'}`;
}

export function animateTabTap(button) {
    if (!button?.animate || !motionEnabled()) return;
    button.animate([
        { transform: 'scale(1.02)' },
        { transform: 'scale(0.975)', offset: 0.42 },
        { transform: 'scale(1.02)' }
    ], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
}

export async function switchTab(tab) {
    if (!['government', 'underground'].includes(tab)) return;

    if (tabTransitionActive) {
        queuedTab = tab;
        animateTabTap(document.getElementById(tab === 'government' ? 'tabGovernment' : 'tabUnderground'));
        return;
    }

    const stage = document.getElementById('lotterySectionsStage');
    const fromSection = document.getElementById(state.currentTab === 'government' ? 'governmentSection' : 'undergroundSection');
    const toSection = document.getElementById(tab === 'government' ? 'governmentSection' : 'undergroundSection');
    const selectedTab = document.getElementById(tab === 'government' ? 'tabGovernment' : 'tabUnderground');

    if (!stage || !fromSection || !toSection) return;
    if (tab === state.currentTab && !toSection.classList.contains('hidden')) {
        animateTabTap(selectedTab);
        return;
    }

    tabTransitionActive = true;
    state.currentTab = tab;
    setTabState(tab);
    document.body.classList.add('transitioning');
    stage.classList.add('is-switching');

    const finishImmediately = !Element.prototype.animate || !motionEnabled();
    if (finishImmediately) {
        fromSection.classList.add('hidden');
        toSection.classList.remove('hidden');
        getMotionTargets(toSection).forEach(element => element.classList.add('is-visible'));
        stage.classList.remove('is-switching');
        document.body.classList.remove('transitioning');
        tabTransitionActive = false;
        const nextTab = queuedTab;
        queuedTab = null;
        if (nextTab && nextTab !== state.currentTab) switchTab(nextTab);
        return;
    }

    const direction = tab === 'underground' ? 1 : -1;
    const fromHeight = Math.max(1, fromSection.offsetHeight);
    stage.style.height = `${fromHeight}px`;
    toSection.classList.remove('hidden');
    toSection.setAttribute('aria-hidden', 'false');
    fromSection.setAttribute('aria-hidden', 'true');
    getMotionTargets(toSection).forEach(element => element.classList.add('is-visible'));
    const toHeight = Math.max(1, toSection.offsetHeight);

    // Commit the starting height before changing it so the page does not jump.
    stage.getBoundingClientRect();
    stage.style.height = `${toHeight}px`;

    let outgoingKeyframes, incomingKeyframes, outgoingOptions, incomingOptions, childKeyframes, childOptionsFn;

    if (tab === 'government') {
        // หวยรัฐบาล: โทนสง่างาม ลอยเปิดขึ้นตรงๆ สไตล์แผ่นสลากทางการ (Vertical Rise & Noble Flow)
        outgoingKeyframes = [
            { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' },
            { opacity: 0, transform: 'translate3d(0,12px,0) scale(0.975)' }
        ];
        outgoingOptions = { duration: 170, easing: 'ease-in', fill: 'both' };

        incomingKeyframes = [
            { opacity: 0, transform: 'translate3d(0,-24px,0) scale(0.97)' },
            { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }
        ];
        incomingOptions = { duration: 320, delay: 40, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' };

        childKeyframes = [
            { opacity: 0.5, transform: 'translate3d(0,-12px,0)' },
            { opacity: 1, transform: 'translate3d(0,0,0)' }
        ];
        childOptionsFn = index => ({
            duration: 280,
            delay: 80 + index * 40,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'both'
        });
    } else {
        // หวยใต้ดิน: โทนจดด่วน สไลด์แนวนอนฉับไวจากขวาไปซ้าย (Swift Horizontal Slide & Bounce)
        outgoingKeyframes = [
            { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' },
            { opacity: 0, transform: 'translate3d(-28px,0,0) scale(0.98)' }
        ];
        outgoingOptions = { duration: 160, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'both' };

        incomingKeyframes = [
            { opacity: 0, transform: 'translate3d(36px,0,0) scale(0.98)' },
            { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }
        ];
        incomingOptions = { duration: 290, delay: 30, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' };

        childKeyframes = [
            { opacity: 0.6, transform: 'translate3d(18px,0,0)' },
            { opacity: 1, transform: 'translate3d(0,0,0)' }
        ];
        childOptionsFn = index => ({
            duration: 250,
            delay: 70 + index * 35,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'both'
        });
    }

    const outgoing = fromSection.animate(outgoingKeyframes, outgoingOptions);
    const incoming = toSection.animate(incomingKeyframes, incomingOptions);

    const childTargets = [...toSection.children].slice(0, 4);
    const childAnimations = childTargets.map((element, index) => element.animate(childKeyframes, childOptionsFn(index)));

    try {
        // The timeout is a safety net for background tabs where browsers may pause animation timelines.
        await Promise.race([
            Promise.all([outgoing.finished, incoming.finished, ...childAnimations.map(animation => animation.finished)]),
            new Promise(resolve => setTimeout(resolve, 650))
        ]);
    } catch { /* A cancelled browser animation should still end in a valid tab state. */ }

    outgoing.cancel();
    incoming.cancel();
    childAnimations.forEach(animation => animation.cancel());
    fromSection.classList.add('hidden');
    fromSection.removeAttribute('aria-hidden');
    toSection.removeAttribute('aria-hidden');
    stage.classList.remove('is-switching');
    stage.style.height = 'auto';
    document.body.classList.remove('transitioning');
    tabTransitionActive = false;

    const nextTab = queuedTab;
    queuedTab = null;
    if (nextTab && nextTab !== state.currentTab) switchTab(nextTab);
}

// Animate number rolling effect
export function animateValue(id, start, end, duration, suffix = '') {
    const obj = document.getElementById(id);
    if (!obj) return;

    // ถ้าค่าเท่าเดิมไม่ต้องวิ่ง
    if (start === end) {
        obj.innerHTML = end.toLocaleString() + suffix;
        return;
    }

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);

        // Easing function (ease-out)
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        // คำนวณค่าปัจจุบัน
        const current = Math.floor(easeProgress * (end - start) + start);
        obj.innerHTML = current.toLocaleString() + suffix;

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end.toLocaleString() + suffix;
        }
    };
    window.requestAnimationFrame(step);
}

// ============================================
// RIPPLE EFFECT - คลื่นพลัง
// ============================================
document.addEventListener('click', function (e) {
    const btn = e.target.closest('.gold-btn') || e.target.closest('.tab-btn');
    if (btn) {
        const circle = document.createElement('span');
        const diameter = Math.max(btn.clientWidth, btn.clientHeight);
        const radius = diameter / 2;

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${e.clientX - btn.getBoundingClientRect().left - radius}px`;
        circle.style.top = `${e.clientY - btn.getBoundingClientRect().top - radius}px`;
        circle.classList.add('ripple');

        // ลบ ripple เก่าออก
        const oldRipple = btn.querySelector('.ripple');
        if (oldRipple) oldRipple.remove();

        btn.appendChild(circle);

        // ลบ ripple หลัง animation จบ
        setTimeout(() => circle.remove(), 600);
    }
});

// ============================================
// CONFETTI ANIMATION
// ============================================

export function showConfetti() {
    if (!motionEnabled()) return;
    const canvas = document.getElementById('confetti');
    if (!canvas) return;

    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#FFD700', '#DAA520', '#B8860B', '#F0E68C', '#FAFAD2'];

    // Create particles
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: -10,
            size: Math.random() * 8 + 4,
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 4 - 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let activeParticles = 0;

        particles.forEach(p => {
            if (p.y < canvas.height) {
                activeParticles++;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();

                p.y += p.speedY;
                p.x += p.speedX;
                p.rotation += p.rotationSpeed;
                p.speedY += 0.1; // Gravity
            }
        });

        if (activeParticles > 0) {
            requestAnimationFrame(animate);
        } else {
            canvas.style.display = 'none';
        }
    }

    animate();
}
