// Custom on-screen number pad used on touch devices.
import { typeNames } from './state.js';
import { getNumberLength, showToast, vibrate } from './utils.js';

// Open NumPad for Government
export function openGovNumpad() {
    const type = document.getElementById('govType').value;
    const maxLen = getNumberLength('government', type);
    const label = typeNames[type] || 'กรอกเลข';
    openNumpad('govNumber', label, maxLen);
}

// Open NumPad for Underground
export function openUgNumpad() {
    const type = document.getElementById('ugType').value;
    const maxLen = getNumberLength('underground', type);
    const label = typeNames[type] || 'กรอกเลข';
    openNumpad('ugNumber', label, maxLen, () => {
        // Auto focus to price after number input
        setTimeout(() => document.getElementById('ugPriceDirect').focus(), 100);
    });
}

// Open NumPad for Price
export function openPriceNumpad(targetId, label) {
    openNumpad(targetId, label, 5);
}

// Open NumPad for Tod (can be number or glab)
export function openTodNumpad() {
    const select = document.getElementById('ugTodType');
    const value = select?.value;

    // ถ้าเลือก กลับ 3/6 อยู่ ไม่ต้องเปิด numpad
    if (value === 'ก.3' || value === 'ก.6') {
        return;
    }

    openPriceNumpad('ugPriceTod', 'ราคาโต๊ด');
}

// ============================================
// CUSTOM NUMPAD
// ============================================

let numpadTarget = null;
let numpadValue = '';
let numpadMaxLength = 6;
let numpadCallback = null;
let numpadIsPrice = false;

export function animateNumpadValue() {
    const valueDisplay = document.getElementById('numpadValue');
    if (!valueDisplay) return;
    valueDisplay.classList.remove('numpad-value-pop');
    void valueDisplay.offsetWidth;
    valueDisplay.classList.add('numpad-value-pop');
}

export function openNumpad(targetId, label, maxLen, callback) {
    try {
        const targetElement = document.getElementById(targetId);
        if (!targetElement) {
            console.error('Target element not found:', targetId);
            return;
        }

        numpadTarget = targetId;
        numpadValue = targetElement.value || '';
        numpadMaxLength = maxLen;
        numpadCallback = callback;
        numpadIsPrice = targetId.includes('Price');

        // สร้าง placeholder ตามจำนวนหลัก
        let placeholder;
        if (!numpadIsPrice) {
            // เลขหวย: แสดงแบบมีช่องว่าง (เช่น _ _ _)
            placeholder = Array(maxLen).fill('_').join(' ');
        } else {
            // ราคา: แสดงแบบติดกัน (เช่น ___)
            placeholder = '_'.repeat(maxLen);
        }

        const valueDisplay = document.getElementById('numpadValue');
        const labelDisplay = document.getElementById('numpadLabel');

        if (valueDisplay) {
            if (numpadValue) {
                // ถ้ามีค่าอยู่แล้ว แสดงแบบมีช่องว่าง (เฉพาะเลขหวย)
                if (!numpadIsPrice) {
                    valueDisplay.textContent = numpadValue.split('').join(' ');
                } else {
                    valueDisplay.textContent = numpadValue;
                }
            } else {
                valueDisplay.textContent = placeholder;
            }
        }
        if (labelDisplay) labelDisplay.textContent = label;
        animateNumpadValue();

        // แสดง/ซ่อนปุ่มราคาด่วน
        const quickBtns = document.getElementById('quickPriceButtons');
        if (quickBtns) {
            quickBtns.classList.toggle('hidden', !numpadIsPrice);
        }

        const overlay = document.getElementById('numpadOverlay');
        if (overlay) {
            document.body.classList.add('numpad-open');
            overlay.classList.remove('hidden');
            overlay.classList.add('active');
        }
    } catch (error) {
        console.error('Open numpad error:', error);
        showToast('⚠️ ไม่สามารถเปิดแป้นตัวเลขได้');
    }
}

export function closeNumpad() {
    try {
        const overlay = document.getElementById('numpadOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        document.body.classList.remove('numpad-open');
        numpadTarget = null;
        numpadValue = '';
        numpadCallback = null;
        numpadIsPrice = false;
    } catch (error) {
        console.error('Close numpad error:', error);
    }
}

export function numpadPress(num) {
    try {
        if (numpadValue.length >= numpadMaxLength) return;
        numpadValue += num;

        const valueDisplay = document.getElementById('numpadValue');
        if (valueDisplay) {
            // แสดงตัวเลขแบบมีช่องว่าง (เฉพาะเลขหวย ไม่ใช่ราคา)
            if (!numpadIsPrice) {
                valueDisplay.textContent = numpadValue.split('').join(' ');
            } else {
                valueDisplay.textContent = numpadValue;
            }
        }
        animateNumpadValue();

        // Haptic feedback - สั่นเบาๆ
        vibrate(10);

        // Auto confirm เมื่อกรอกครบ (เฉพาะเลขหวย ไม่ใช่ราคา)
        if (!numpadIsPrice && numpadValue.length >= numpadMaxLength) {
            setTimeout(() => confirmNumpad(), 150);
        }
    } catch (error) {
        console.error('Numpad press error:', error);
    }
}

export function numpadClear() {
    try {
        numpadValue = '';
        const valueDisplay = document.getElementById('numpadValue');
        if (valueDisplay) {
            // แสดง placeholder แบบมีช่องว่าง (เฉพาะเลขหวย)
            if (!numpadIsPrice) {
                const placeholder = Array(numpadMaxLength).fill('_').join(' ');
                valueDisplay.textContent = placeholder;
            } else {
                valueDisplay.textContent = '_'.repeat(numpadMaxLength);
            }
        }
        animateNumpadValue();
        vibrate(20);
    } catch (error) {
        console.error('Numpad clear error:', error);
    }
}

export function numpadBackspace() {
    try {
        numpadValue = numpadValue.slice(0, -1);
        const valueDisplay = document.getElementById('numpadValue');
        if (valueDisplay) {
            if (!numpadIsPrice) {
                // แสดงตัวเลขที่เหลือแบบมีช่องว่าง หรือ placeholder
                if (numpadValue) {
                    valueDisplay.textContent = numpadValue.split('').join(' ');
                } else {
                    const placeholder = Array(numpadMaxLength).fill('_').join(' ');
                    valueDisplay.textContent = placeholder;
                }
            } else {
                valueDisplay.textContent = numpadValue || '_'.repeat(numpadMaxLength);
            }
        }
        animateNumpadValue();
        vibrate(10);
    } catch (error) {
        console.error('Numpad backspace error:', error);
    }
}

export function confirmNumpad() {
    try {
        if (numpadTarget) {
            const targetElement = document.getElementById(numpadTarget);
            if (targetElement) {
                targetElement.value = numpadValue;
            }
        }
        if (numpadCallback) {
            numpadCallback(numpadValue);
        }
        closeNumpad();
    } catch (error) {
        console.error('Confirm numpad error:', error);
        closeNumpad();
    }
}

// ปุ่มราคาด่วน
export function quickPrice(amount) {
    try {
        numpadValue = String(amount);
        const valueDisplay = document.getElementById('numpadValue');
        if (valueDisplay) valueDisplay.textContent = numpadValue;
        animateNumpadValue();
        vibrate(10);
        setTimeout(() => confirmNumpad(), 100);
    } catch (error) {
        console.error('Quick price error:', error);
    }
}
