// Small shared helpers: escaping, IDs, platform checks, clipboard, toast, confirm modal.
import { NUMBER_LENGTHS, state } from './state.js';

// ============================================
// SECURITY: HTML Escape Function
// ============================================
export function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function getNumberLength(tab, type) {
    return NUMBER_LENGTHS[tab][type] || 0;
}

export function getTabData(tab = state.currentTab) {
    return tab === 'underground' ? state.undergroundData : state.governmentData;
}

export function getTabName(tab = state.currentTab) {
    return tab === 'underground' ? 'ใต้ดิน' : 'รัฐบาล';
}

export function vibrate(pattern) {
    try {
        navigator.vibrate?.(pattern);
    } catch { /* Vibration is optional. */ }
}

// มือถือ/iOS ใช้ numpad ของแอปแทนคีย์บอร์ดระบบ
export function usesCustomNumpad() {
    return isIOS() || !isDesktop();
}

export function syncNumberInputReadonly(input) {
    if (!input) return;
    if (usesCustomNumpad()) input.setAttribute('readonly', 'readonly');
    else input.removeAttribute('readonly');
}

export async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Fallback for browsers without async clipboard permission
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            return document.execCommand('copy');
        } catch {
            return false;
        } finally {
            textarea.remove();
        }
    }
}

// ============================================
// ID GENERATION: Unique ID Generator
// ============================================
export function generateUniqueId() {
    // Use crypto.randomUUID() if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback: timestamp + random + counter
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${Math.random().toString(36).slice(2, 11)}`;
}

// ============================================
// SMART INPUT HANDLING (Desktop vs Mobile)
// ============================================

// ตรวจสอบว่าเป็น iOS หรือไม่
export function isIOS() {
    try {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    } catch (e) {
        console.error('isIOS detection error:', e);
        return false;
    }
}

// ตรวจสอบว่าเป็น Desktop หรือ Mobile
export function isDesktop() {
    try {
        return window.innerWidth >= 768 && !('ontouchstart' in window) && !isIOS();
    } catch (e) {
        console.error('isDesktop detection error:', e);
        return false;
    }
}

export function getLocalDateValue(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

// iPhone/iPad (ไม่รวม iPad ที่แสดงเป็น Mac) ใช้สำหรับเลือกวิธีบันทึกรูป
export const isIOSDevice = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

// Generic Custom Confirm Modal (Promise-based)
export function showCustomConfirm({
    title = 'ยืนยันการทำรายการ',
    message = 'ต้องการดำเนินการต่อหรือไม่?',
    confirmText = 'ตกลง',
    cancelText = 'ยกเลิก',
    isDanger = true
} = {}) {
    return new Promise(resolve => {
        const modal = document.getElementById('confirmModal');
        const content = document.getElementById('confirmModalContent');
        const titleEl = document.getElementById('confirmModalTitle');
        const textEl = document.getElementById('confirmModalText');
        const okBtn = document.getElementById('confirmModalOkBtn');
        const cancelBtn = document.getElementById('confirmModalCancelBtn');

        if (!modal || !content || !okBtn || !cancelBtn) {
            resolve(window.confirm(message));
            return;
        }

        if (titleEl) titleEl.textContent = title;
        if (textEl) textEl.textContent = message;
        if (okBtn) {
            okBtn.textContent = confirmText;
            okBtn.className = isDanger
                ? 'sacred-modal-btn sacred-modal-btn-ok'
                : 'sacred-modal-btn sacred-modal-btn-ok gold-btn';
        }
        if (cancelBtn) {
            cancelBtn.textContent = cancelText;
            cancelBtn.className = 'sacred-modal-btn sacred-modal-btn-cancel';
        }

        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        });

        const cleanup = (result) => {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
                okBtn.removeEventListener('click', onOk);
                cancelBtn.removeEventListener('click', onCancel);
                document.removeEventListener('keydown', onKeydown);
                resolve(result);
            }, 180);
        };

        const onOk = () => cleanup(true);
        const onCancel = () => cleanup(false);

        const onKeydown = event => {
            if (event.key === 'Escape') onCancel();
        };

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        document.addEventListener('keydown', onKeydown);
        okBtn.focus({ preventScroll: true });
    });
}

export function showToast(msg) {
    const toast = document.getElementById('toast');
    const message = document.getElementById('toastMessage');
    if (!toast || !message) return;
    message.textContent = msg;
    toast.classList.add('toast-show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('toast-show'), 2000);
}
