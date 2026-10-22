// App shell: device data vault, service worker, offline indicator and PWA install prompt.
import { showToast } from './utils.js';

export function toggleDeviceVault(forceOpen) {
    const vault = document.getElementById('deviceVault');
    const toggle = document.getElementById('deviceVaultToggle');
    const panel = document.getElementById('deviceVaultPanel');
    if (!vault || !toggle || !panel) return;
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !vault.classList.contains('is-open');
    vault.classList.toggle('is-open', shouldOpen);
    toggle.setAttribute('aria-expanded', String(shouldOpen));
    panel.setAttribute('aria-hidden', String(!shouldOpen));
    panel.inert = !shouldOpen;
}

export function registerServiceWorker() {
    if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
}

// ============================================
// OFFLINE DETECTION
// ============================================

export function setupOfflineDetection() {
    const indicator = document.getElementById('offlineIndicator');

    function updateOnlineStatus() {
        if (indicator) {
            if (navigator.onLine) {
                indicator.classList.add('hidden');
            } else {
                indicator.classList.remove('hidden');
                indicator.style.animation = 'slideInRight 0.3s ease-out';
            }
        }
    }

    window.addEventListener('online', () => {
        updateOnlineStatus();
        showToast('✓ กลับมาออนไลน์แล้ว');
    });

    window.addEventListener('offline', () => {
        updateOnlineStatus();
        showToast('⚠ ออฟไลน์ - ยังจดและบันทึกในเครื่องได้ตามปกติ');
    });

    // Initial check
    updateOnlineStatus();
}

// ============================================
// PWA CUSTOM INSTALL PROMPT
// ============================================
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Show the custom install banner
    showInstallBanner();
});

export function showInstallBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (!banner) return;
    clearTimeout(showInstallBanner.hideTimer);
    banner.classList.remove('hidden');
    banner.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('is-visible')));
}

export function dismissInstallBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (!banner) return;
    banner.classList.remove('is-visible');
    banner.setAttribute('aria-hidden', 'true');
    clearTimeout(showInstallBanner.hideTimer);
    showInstallBanner.hideTimer = setTimeout(() => {
        banner.classList.add('hidden');
    }, 360);
}

export async function triggerInstall() {
    dismissInstallBanner();
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again
    deferredPrompt = null;
}

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.getElementById('pwaInstallBanner')?.classList.contains('is-visible')) {
        dismissInstallBanner();
    }
});
