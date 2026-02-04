let currentTab = 'government';
let undergroundData = [];
let governmentData = [];
let selectedItems = new Set();
let showTodPrice = false;

// Offline detection
let isOnline = navigator.onLine;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    try {
        loadData();
        renderAll();
        registerServiceWorker();

        // Setup Choice Chips
        setupChoiceChips();

        // Setup Auto Jump for number inputs
        setupAutoJump();

        // Setup event listeners
        const ugPriceDirect = document.getElementById('ugPriceDirect');
        const govNumber = document.getElementById('govNumber');

        if (ugPriceDirect) ugPriceDirect.addEventListener('keypress', e => { if (e.key === 'Enter') addUnderground(); });
        if (govNumber) govNumber.addEventListener('keypress', e => { if (e.key === 'Enter') addGovernment(); });

        // Setup offline detection
        setupOfflineDetection();

        // Setup swipe to delete
        setupSwipeToDelete();

        // Setup window resize handler to update readonly state
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                updateInputReadonlyState();
            }, 250);
        });

        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            // Don't show toast for every error, just log it
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            // Don't show toast for every error, just log it
        });
    } catch (error) {
        console.error('DOMContentLoaded initialization error:', error);
        showToast('⚠️ เกิดข้อผิดพลาดในการเริ่มต้น');
    }
});

// Update readonly state for inputs based on platform
function updateInputReadonlyState() {
    try {
        const govNumber = document.getElementById('govNumber');
        const ugNumber = document.getElementById('ugNumber');
        const shouldBeReadonly = isIOS() || !isDesktop();

        if (govNumber) {
            if (shouldBeReadonly) {
                govNumber.setAttribute('readonly', 'readonly');
            } else {
                govNumber.removeAttribute('readonly');
            }
        }

        if (ugNumber) {
            if (shouldBeReadonly) {
                ugNumber.setAttribute('readonly', 'readonly');
            } else {
                ugNumber.removeAttribute('readonly');
            }
        }
    } catch (error) {
        console.error('updateInputReadonlyState error:', error);
    }
}

// Setup Choice Chips
function setupChoiceChips() {
    try {
        // Government Type Chips
        const govTypeChips = document.getElementById('govTypeChips');
        if (govTypeChips) {
            govTypeChips.addEventListener('click', (e) => {
                try {
                    const chip = e.target.closest('.choice-chip');
                    if (!chip) return;

                    govTypeChips.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    
                    const govType = document.getElementById('govType');
                    if (govType) {
                        govType.value = chip.dataset.value;
                        onGovTypeChange();
                    }
                    
                    // Focus หรือเปิด numpad ตามแพลตฟอร์ม
                    handleNumberInput('govNumber');
                } catch (error) {
                    console.error('govTypeChips click error:', error);
                }
            });
        }

        // Government Qty Chips
        const govQtyChips = document.getElementById('govQtyChips');
        if (govQtyChips) {
            govQtyChips.addEventListener('click', (e) => {
                try {
                    const chip = e.target.closest('.choice-chip');
                    if (!chip) return;

                    govQtyChips.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    
                    const govQty = document.getElementById('govQty');
                    if (govQty) {
                        govQty.value = chip.dataset.value;
                    }
                } catch (error) {
                    console.error('govQtyChips click error:', error);
                }
            });
        }

        // Underground Type Chips
        const ugTypeChips = document.getElementById('ugTypeChips');
        if (ugTypeChips) {
            ugTypeChips.addEventListener('click', (e) => {
                try {
                    const chip = e.target.closest('.choice-chip');
                    if (!chip) return;

                    ugTypeChips.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    
                    const ugType = document.getElementById('ugType');
                    if (ugType) {
                        ugType.value = chip.dataset.value;
                        onUgTypeChange();
                    }
                    
                    // Focus หรือเปิด numpad ตามแพลตฟอร์ม
                    handleNumberInput('ugNumber');
                } catch (error) {
                    console.error('ugTypeChips click error:', error);
                }
            });
        }
    } catch (error) {
        console.error('setupChoiceChips error:', error);
    }
}

// Setup Auto Jump - jump to next field when input is complete
function setupAutoJump() {
    // NumPad handles auto jump now
}

// Open NumPad for Government
function openGovNumpad() {
    const type = document.getElementById('govType').value;
    const maxLen = type === '6' ? 6 : (type === 'front3' || type === 'back3') ? 3 : 2;
    const label = typeNames[type] || 'กรอกเลข';
    openNumpad('govNumber', label, maxLen);
}

// Open NumPad for Underground
function openUgNumpad() {
    const type = document.getElementById('ugType').value;
    const maxLen = type === '3bon' ? 3 : (type === '2bon' || type === '2lang') ? 2 : 1;
    const label = typeNames[type] || 'กรอกเลข';
    openNumpad('ugNumber', label, maxLen, () => {
        // Auto focus to price after number input
        setTimeout(() => document.getElementById('ugPriceDirect').focus(), 100);
    });
}

window.openGovNumpad = openGovNumpad;
window.openUgNumpad = openUgNumpad;

// ============================================
// SMART INPUT HANDLING (Desktop vs Mobile)
// ============================================

// ตรวจสอบว่าเป็น iOS หรือไม่
function isIOS() {
    try {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    } catch (e) {
        console.error('isIOS detection error:', e);
        return false;
    }
}

// ตรวจสอบว่าเป็น Desktop หรือ Mobile
function isDesktop() {
    try {
        return window.innerWidth >= 768 && !('ontouchstart' in window) && !isIOS();
    } catch (e) {
        console.error('isDesktop detection error:', e);
        return false;
    }
}

// จัดการ input ตามแพลตฟอร์ม
function handleNumberInput(inputId) {
    try {
        const input = document.getElementById(inputId);
        if (!input) {
            console.warn('Input element not found:', inputId);
            return;
        }

        // iOS หรือ Mobile: บังคับใช้ numpad เสมอ
        if (isIOS() || !isDesktop()) {
            // ป้องกัน system keyboard บน iOS
            input.blur();
            input.setAttribute('readonly', 'readonly');
            
            // เปิด custom numpad
            if (inputId === 'govNumber') {
                openGovNumpad();
            } else if (inputId === 'ugNumber') {
                openUgNumpad();
            }
        } else {
            // Desktop: ให้พิมพ์ได้เลย
            input.removeAttribute('readonly');
            input.focus();
        }
    } catch (error) {
        console.error('handleNumberInput error:', error);
        showToast('⚠️ เกิดข้อผิดพลาด');
    }
}

// จัดการ keypress (เฉพาะตัวเลข + Enter)
function handleKeyPress(event, type) {
    try {
        // อนุญาตเฉพาะตัวเลข 0-9
        const charCode = event.which || event.keyCode;

        // Enter key
        if (charCode === 13) {
            event.preventDefault();
            if (type === 'government') {
                addGovernment();
            } else if (type === 'underground') {
                // Focus ไปที่ราคา
                const priceInput = document.getElementById('ugPriceDirect');
                if (priceInput) priceInput.focus();
            }
            return false;
        }

        // ตัวเลข 0-9
        if (charCode >= 48 && charCode <= 57) {
            return true;
        }

        // บล็อกตัวอักษรอื่นๆ
        event.preventDefault();
        return false;
    } catch (error) {
        console.error('handleKeyPress error:', error);
        return false;
    }
}

// Format input แบบมีช่องว่าง (เมื่อพิมพ์บน Desktop)
function formatNumberInput(input) {
    try {
        if (!input) {
            console.warn('formatNumberInput: input is null');
            return;
        }
        
        // เก็บ maxLength ที่แท้จริง (จำนวนตัวเลข)
        const realMaxLength = parseInt(input.getAttribute('data-max-length') || input.maxLength, 10);
        
        if (isNaN(realMaxLength) || realMaxLength <= 0) {
            console.warn('formatNumberInput: invalid maxLength');
            return;
        }
        
        // เอาเฉพาะตัวเลข
        let value = input.value.replace(/\D/g, '');
        
        // จำกัดความยาวตามจำนวนตัวเลขจริง
        if (value.length > realMaxLength) {
            value = value.slice(0, realMaxLength);
        }
        
        // แสดงแบบมีช่องว่าง
        input.value = value.split('').join(' ');
    } catch (error) {
        console.error('formatNumberInput error:', error);
    }
}

// เพิ่ม event listener สำหรับ input
document.addEventListener('DOMContentLoaded', function () {
    try {
        const govNumber = document.getElementById('govNumber');
        const ugNumber = document.getElementById('ugNumber');
        
        // ตั้งค่า readonly สำหรับ iOS/Mobile
        const shouldBeReadonly = isIOS() || !isDesktop();
        
        if (govNumber) {
            // เก็บ maxLength จริงไว้
            const originalMaxLength = govNumber.maxLength || 6;
            govNumber.setAttribute('data-max-length', originalMaxLength);
            // เพิ่ม maxLength ให้มากพอสำหรับช่องว่าง (เลข + ช่องว่าง)
            govNumber.maxLength = originalMaxLength * 2 - 1;
            
            // ตั้งค่า readonly สำหรับ iOS/Mobile
            if (shouldBeReadonly) {
                govNumber.setAttribute('readonly', 'readonly');
            }
            
            govNumber.addEventListener('input', function () {
                formatNumberInput(this);
            });
        } else {
            console.warn('govNumber element not found');
        }
        
        if (ugNumber) {
            // เก็บ maxLength จริงไว้
            const originalMaxLength = ugNumber.maxLength || 3;
            ugNumber.setAttribute('data-max-length', originalMaxLength);
            // เพิ่ม maxLength ให้มากพอสำหรับช่องว่าง (เลข + ช่องว่าง)
            ugNumber.maxLength = originalMaxLength * 2 - 1;
            
            // ตั้งค่า readonly สำหรับ iOS/Mobile
            if (shouldBeReadonly) {
                ugNumber.setAttribute('readonly', 'readonly');
            }
            
            ugNumber.addEventListener('input', function () {
                formatNumberInput(this);
            });
        } else {
            console.warn('ugNumber element not found');
        }
    } catch (error) {
        console.error('DOMContentLoaded input setup error:', error);
    }
});

window.handleNumberInput = handleNumberInput;
window.handleKeyPress = handleKeyPress;

// Open NumPad for Price
function openPriceNumpad(targetId, label) {
    openNumpad(targetId, label, 5);
}

window.openPriceNumpad = openPriceNumpad;

function switchTab(tab) {
    currentTab = tab;

    // Add transitioning class to body
    document.body.classList.add('transitioning');

    // Update tab buttons
    const undergroundTab = document.getElementById('tabUnderground');
    const governmentTab = document.getElementById('tabGovernment');
    const undergroundSection = document.getElementById('undergroundSection');
    const governmentSection = document.getElementById('governmentSection');

    // Update active states
    undergroundTab.classList.toggle('active', tab === 'underground');
    governmentTab.classList.toggle('active', tab === 'government');

    // Smooth transition with proper timing
    if (tab === 'underground') {
        // Hide government first
        governmentSection.style.opacity = '0';
        governmentSection.style.transform = 'translateY(20px)';

        setTimeout(() => {
            governmentSection.classList.add('hidden');
            undergroundSection.classList.remove('hidden');

            // Force reflow
            undergroundSection.offsetHeight;

            // Show underground
            undergroundSection.style.opacity = '1';
            undergroundSection.style.transform = 'translateY(0)';

            // Remove transitioning class
            setTimeout(() => {
                document.body.classList.remove('transitioning');
            }, 400);
        }, 200);
    } else {
        // Hide underground first
        undergroundSection.style.opacity = '0';
        undergroundSection.style.transform = 'translateY(20px)';

        setTimeout(() => {
            undergroundSection.classList.add('hidden');
            governmentSection.classList.remove('hidden');

            // Force reflow
            governmentSection.offsetHeight;

            // Show government
            governmentSection.style.opacity = '1';
            governmentSection.style.transform = 'translateY(0)';

            // Remove transitioning class
            setTimeout(() => {
                document.body.classList.remove('transitioning');
            }, 400);
        }, 200);
    }
}

window.switchTab = switchTab;

// ============================================
// DATA VERSION & MIGRATION
// ============================================

const DATA_VERSION = '1.1'; // เวอร์ชันข้อมูลปัจจุบัน

function getStorageKey(type) {
    return `lottery_${type}`;
}

function getVersionKey() {
    return 'lottery_data_version';
}

// ตรวจสอบและแปลงข้อมูลเก่า
function migrateData() {
    const currentVersion = localStorage.getItem(getVersionKey()) || '1.0';

    if (currentVersion === DATA_VERSION) {
        return; // ข้อมูลเป็นเวอร์ชันล่าสุดแล้ว
    }

    console.log(`Migrating data from ${currentVersion} to ${DATA_VERSION}`);

    try {
        // Migration จาก 1.0 -> 1.1: เพิ่ม amount field
        if (currentVersion === '1.0') {
            migrateToV1_1();
        }

        // บันทึกเวอร์ชันใหม่
        localStorage.setItem(getVersionKey(), DATA_VERSION);
        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration error:', error);
        showToast('⚠️ กำลังอัปเดตข้อมูล...');
    }
}

// Migration จาก 1.0 -> 1.1
function migrateToV1_1() {
    const undergroundRaw = localStorage.getItem(getStorageKey('underground'));

    if (!undergroundRaw) return;

    try {
        const data = JSON.parse(undergroundRaw);

        if (!Array.isArray(data)) return;

        let migrated = false;

        data.forEach(item => {
            // ถ้ายังไม่มี amount field ให้คำนวณใหม่
            if (!item.amount || item.amount === 0) {
                item.amount = calculateAmountFromPrice(item.price);
                migrated = true;
            }
        });

        if (migrated) {
            localStorage.setItem(getStorageKey('underground'), JSON.stringify(data));
            console.log('Migrated underground data to v1.1');
        }
    } catch (error) {
        console.error('Migration v1.1 error:', error);
    }
}

// คำนวณ amount จาก price string (สำหรับข้อมูลเก่า)
function calculateAmountFromPrice(priceStr) {
    if (!priceStr) return 0;

    try {
        const prices = priceStr.split(' x ');
        const firstPrice = parseInt(prices[0].trim(), 10);

        if (isNaN(firstPrice)) return 0;

        if (prices.length === 1) {
            // มีแค่เต็งอย่างเดียว
            return firstPrice;
        } else if (prices.length === 2) {
            const secondPart = prices[1].trim();

            if (secondPart === 'กลับ 3') {
                return firstPrice * 3;
            } else if (secondPart === 'กลับ 6') {
                return firstPrice * 6;
            } else {
                const secondPrice = parseInt(secondPart, 10);
                if (!isNaN(secondPrice)) {
                    return firstPrice + secondPrice;
                }
            }
        }

        return firstPrice;
    } catch (error) {
        console.error('Calculate amount error:', error);
        return 0;
    }
}

// ตรวจสอบและซ่อมแซมข้อมูลที่เสียหาย
function validateAndFixData(data, type) {
    if (!Array.isArray(data)) return [];

    return data.filter(item => {
        // ตรวจสอบ required fields
        if (!item || typeof item !== 'object') return false;
        if (!item.id) return false;
        if (!item.number || typeof item.number !== 'string') return false;

        if (type === 'underground') {
            if (!item.type || !typeNames[item.type]) return false;
            if (!item.price) return false;

            // ถ้าไม่มี amount ให้คำนวณใหม่
            if (!item.amount || item.amount === 0) {
                item.amount = calculateAmountFromPrice(item.price);
            }
        } else if (type === 'government') {
            if (!item.type || !typeNames[item.type]) return false;
            if (!item.qty || item.qty <= 0) item.qty = 1;
        }

        return true;
    });
}

function loadData() {
    try {
        // ทำ migration ก่อน
        migrateData();

        // โหลดข้อมูล
        const undergroundRaw = localStorage.getItem(getStorageKey('underground')) || '[]';
        const governmentRaw = localStorage.getItem(getStorageKey('government')) || '[]';

        undergroundData = JSON.parse(undergroundRaw);
        governmentData = JSON.parse(governmentRaw);

        // Validate และซ่อมแซมข้อมูล
        undergroundData = validateAndFixData(undergroundData, 'underground');
        governmentData = validateAndFixData(governmentData, 'government');

        // ถ้ามีการแก้ไข ให้บันทึกกลับ
        if (undergroundRaw !== JSON.stringify(undergroundData) ||
            governmentRaw !== JSON.stringify(governmentData)) {
            saveData();
            console.log('Data validated and fixed');
        }

    } catch (error) {
        console.error('Load data error:', error);

        // ถ้าโหลดไม่ได้ ให้สำรองข้อมูลและรีเซ็ต
        backupCorruptedData();
        undergroundData = [];
        governmentData = [];

        showToast('⚠️ พบข้อมูลเสียหาย กำลังรีเซ็ต...');
    }
}

// สำรองข้อมูลที่เสียหาย
function backupCorruptedData() {
    try {
        const timestamp = Date.now();
        const undergroundRaw = localStorage.getItem(getStorageKey('underground'));
        const governmentRaw = localStorage.getItem(getStorageKey('government'));

        if (undergroundRaw) {
            localStorage.setItem(`lottery_underground_backup_${timestamp}`, undergroundRaw);
        }
        if (governmentRaw) {
            localStorage.setItem(`lottery_government_backup_${timestamp}`, governmentRaw);
        }

        console.log('Corrupted data backed up with timestamp:', timestamp);
    } catch (error) {
        console.error('Backup error:', error);
    }
}

function saveData() {
    try {
        // ตรวจสอบข้อมูลก่อนบันทึก
        const undergroundValid = validateAndFixData(undergroundData, 'underground');
        const governmentValid = validateAndFixData(governmentData, 'government');

        // บันทึกข้อมูล
        localStorage.setItem(getStorageKey('underground'), JSON.stringify(undergroundValid));
        localStorage.setItem(getStorageKey('government'), JSON.stringify(governmentValid));

        // อัปเดตข้อมูลในหน่วยความจำ
        undergroundData = undergroundValid;
        governmentData = governmentValid;

    } catch (error) {
        console.error('Save data error:', error);

        if (error.name === 'QuotaExceededError') {
            // พื้นที่เต็ม - ลองลบ backup เก่า
            cleanupOldBackups();

            // ลองบันทึกอีกครั้ง
            try {
                localStorage.setItem(getStorageKey('underground'), JSON.stringify(undergroundData));
                localStorage.setItem(getStorageKey('government'), JSON.stringify(governmentData));
                showToast('✓ บันทึกสำเร็จ (ลบข้อมูลสำรองเก่า)');
            } catch (retryError) {
                showToast('⚠️ พื้นที่เต็ม กรุณาลบรายการเก่า');
            }
        } else {
            showToast('⚠️ ไม่สามารถบันทึกข้อมูลได้');
        }
    }
}

// ลบ backup เก่าที่เกิน 7 วัน
function cleanupOldBackups() {
    try {
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('lottery_') && key.includes('_backup_')) {
                const timestamp = parseInt(key.split('_backup_')[1], 10);
                if (!isNaN(timestamp) && (now - timestamp) > sevenDays) {
                    localStorage.removeItem(key);
                    console.log('Removed old backup:', key);
                }
            }
        });
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

// Type names
const typeNames = {
    '3bon': '3 ตัวบน',
    '2bon': '2 ตัวบน',
    '2lang': '2 ตัวล่าง',
    'runBon': 'วิ่งบน',
    'runLang': 'วิ่งล่าง',
    '6': '6 ตัวตรง',
    'front3': 'เลขหน้า 3 ตัว',
    'back3': 'เลขท้าย 3 ตัว',
    'back2': 'เลขท้าย 2 ตัว'
};

// Toggle Tod Price field
function toggleTodPrice() {
    showTodPrice = !showTodPrice;
    const section = document.getElementById('todPriceSection');
    const btn = document.getElementById('addTodBtn');
    const copyBtn = document.getElementById('copyPriceBtn');

    if (!section || !btn) return;

    if (showTodPrice) {
        section.classList.remove('hidden');
        btn.textContent = '−';
        if (copyBtn) copyBtn.classList.remove('hidden');
    } else {
        section.classList.add('hidden');
        btn.textContent = '+';
        if (copyBtn) copyBtn.classList.add('hidden');
        const todInput = document.getElementById('ugPriceTod');
        if (todInput) todInput.value = '';
    }
}

window.toggleTodPrice = toggleTodPrice;

// Copy price from เต็ง to โต๊ด
function copyPriceToTod() {
    const directInput = document.getElementById('ugPriceDirect');
    const directPrice = directInput?.value;

    if (!directPrice) {
        showToast('กรุณากรอกราคาเต็งก่อน');
        return;
    }

    // เปิดช่องโต๊ดถ้ายังไม่เปิด
    if (!showTodPrice) toggleTodPrice();

    // Copy ค่า
    const todInput = document.getElementById('ugPriceTod');
    if (todInput) todInput.value = directPrice;

    // สั่นนิดนึง
    if (navigator.vibrate) navigator.vibrate(50);

    showToast('คัดลอกราคาแล้ว');
}

window.copyPriceToTod = copyPriceToTod;

// Handle กลับ selection in Tod field
function onTodGlabChange() {
    const input = document.getElementById('ugPriceTod');
    const select = document.getElementById('ugTodType');

    if (!input || !select) return;

    const value = select.value;

    if (value === 'ก.3' || value === 'ก.6') {
        // ล็อคช่องและแสดง กลับ 3/กลับ 6
        const displayText = value === 'ก.3' ? 'กลับ 3' : 'กลับ 6';
        input.value = displayText;
        input.disabled = true;
        input.classList.add('glab-locked');
    } else {
        // ปลดล็อคและเคลียร์
        input.value = '';
        input.disabled = false;
        input.classList.remove('glab-locked');
    }
}

window.onTodGlabChange = onTodGlabChange;

// Open NumPad for Tod (can be number or glab)
function openTodNumpad() {
    const select = document.getElementById('ugTodType');
    const value = select?.value;

    // ถ้าเลือก กลับ 3/6 อยู่ ไม่ต้องเปิด numpad
    if (value === 'ก.3' || value === 'ก.6') {
        return;
    }

    openPriceNumpad('ugPriceTod', 'ราคาโต๊ด');
}

window.openTodNumpad = openTodNumpad;

// Handle กลับ selection - REMOVED (no longer used for Direct field)
function onGlabChange(field) {
    // This function is no longer needed for Direct field
    // Kept for backward compatibility
}

window.onGlabChange = onGlabChange;

// Underground type change
function onUgTypeChange() {
    try {
        const type = document.getElementById('ugType')?.value;
        const input = document.getElementById('ugNumber');
        
        if (!type || !input) {
            console.warn('onUgTypeChange: missing type or input');
            return;
        }

        let realMaxLength;
        if (type === '3bon') {
            realMaxLength = 3;
            input.placeholder = '_ _ _';
        } else if (type === '2bon' || type === '2lang') {
            realMaxLength = 2;
            input.placeholder = '_ _';
        } else {
            // วิ่ง
            realMaxLength = 1;
            input.placeholder = '_';
        }
        
        // เก็บ maxLength จริง
        input.setAttribute('data-max-length', realMaxLength);
        // ตั้ง maxLength ให้มากพอสำหรับช่องว่าง
        input.maxLength = realMaxLength * 2 - 1;
        input.value = '';
        
        // รักษา readonly state สำหรับ iOS/Mobile
        if (isIOS() || !isDesktop()) {
            input.setAttribute('readonly', 'readonly');
        }
    } catch (error) {
        console.error('onUgTypeChange error:', error);
    }
}

// Government type change
function onGovTypeChange() {
    try {
        const type = document.getElementById('govType')?.value;
        const input = document.getElementById('govNumber');
        
        if (!type || !input) {
            console.warn('onGovTypeChange: missing type or input');
            return;
        }
        
        let realMaxLength;
        if (type === '6') {
            realMaxLength = 6;
            input.placeholder = '_ _ _ _ _ _';
        } else if (type === 'front3' || type === 'back3') {
            realMaxLength = 3;
            input.placeholder = '_ _ _';
        } else {
            realMaxLength = 2;
            input.placeholder = '_ _';
        }
        
        // เก็บ maxLength จริง
        input.setAttribute('data-max-length', realMaxLength);
        // ตั้ง maxLength ให้มากพอสำหรับช่องว่าง
        input.maxLength = realMaxLength * 2 - 1;
        input.value = '';
        
        // รักษา readonly state สำหรับ iOS/Mobile
        if (isIOS() || !isDesktop()) {
            input.setAttribute('readonly', 'readonly');
        }
    } catch (error) {
        console.error('onGovTypeChange error:', error);
    }
}

// Add underground
function addUnderground() {
    const type = document.getElementById('ugType')?.value;
    const numberRaw = document.getElementById('ugNumber')?.value.trim();
    // ลบช่องว่างออก (กรณีพิมพ์บน Desktop)
    const number = numberRaw.replace(/\s/g, '');
    const priceDirectInput = document.getElementById('ugPriceDirect');
    const priceTodInput = document.getElementById('ugPriceTod');
    const todTypeSelect = document.getElementById('ugTodType');

    // Validate number length
    const expectedLen = type === '3bon' ? 3 : (type === '2bon' || type === '2lang') ? 2 : 1;

    if (!number || number.length !== expectedLen || !/^\d+$/.test(number)) {
        showToast(`กรุณากรอกเลข ${expectedLen} หลัก`);
        return;
    }

    // ตรวจสอบราคาเต็ง - ต้องเป็นตัวเลขเท่านั้น
    const priceDirect = priceDirectInput?.value.trim();

    if (!priceDirect || !/^\d+$/.test(priceDirect)) {
        showToast('กรุณากรอกราคาเต็ง');
        return;
    }

    // Validate price is a valid number
    const directAmount = parseInt(priceDirect, 10);
    if (isNaN(directAmount) || directAmount <= 0) {
        showToast('ราคาเต็งไม่ถูกต้อง');
        return;
    }

    // Build price string and calculate amount
    let priceStr = priceDirect;
    let amount = directAmount;

    // ตรวจสอบโต๊ด
    if (showTodPrice) {
        const priceTod = priceTodInput?.value.trim();
        const todType = todTypeSelect?.value;

        if (priceTod) {
            if (todType === 'ก.3') {
                // กลับ 3: เอาเต็งคูณ 3 (ไม่บวกเต็ง)
                priceStr += ' x กลับ 3';
                amount = directAmount * 3;
            } else if (todType === 'ก.6') {
                // กลับ 6: เอาเต็งคูณ 6 (ไม่บวกเต็ง)
                priceStr += ' x กลับ 6';
                amount = directAmount * 6;
            } else if (/^\d+$/.test(priceTod)) {
                // ตัวเลขธรรมดา: บวกกัน
                const todAmount = parseInt(priceTod, 10);
                if (isNaN(todAmount) || todAmount <= 0) {
                    showToast('ราคาโต๊ดไม่ถูกต้อง');
                    return;
                }
                priceStr += ' x ' + priceTod;
                amount += todAmount;
            }
        }
    }

    // Validate final amount
    if (isNaN(amount) || amount <= 0) {
        showToast('⚠️ เกิดข้อผิดพลาดในการคำนวณ');
        return;
    }

    try {
        // Add entry
        undergroundData.push({
            id: Date.now() + Math.random(),
            type,
            number: number,
            price: priceStr,
            amount: amount
        });

        saveData();
        renderUnderground();

        // Success feedback: Haptic + Sound
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]); // Pattern: vibrate-pause-vibrate

        // Clear form
        clearUndergroundForm();

        // Show confetti
        showConfetti();

        showToast('✓ เพิ่มแล้ว');
    } catch (error) {
        console.error('Add underground error:', error);
        showToast('⚠️ ไม่สามารถเพิ่มรายการได้');
    }
}

function clearUndergroundForm() {
    try {
        const ugNumberEl = document.getElementById('ugNumber');
        const ugPriceDirectEl = document.getElementById('ugPriceDirect');
        const ugPriceTodEl = document.getElementById('ugPriceTod');
        const ugTodTypeEl = document.getElementById('ugTodType');

        // เคลียร์เลข
        if (ugNumberEl) {
            ugNumberEl.value = '';
            // รักษา readonly state สำหรับ iOS/Mobile
            if (isIOS() || !isDesktop()) {
                ugNumberEl.setAttribute('readonly', 'readonly');
            }
        }

        // เคลียร์ราคาเต็ง
        if (ugPriceDirectEl) {
            ugPriceDirectEl.value = '';
            ugPriceDirectEl.disabled = false;
            ugPriceDirectEl.classList.remove('glab-locked');
        }

        // รีเซ็ต dropdown โต๊ด และปลดล็อคช่องราคาโต๊ด
        if (ugTodTypeEl) ugTodTypeEl.value = '';
        if (ugPriceTodEl) {
            ugPriceTodEl.value = '';
            ugPriceTodEl.disabled = false;
            ugPriceTodEl.classList.remove('glab-locked');
        }

        // Reset tod price section if open
        if (showTodPrice) {
            toggleTodPrice();
        }
    } catch (error) {
        console.error('clearUndergroundForm error:', error);
    }
}

function deleteUnderground(id) {
    try {
        const item = undergroundData.find(i => i.id === id);
        if (!item) {
            console.warn('deleteUnderground: item not found', id);
            return;
        }

        // Delete immediately
        undergroundData = undergroundData.filter(i => i.id !== id);
        saveData();
        renderUnderground();

        showToast(`ลบ "${item.number}" แล้ว`);

        if (navigator.vibrate) {
            try {
                navigator.vibrate(50);
            } catch (e) {
                // Vibrate not supported, ignore
            }
        }
    } catch (error) {
        console.error('deleteUnderground error:', error);
        showToast('⚠️ ไม่สามารถลบรายการได้');
    }
}

function renderUnderground() {
    try {
        const list = document.getElementById('ugList');
        const count = document.getElementById('ugCount');
        const summary = document.getElementById('ugSummary');
        const totalEl = document.getElementById('ugTotal');
        const searchBar = document.getElementById('ugSearchBar');

        // Update Dashboard
        const dashTotal = document.getElementById('ugDashTotal');
        const dashAmount = document.getElementById('ugDashAmount');

        if (!list || !count || !summary || !totalEl) {
            console.error('renderUnderground: Required elements not found');
            return;
        }

        if (undergroundData.length === 0) {
        list.innerHTML = getEnhancedEmptyState('underground');
        count.textContent = '';
        summary.classList.add('hidden');
        if (searchBar) searchBar.classList.add('hidden');

        // Update Dashboard to 0
        if (dashTotal) dashTotal.textContent = '0';
        if (dashAmount) dashAmount.textContent = '0฿';

        return;
    }

    // Show search bar if more than 3 items
    if (searchBar) {
        if (undergroundData.length > 3) {
            searchBar.classList.remove('hidden');
        } else {
            searchBar.classList.add('hidden');
        }
    }

    // Filter by type and search
    const searchInput = document.getElementById('ugSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    let filteredData = undergroundData;

    // Filter by type
    if (currentFilter !== 'all') {
        filteredData = filteredData.filter(item => item.type === currentFilter);
    }

    // Filter by search
    if (searchTerm) {
        filteredData = filteredData.filter(item =>
            item.number.includes(searchTerm) ||
            typeNames[item.type].toLowerCase().includes(searchTerm) ||
            item.price.toLowerCase().includes(searchTerm)
        );
    }

    count.textContent = `${filteredData.length}/${undergroundData.length} รายการ`;

    // Calculate total using stored amount or parse from price
    let total = 0;
    try {
        undergroundData.forEach(item => {
            if (item.amount && !isNaN(item.amount)) {
                // ใช้ amount ที่เก็บไว้ (ถูกต้องแล้ว)
                total += item.amount;
            } else {
                // Fallback for old data - parse from price string
                const prices = item.price.split(' x ');
                const firstPrice = parseInt(prices[0].trim(), 10);

                if (prices.length === 1) {
                    // มีแค่เต็งอย่างเดียว
                    if (!isNaN(firstPrice)) total += firstPrice;
                } else if (prices.length === 2) {
                    const secondPart = prices[1].trim();

                    if (secondPart === 'กลับ 3') {
                        // กลับ 3: เอาเต็งคูณ 3
                        total += firstPrice * 3;
                    } else if (secondPart === 'กลับ 6') {
                        // กลับ 6: เอาเต็งคูณ 6
                        total += firstPrice * 6;
                    } else {
                        // ตัวเลขธรรมดา: บวกกัน
                        const secondPrice = parseInt(secondPart, 10);
                        if (!isNaN(firstPrice) && !isNaN(secondPrice)) {
                            total += firstPrice + secondPrice;
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Calculate total error:', error);
        total = 0;
    }

    // Update Dashboard
    if (dashTotal) {
        const oldCount = parseInt(dashTotal.textContent, 10) || 0;
        if (oldCount !== undergroundData.length) {
            animateValue('ugDashTotal', oldCount, undergroundData.length, 500, '');
        }
    }
    if (dashAmount) {
        const oldAmount = parseInt(dashAmount.textContent.replace(/[^\d]/g, ''), 10) || 0;
        if (oldAmount !== total) {
            animateValue('ugDashAmount', oldAmount, total, 800, '฿');
        }
    }

    // Show summary
    summary.classList.remove('hidden');

    // Animate total with rolling number effect
    const oldTotal = parseInt(totalEl.dataset.value, 10) || 0;
    animateValue("ugTotal", oldTotal, total, 800, ' บาท');
    totalEl.dataset.value = total;

    if (filteredData.length === 0) {
        list.innerHTML = `
            <div class="text-center py-8 fade-in">
                <p class="text-gray-400 text-sm">ไม่พบรายการที่ค้นหา</p>
            </div>
        `;
        return;
    }

    // Determine type class (bon/lang)
    const getTypeClass = (type) => {
        if (type === '2lang' || type === 'runLang') return 'type-lang';
        return 'type-bon';
    };

    list.innerHTML = filteredData.map((item, index) => {
        const isNewest = index === filteredData.length - 1 && !searchTerm && currentFilter === 'all';
        return `
        <div class="list-item cursor-pointer ${isNewest ? 'new-entry' : 'fade-in'}" style="animation-delay: ${index * 0.03}s" onclick="editUnderground(${item.id})">
            <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-4">
                    <span class="text-3xl font-bold text-gold-700 tracking-widest">${item.number}</span>
                    <div class="text-left">
                        <span class="${getTypeClass(item.type)}">${typeNames[item.type]}</span>
                        <div class="text-sm text-gray-700 font-semibold mt-1">${item.price}</div>
                    </div>
                </div>
                <button onclick="event.stopPropagation(); deleteUnderground(${item.id})" class="delete-btn">&times;</button>
            </div>
        </div>
    `}).join('');
    } catch (error) {
        console.error('renderUnderground error:', error);
        const list = document.getElementById('ugList');
        if (list) {
            list.innerHTML = '<p class="text-red-500 text-center py-6 text-sm">⚠️ เกิดข้อผิดพลาดในการแสดงผล</p>';
        }
    }
}

// Animate number rolling effect
function animateValue(id, start, end, duration, suffix = '') {
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

function editUnderground(id) {
    try {
        const item = undergroundData.find(i => i.id === id);
        if (!item) {
            showToast('⚠️ ไม่พบรายการ');
            return;
        }

        // Set type chip
        const typeChips = document.getElementById('ugTypeChips');
        if (!typeChips) return;

        typeChips.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
        const targetChip = typeChips.querySelector(`[data-value="${item.type}"]`);
        if (targetChip) targetChip.classList.add('active');

        const typeInput = document.getElementById('ugType');
        if (typeInput) {
            typeInput.value = item.type;
            onUgTypeChange();
        }

        // Set number
        const numberInput = document.getElementById('ugNumber');
        if (numberInput) {
            numberInput.value = item.number;
            // รักษา readonly state สำหรับ iOS/Mobile
            if (isIOS() || !isDesktop()) {
                numberInput.setAttribute('readonly', 'readonly');
            }
        }

        // Parse price (e.g., "100 x 50" or "50 x กลับ 3")
        const priceParts = item.price.split(' x ');

        // ช่องเต็งเป็นตัวเลขเสมอ
        const directInput = document.getElementById('ugPriceDirect');
        if (directInput && priceParts[0]) {
            directInput.value = priceParts[0].trim();
        }

        // ถ้ามีส่วนที่สอง (โต๊ด)
        if (priceParts[1]) {
            if (!showTodPrice) toggleTodPrice();

            const todValue = priceParts[1].trim();
            const todTypeSelect = document.getElementById('ugTodType');
            const todInput = document.getElementById('ugPriceTod');

            if (!todTypeSelect || !todInput) return;

            if (todValue === 'กลับ 3') {
                todTypeSelect.value = 'ก.3';
                onTodGlabChange();
            } else if (todValue === 'กลับ 6') {
                todTypeSelect.value = 'ก.6';
                onTodGlabChange();
            } else {
                // ตัวเลขธรรมดา
                todTypeSelect.value = '';
                todInput.value = todValue;
                todInput.disabled = false;
                todInput.classList.remove('glab-locked');
            }
        }

        // Delete old entry
        undergroundData = undergroundData.filter(i => i.id !== id);
        saveData();
        renderUnderground();

        showToast('แก้ไขรายการ');
    } catch (error) {
        console.error('Edit underground error:', error);
        showToast('⚠️ ไม่สามารถแก้ไขรายการได้');
    }
}

window.editUnderground = editUnderground;

// Government
function addGovernment() {
    try {
        const type = document.getElementById('govType')?.value;
        const numberRaw = document.getElementById('govNumber')?.value.trim();
        // ลบช่องว่างออก (กรณีพิมพ์บน Desktop)
        const number = numberRaw.replace(/\s/g, '');
        const qtyInput = document.getElementById('govQty')?.value;
        const qty = parseInt(qtyInput, 10) || 1;

        if (!type) {
            showToast('กรุณาเลือกประเภทหวย');
            return;
        }

        const expectedLen = type === '6' ? 6 : (type === 'front3' || type === 'back3') ? 3 : 2;

        if (!number || number.length !== expectedLen || !/^\d+$/.test(number)) {
            showToast(`กรุณากรอกเลข ${expectedLen} หลัก`);
            return;
        }

        if (isNaN(qty) || qty <= 0) {
            showToast('จำนวนใบไม่ถูกต้อง');
            return;
        }

        governmentData.push({ id: Date.now(), type, number, qty });
        saveData();
        renderGovernment();

        const numberInput = document.getElementById('govNumber');
        if (numberInput) {
            numberInput.value = '';
            // รักษา readonly state สำหรับ iOS/Mobile
            if (isIOS() || !isDesktop()) {
                numberInput.setAttribute('readonly', 'readonly');
            } else {
                numberInput.focus();
            }
        }

        // Reset qty to 1
        const govQtyChips = document.getElementById('govQtyChips');
        if (govQtyChips) {
            govQtyChips.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
            const defaultChip = govQtyChips.querySelector('[data-value="1"]');
            if (defaultChip) defaultChip.classList.add('active');

            const qtyInputEl = document.getElementById('govQty');
            if (qtyInputEl) qtyInputEl.value = '1';
        }

        // Success feedback: Haptic
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

        // Show confetti
        showConfetti();

        showToast('✓ เพิ่มแล้ว');
    } catch (error) {
        console.error('Add government error:', error);
        showToast('⚠️ ไม่สามารถเพิ่มรายการได้');
    }
}

function deleteGovernment(id) {
    try {
        const item = governmentData.find(i => i.id === id);
        if (!item) {
            console.warn('deleteGovernment: item not found', id);
            return;
        }

        // Delete immediately
        governmentData = governmentData.filter(i => i.id !== id);
        saveData();
        renderGovernment();

        showToast(`ลบ "${item.number}" แล้ว`);

        if (navigator.vibrate) {
            try {
                navigator.vibrate(50);
            } catch (e) {
                // Vibrate not supported, ignore
            }
        }
    } catch (error) {
        console.error('deleteGovernment error:', error);
        showToast('⚠️ ไม่สามารถลบรายการได้');
    }
}

function renderGovernment() {
    try {
        const list = document.getElementById('govList');
        const count = document.getElementById('govCount');
        const searchBar = document.getElementById('govSearchBar');

        if (!list || !count) {
            console.error('renderGovernment: Required elements not found');
            return;
        }

        if (governmentData.length === 0) {
            list.innerHTML = getEnhancedEmptyState('government');
            count.textContent = '';
            if (searchBar) searchBar.classList.add('hidden');
            return;
        }

        // Show search bar if more than 3 items
        if (searchBar) {
            if (governmentData.length > 3) {
                searchBar.classList.remove('hidden');
            } else {
                searchBar.classList.add('hidden');
            }
        }

        // Filter by search
        const searchInput = document.getElementById('govSearchInput');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

        let filteredData = governmentData;
        if (searchTerm) {
            filteredData = governmentData.filter(item =>
                item.number.includes(searchTerm) ||
            typeNames[item.type].toLowerCase().includes(searchTerm)
        );
    }

    count.textContent = `${filteredData.length}/${governmentData.length} รายการ`;

    if (filteredData.length === 0) {
        list.innerHTML = `
            <div class="text-center py-8 fade-in">
                <p class="text-gray-400 text-sm">ไม่พบรายการที่ค้นหา</p>
            </div>
        `;
        return;
    }

    list.innerHTML = filteredData.map((item, index) => {
        const isNewest = index === filteredData.length - 1 && !searchTerm;
        return `
        <div class="list-item cursor-pointer ${isNewest ? 'new-entry' : 'fade-in'}" style="animation-delay: ${index * 0.03}s" onclick="editGovernment(${item.id})">
            <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-4">
                    <span class="text-3xl font-bold text-gold-700 tracking-widest">${item.number}</span>
                    <span class="text-sm text-gray-500">${typeNames[item.type]}${item.qty > 1 ? ` (${item.qty} ใบ)` : ''}</span>
                </div>
                <button onclick="event.stopPropagation(); deleteGovernment(${item.id})" class="delete-btn">&times;</button>
            </div>
        </div>
    `}).join('');
    } catch (error) {
        console.error('renderGovernment error:', error);
        const list = document.getElementById('govList');
        if (list) {
            list.innerHTML = '<p class="text-red-500 text-center py-6 text-sm">⚠️ เกิดข้อผิดพลาดในการแสดงผล</p>';
        }
    }
}

function editGovernment(id) {
    const item = governmentData.find(i => i.id === id);
    if (!item) return;

    // Set type chip
    const typeChips = document.getElementById('govTypeChips');
    typeChips.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
    typeChips.querySelector(`[data-value="${item.type}"]`)?.classList.add('active');
    document.getElementById('govType').value = item.type;
    onGovTypeChange();

    // Set number
    const numberInput = document.getElementById('govNumber');
    if (numberInput) {
        numberInput.value = item.number;
        // รักษา readonly state สำหรับ iOS/Mobile
        if (isIOS() || !isDesktop()) {
            numberInput.setAttribute('readonly', 'readonly');
        }
    }

    // Set qty chip
    const qtyChips = document.getElementById('govQtyChips');
    qtyChips.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
    qtyChips.querySelector(`[data-value="${item.qty}"]`)?.classList.add('active');
    document.getElementById('govQty').value = item.qty;

    // Delete old entry
    governmentData = governmentData.filter(i => i.id !== id);
    saveData();
    renderGovernment();

    showToast('แก้ไขรายการ');
}

window.editGovernment = editGovernment;

function renderAll() {
    renderUnderground();
    renderGovernment();
}

// ============================================
// PREVIEW MODAL
// ============================================

function openPreviewModal() {
    const data = currentTab === 'underground' ? undergroundData : governmentData;
    if (data.length === 0) {
        showToast('ไม่มีรายการ');
        return;
    }

    selectedItems = new Set(data.map(i => i.id));
    renderSelectionList();
    renderPreview();
    updateSelectedCount();

    // Hide selection panel by default
    const panel = document.getElementById('selectionPanel');
    const btn = document.getElementById('toggleSelectionBtn');
    if (panel) panel.classList.add('hidden');
    if (btn) btn.textContent = 'แก้ไข';

    document.getElementById('previewModal').classList.remove('hidden');
}

function closePreviewModal() {
    document.getElementById('previewModal').classList.add('hidden');
}

function selectAll() {
    const data = currentTab === 'underground' ? undergroundData : governmentData;
    selectedItems = new Set(data.map(i => i.id));
    renderSelectionList();
    renderPreview();
    updateSelectedCount();
}

function selectNone() {
    selectedItems.clear();
    renderSelectionList();
    renderPreview();
    updateSelectedCount();
}

function toggleItem(id) {
    if (selectedItems.has(id)) {
        selectedItems.delete(id);
    } else {
        selectedItems.add(id);
    }
    renderSelectionList();
    renderPreview();
    updateSelectedCount();
}

function renderSelectionList() {
    const data = currentTab === 'underground' ? undergroundData : governmentData;
    const container = document.getElementById('selectionList');

    // Group by type
    const grouped = {};
    data.forEach(item => {
        if (!grouped[item.type]) grouped[item.type] = [];
        grouped[item.type].push(item);
    });

    let html = '';

    Object.keys(grouped).forEach(type => {
        const typeName = typeNames[type] || type;
        html += `<div class="w-full mb-2">
            <div class="text-xs text-gray-500 font-medium mb-1">${typeName}</div>
            <div class="flex flex-wrap gap-1.5">`;

        grouped[type].forEach(item => {
            const isSelected = selectedItems.has(item.id);
            const label = currentTab === 'underground'
                ? `${item.number}`
                : `${item.number}${item.qty > 1 ? ' x' + item.qty : ''}`;

            html += `
                <button onclick="toggleItem(${item.id})" 
                    class="chip ${isSelected ? 'chip-selected' : 'chip-unselected'}">
                    ${label}
                </button>
            `;
        });

        html += `</div></div>`;
    });

    container.innerHTML = html;
}

function renderPreview() {
    const data = currentTab === 'underground' ? undergroundData : governmentData;
    const selected = data.filter(i => selectedItems.has(i.id));
    const container = document.getElementById('previewContent');

    if (selected.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-8">เลือกรายการที่ต้องการ</p>';
        return;
    }

    if (currentTab === 'underground') {
        renderUndergroundPreview(selected, container);
    } else {
        renderGovernmentPreview(selected, container);
    }
}

function renderUndergroundPreview(data, container) {
    const groups = {
        '3bon': data.filter(i => i.type === '3bon'),
        '2bon': data.filter(i => i.type === '2bon'),
        '2lang': data.filter(i => i.type === '2lang'),
        'runBon': data.filter(i => i.type === 'runBon'),
        'runLang': data.filter(i => i.type === 'runLang')
    };

    // นับจำนวนประเภทที่มีข้อมูล
    const sections = [
        { key: '3bon', title: '3 ตัวบน' },
        { key: '2bon', title: '2 ตัวบน' },
        { key: '2lang', title: '2 ตัวล่าง' },
        { key: 'runBon', title: 'วิ่งบน' },
        { key: 'runLang', title: 'วิ่งล่าง' }
    ];

    const activeSections = sections.filter(sec => groups[sec.key].length > 0);
    const numColumns = Math.min(activeSections.length, 3);

    // สร้างคอลัมน์ตามจำนวนที่ต้องการ
    const columns = Array.from({ length: numColumns }, () => []);
    let currentCol = 0;

    activeSections.forEach(sec => {
        columns[currentCol].push({ type: 'header', title: sec.title });
        groups[sec.key].forEach(i => {
            columns[currentCol].push({ type: 'item', data: i });
        });
        currentCol = (currentCol + 1) % numColumns;
    });

    // กำหนด grid template ตามจำนวนคอลัมน์
    const gridTemplate = numColumns === 1 ? '1fr' : numColumns === 2 ? 'repeat(2,1fr)' : 'repeat(3,1fr)';
    const justifyContent = numColumns === 1 ? 'center' : 'space-between';

    let html = `<div style="display:grid;grid-template-columns:${gridTemplate};gap:20px;padding:0 16px;justify-content:${justifyContent};">`;

    columns.forEach((column, colIndex) => {
        const showBorder = colIndex < columns.length - 1;
        html += `<div style="border-right:${showBorder ? '1px solid #E8DFD0' : 'none'};padding-right:${showBorder ? '16px' : '0'};min-width:${numColumns === 1 ? '300px' : 'auto'};">`;

        column.forEach(item => {
            if (item.type === 'header') {
                html += `<div style="text-align:center;padding:6px 0;border-bottom:1px solid #D4C4A8;margin:12px 0 8px 0;">
                    <span style="color:#6B5A45;font-weight:600;font-size:13px;letter-spacing:0.03em;">${item.title}</span>
                </div>`;
            } else {
                const i = item.data;
                // ป้องกันการขึ้นบรรทัดใหม่ด้วย white-space:nowrap
                html += `<div style="padding:4px 0;font-size:13px;color:#5C5C52;text-align:center;white-space:nowrap;">
                    <b style="color:#6B5A45;font-size:14px;">${i.number}</b> = ${i.price}
                </div>`;
            }
        });

        html += '</div>';
    });

    html += '</div>';

    container.innerHTML = html;
}

function renderGovernmentPreview(data, container) {
    const groups = {
        '6': data.filter(i => i.type === '6'),
        'front3': data.filter(i => i.type === 'front3'),
        'back3': data.filter(i => i.type === 'back3'),
        'back2': data.filter(i => i.type === 'back2')
    };

    const sections = [
        { key: '6', title: '6 ตัวตรง' },
        { key: 'front3', title: 'เลขหน้า 3 ตัว' },
        { key: 'back3', title: 'เลขท้าย 3 ตัว' },
        { key: 'back2', title: 'เลขท้าย 2 ตัว' }
    ];

    const activeSections = sections.filter(sec => groups[sec.key].length > 0);
    const numColumns = Math.min(activeSections.length, 3);

    // สร้างคอลัมน์ตามจำนวนที่ต้องการ
    const columns = Array.from({ length: numColumns }, () => []);
    let currentCol = 0;

    activeSections.forEach(sec => {
        columns[currentCol].push({ type: 'header', title: sec.title });
        groups[sec.key].forEach(i => {
            columns[currentCol].push({ type: 'item', data: i });
        });
        currentCol = (currentCol + 1) % numColumns;
    });

    // กำหนด grid template ตามจำนวนคอลัมน์
    const gridTemplate = numColumns === 1 ? '1fr' : numColumns === 2 ? 'repeat(2,1fr)' : 'repeat(3,1fr)';
    const justifyContent = numColumns === 1 ? 'center' : 'space-between';

    let html = `<div style="display:grid;grid-template-columns:${gridTemplate};gap:20px;padding:0 16px;justify-content:${justifyContent};">`;

    columns.forEach((column, colIndex) => {
        const showBorder = colIndex < columns.length - 1;
        html += `<div style="border-right:${showBorder ? '1px solid #E8DFD0' : 'none'};padding-right:${showBorder ? '16px' : '0'};min-width:${numColumns === 1 ? '300px' : 'auto'};">`;

        column.forEach(item => {
            if (item.type === 'header') {
                html += `<div style="text-align:center;padding:6px 0;border-bottom:1px solid #D4C4A8;margin:12px 0 8px 0;">
                    <span style="color:#6B5A45;font-weight:600;font-size:13px;letter-spacing:0.03em;">${item.title}</span>
                </div>`;
            } else {
                const i = item.data;
                html += `<div style="padding:4px 0;font-size:13px;color:#5C5C52;text-align:center;">
                    <b style="color:#6B5A45;font-size:14px;">${i.number}</b>${i.qty > 1 ? ` (${i.qty} ใบ)` : ''}
                </div>`;
            }
        });

        html += '</div>';
    });

    html += '</div>';

    container.innerHTML = html;
}

// Save image
async function saveImage() {
    if (selectedItems.size === 0) {
        showToast('กรุณาเลือกรายการ');
        return;
    }

    const preview = document.getElementById('a4Preview');
    const saveBtn = document.querySelector('[onclick="handleCopyOrSave()"]');
    const originalText = saveBtn?.querySelector('span')?.textContent;

    // Show loading
    if (saveBtn) {
        saveBtn.disabled = true;
        const span = saveBtn.querySelector('span');
        if (span) span.textContent = 'กำลังสร้าง...';
    }

    try {
        // Lazy load html2canvas if not already loaded
        if (typeof html2canvas === 'undefined') {
            const span = saveBtn?.querySelector('span');
            if (span) span.textContent = 'กำลังโหลด...';

            const loaded = await ensureHtml2Canvas();
            if (!loaded) {
                throw new Error('html2canvas library not loaded');
            }
        }

        // Small delay for UI update
        await new Promise(r => setTimeout(r, 100));

        // iOS specific: ใช้ options ที่เหมาะสมกับ iOS Safari
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        const canvas = await html2canvas(preview, {
            backgroundColor: '#ffffff',
            scale: isIOS ? 1.5 : 2, // ลด scale บน iOS เพื่อลด memory usage
            useCORS: true,
            allowTaint: false, // เปลี่ยนเป็น false เพื่อความปลอดภัย
            logging: false,
            removeContainer: true,
            imageTimeout: 15000,
            // iOS: ปิด features ที่อาจทำให้เกิดปัญหา
            foreignObjectRendering: false,
            // แก้ปัญหา background image และ patterns
            onclone: (clonedDoc) => {
                try {
                    // ลบ background patterns ที่ซับซ้อนออกจาก cloned document
                    const body = clonedDoc.body;
                    if (body) {
                        body.style.backgroundImage = 'none';
                        body.style.backgroundColor = '#FDFBF7';
                    }
                    
                    // ลบ animations และ transitions ที่อาจทำให้เกิดปัญหา
                    const allElements = clonedDoc.querySelectorAll('*');
                    allElements.forEach(el => {
                        if (el.style) {
                            el.style.animation = 'none';
                            el.style.transition = 'none';
                            el.style.transform = 'none';
                        }
                    });
                    
                    // แก้ไข preview element
                    const clonedPreview = clonedDoc.getElementById('a4Preview');
                    if (clonedPreview) {
                        clonedPreview.style.transform = 'none';
                        clonedPreview.style.boxShadow = 'none';
                    }
                } catch (e) {
                    console.warn('onclone error:', e);
                }
            }
        });

        if (!canvas || canvas.width === 0 || canvas.height === 0) {
            throw new Error('Canvas creation failed - invalid dimensions');
        }

        const dataUrl = canvas.toDataURL('image/png', 0.95); // เพิ่ม quality parameter
        const fileName = `JodHuay_${currentTab === 'underground' ? 'ใต้ดิน' : 'รัฐบาล'}.png`;

        // iOS: พยายามใช้ Web Share API ก่อน
        if (isIOS) {
            try {
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], fileName, { type: 'image/png' });

                // ลองใช้ Share API
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'JodHuay - จดหวย'
                    });
                    showToast('✓ บันทึกแล้ว');
                    closePreviewModal();
                    return;
                }
            } catch (e) {
                // ถ้า Share ไม่ได้ ให้ลองดาวน์โหลดแทน
                if (e.name !== 'AbortError') {
                    console.log('Share failed, trying download:', e);
                }
            }

            // ถ้า Share ไม่ได้ ให้เปิดรูปในแท็บใหม่แทน (iOS Safari)
            const newWindow = window.open();
            if (newWindow) {
                newWindow.document.write(`
                    <html>
                    <head>
                        <title>JodHuay - บันทึกรูป</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { margin: 0; padding: 20px; background: #f5f5f5; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                            img { max-width: 100%; height: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px; background: white; }
                            .info { margin: 20px 0; color: #666; font-size: 14px; }
                            .btn { display: inline-block; margin: 10px; padding: 12px 24px; background: #DAA520; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
                        </style>
                    </head>
                    <body>
                        <h2>🎉 สร้างรูปสำเร็จ!</h2>
                        <p class="info">กดค้างที่รูป แล้วเลือก "บันทึกรูปภาพ"</p>
                        <img src="${dataUrl}" alt="JodHuay">
                        <br>
                        <a href="#" onclick="window.close()" class="btn">ปิดหน้าต่าง</a>
                    </body>
                    </html>
                `);
                showToast('✓ เปิดรูปในแท็บใหม่แล้ว');
            } else {
                showToast('⚠️ กรุณาอนุญาตให้เปิดหน้าต่างใหม่');
            }
            closePreviewModal();
            return;
        }

        // Desktop/Android: Download โดยตรง
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clear selected items after save
        selectedItems.clear();

        showToast('✓ บันทึกแล้ว');
        closePreviewModal();

    } catch (e) {
        console.error('Save image error:', e);
        let errorMsg = '⚠️ เกิดข้อผิดพลาด';
        let showFallback = false;

        if (e.message && e.message.includes('html2canvas')) {
            errorMsg = '⚠️ ไม่สามารถโหลดไลบรารีได้';
            showFallback = true;
        } else if (e.message && e.message.includes('Canvas')) {
            errorMsg = '⚠️ ไม่สามารถสร้างรูปภาพได้';
            showFallback = true;
        } else if (e.name === 'SecurityError') {
            errorMsg = '⚠️ ไม่สามารถเข้าถึงรูปภาพได้';
            showFallback = true;
        } else if (e.name === 'DOMException') {
            errorMsg = '⚠️ รูปภาพมีขนาดใหญ่เกินไป ลองลดจำนวนรายการ';
            showFallback = true;
        }

        showToast(errorMsg);
        
        // แสดง fallback UI สำหรับ iOS
        if (showFallback && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
            setTimeout(() => showScreenshotFallback(), 500);
        }
    } finally {
        // Reset button
        if (saveBtn) {
            saveBtn.disabled = false;
            const span = saveBtn.querySelector('span');
            if (span && originalText) span.textContent = originalText;
        }
    }
}

// Clear data
function clearData() {
    const data = currentTab === 'underground' ? undergroundData : governmentData;
    if (!data.length) {
        showToast('ไม่มีรายการ');
        return;
    }

    // Show confirm modal
    openConfirmModal();
}

function openConfirmModal() {
    const modal = document.getElementById('confirmModal');
    const content = document.getElementById('confirmModalContent');

    if (modal && content) {
        modal.classList.remove('hidden');
        // Trigger animation
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
    }
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    const content = document.getElementById('confirmModalContent');

    if (modal && content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');

        setTimeout(() => {
            modal.classList.add('hidden');
        }, 200);
    }
}

function confirmClearData() {
    if (currentTab === 'underground') undergroundData = [];
    else governmentData = [];

    saveData();
    renderAll();
    closeConfirmModal();

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    showToast('ล้างข้อมูลแล้ว');
}

window.clearData = clearData;
window.openConfirmModal = openConfirmModal;
window.closeConfirmModal = closeConfirmModal;
window.confirmClearData = confirmClearData;

// ============================================
// DATA EXPORT / IMPORT (สำหรับกู้คืนข้อมูล)
// ============================================

// Export ข้อมูลเป็น JSON
function exportData() {
    try {
        const exportData = {
            version: DATA_VERSION,
            timestamp: Date.now(),
            date: new Date().toISOString(),
            underground: undergroundData,
            government: governmentData
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `JodHuay_Backup_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast('✓ Export สำเร็จ');
    } catch (error) {
        console.error('Export error:', error);
        showToast('⚠️ ไม่สามารถ Export ได้');
    }
}

// Import ข้อมูลจาก JSON
function importData(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const importData = JSON.parse(e.target.result);

            // ตรวจสอบโครงสร้างข้อมูล
            if (!importData.underground || !importData.government) {
                throw new Error('Invalid data structure');
            }

            // Validate และแก้ไขข้อมูล
            const undergroundValid = validateAndFixData(importData.underground, 'underground');
            const governmentValid = validateAndFixData(importData.government, 'government');

            // ถามยืนยันก่อน import
            if (confirm(`พบข้อมูล:\n- หวยใต้ดิน: ${undergroundValid.length} รายการ\n- หวยรัฐบาล: ${governmentValid.length} รายการ\n\nต้องการ Import หรือไม่? (ข้อมูลเดิมจะถูกแทนที่)`)) {
                // สำรองข้อมูลเก่าก่อน
                backupCorruptedData();

                // Import ข้อมูลใหม่
                undergroundData = undergroundValid;
                governmentData = governmentValid;

                saveData();
                renderAll();

                showToast('✓ Import สำเร็จ');
            }
        } catch (error) {
            console.error('Import error:', error);
            showToast('⚠️ ไฟล์ไม่ถูกต้อง');
        }
    };

    reader.onerror = function () {
        showToast('⚠️ ไม่สามารถอ่านไฟล์ได้');
    };

    reader.readAsText(file);
}

// เปิด file picker สำหรับ import
function openImportDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function (e) {
        const file = e.target.files[0];
        if (file) importData(file);
    };
    input.click();
}

window.exportData = exportData;
window.openImportDialog = openImportDialog;

// ============================================
// DEBUG TOOLS (สำหรับแก้ปัญหา)
// ============================================

// แสดงข้อมูล debug ใน console
function debugInfo() {
    console.log('=== JodHuay Debug Info ===');
    console.log('Data Version:', localStorage.getItem(getVersionKey()) || 'Not set');
    console.log('Underground Data:', undergroundData);
    console.log('Government Data:', governmentData);
    console.log('LocalStorage Keys:', Object.keys(localStorage).filter(k => k.startsWith('lottery_')));
    console.log('Storage Used:', JSON.stringify(localStorage).length, 'bytes');
    console.log('========================');
}

// ซ่อมแซมข้อมูลทั้งหมด
function repairAllData() {
    try {
        console.log('Starting data repair...');

        // โหลดข้อมูลใหม่
        loadData();

        // Validate และแก้ไข
        undergroundData = validateAndFixData(undergroundData, 'underground');
        governmentData = validateAndFixData(governmentData, 'government');

        // บันทึกกลับ
        saveData();

        // Render ใหม่
        renderAll();

        console.log('Data repair completed');
        showToast('✓ ซ่อมแซมข้อมูลเสร็จสิ้น');
    } catch (error) {
        console.error('Repair error:', error);
        showToast('⚠️ ไม่สามารถซ่อมแซมได้');
    }
}

// รีเซ็ตข้อมูลทั้งหมด (รวม version)
function resetAllData() {
    if (confirm('⚠️ คำเตือน!\n\nจะลบข้อมูลทั้งหมด รวมถึง backup\nต้องการดำเนินการต่อหรือไม่?')) {
        try {
            // ลบข้อมูลทั้งหมด
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('lottery_')) {
                    localStorage.removeItem(key);
                }
            });

            // รีเซ็ตตัวแปร
            undergroundData = [];
            governmentData = [];

            // Render ใหม่
            renderAll();

            console.log('All data reset');
            showToast('✓ รีเซ็ตข้อมูลทั้งหมดแล้ว');

            // Reload หน้าเว็บ
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            console.error('Reset error:', error);
            showToast('⚠️ ไม่สามารถรีเซ็ตได้');
        }
    }
}

// เปิดใช้งาน debug mode
window.JodHuayDebug = {
    info: debugInfo,
    repair: repairAllData,
    reset: resetAllData,
    export: exportData,
    import: openImportDialog,
    version: DATA_VERSION
};

console.log('💡 Debug Tools: พิมพ์ JodHuayDebug ใน console เพื่อดูคำสั่ง');

// Copy all to clipboard
function copyAllToClipboard() {
    const data = currentTab === 'underground' ? undergroundData : governmentData;

    if (data.length === 0) {
        showToast('ไม่มีรายการ');
        return;
    }

    let text = `📝 รายการหวย${currentTab === 'underground' ? 'ใต้ดิน' : 'รัฐบาล'}\n`;
    text += `${'─'.repeat(30)}\n\n`;

    if (currentTab === 'underground') {
        data.forEach((item, index) => {
            text += `${index + 1}. ${item.number} - ${typeNames[item.type]}\n`;
            text += `   ราคา: ${item.price}\n\n`;
        });

        // Calculate total
        let total = 0;
        data.forEach(item => {
            if (item.amount) total += item.amount;
        });
        text += `${'─'.repeat(30)}\n`;
        text += `ยอดรวม: ${total.toLocaleString()} บาท`;
    } else {
        data.forEach((item, index) => {
            text += `${index + 1}. ${item.number} - ${typeNames[item.type]}`;
            if (item.qty > 1) text += ` (${item.qty} ใบ)`;
            text += '\n';
        });
    }

    navigator.clipboard.writeText(text).then(() => {
        showToast('✓ คัดลอกแล้ว');
        if (navigator.vibrate) navigator.vibrate(50);
    }).catch(() => {
        showToast('ไม่สามารถคัดลอกได้');
    });
}

// Share list
async function shareList() {
    const data = currentTab === 'underground' ? undergroundData : governmentData;

    if (data.length === 0) {
        showToast('ไม่มีรายการ');
        return;
    }

    let text = `📝 รายการหวย${currentTab === 'underground' ? 'ใต้ดิน' : 'รัฐบาล'}\n\n`;

    if (currentTab === 'underground') {
        data.forEach((item, index) => {
            text += `${index + 1}. ${item.number} - ${typeNames[item.type]} (${item.price})\n`;
        });
    } else {
        data.forEach((item, index) => {
            text += `${index + 1}. ${item.number} - ${typeNames[item.type]}`;
            if (item.qty > 1) text += ` (${item.qty} ใบ)`;
            text += '\n';
        });
    }

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'รายการหวย - JodHuay',
                text: text
            });
            showToast('✓ แชร์แล้ว');
        } catch (err) {
            if (err.name !== 'AbortError') {
                copyAllToClipboard();
            }
        }
    } else {
        copyAllToClipboard();
    }
}

// Filter state
let currentFilter = 'all';

// Filter underground by type
function filterByType(type) {
    currentFilter = type;

    // Update active chip
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
        if (chip.dataset.filter === type) {
            chip.classList.add('active');
        }
    });

    renderUnderground();

    if (navigator.vibrate) navigator.vibrate(30);
}

// Filter underground by search
function filterUnderground() {
    renderUnderground();
}

// Filter government by search
function filterGovernment() {
    renderGovernment();
}

window.copyAllToClipboard = copyAllToClipboard;
window.shareList = shareList;
window.filterByType = filterByType;
window.filterUnderground = filterUnderground;
window.filterGovernment = filterGovernment;

// ============================================
// SHARE AS TEXT (from Modal)
// ============================================

async function shareAsText() {
    const data = currentTab === 'underground' ? undergroundData : governmentData;
    const selected = data.filter(i => selectedItems.has(i.id));

    if (selected.length === 0) {
        showToast('กรุณาเลือกรายการ');
        return;
    }

    let text = `📝 รายการหวย${currentTab === 'underground' ? 'ใต้ดิน' : 'รัฐบาล'}\n\n`;

    if (currentTab === 'underground') {
        selected.forEach((item, index) => {
            text += `${index + 1}. ${item.number} - ${typeNames[item.type]} (${item.price})\n`;
        });
    } else {
        selected.forEach((item, index) => {
            text += `${index + 1}. ${item.number} - ${typeNames[item.type]}`;
            if (item.qty > 1) text += ` (${item.qty} ใบ)`;
            text += '\n';
        });
    }

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'รายการหวย - JodHuay',
                text: text
            });
            showToast('✓ แชร์แล้ว');
        } catch (err) {
            if (err.name !== 'AbortError') {
                // Fallback to copy
                navigator.clipboard.writeText(text).then(() => {
                    showToast('คัดลอกแล้ว (ไม่สามารถแชร์ได้)');
                });
            }
        }
    } else {
        // Fallback to copy
        navigator.clipboard.writeText(text).then(() => {
            showToast('คัดลอกแล้ว (ไม่รองรับการแชร์)');
        }).catch(() => {
            showToast('ไม่สามารถคัดลอกได้');
        });
    }
}

// ============================================
// SHARE AS IMAGE (from Modal)
// ============================================

async function shareAsImage() {
    if (selectedItems.size === 0) {
        showToast('กรุณาเลือกรายการ');
        return;
    }

    const preview = document.getElementById('a4Preview');
    const shareBtn = document.querySelector('[onclick="handleShare()"]');
    const originalHTML = shareBtn?.innerHTML;

    // Show loading
    if (shareBtn) {
        shareBtn.disabled = true;
        shareBtn.innerHTML = '<span class="animate-pulse text-xs">กำลังสร้างรูป...</span>';
    }

    try {
        // Lazy load html2canvas if not already loaded
        if (typeof html2canvas === 'undefined') {
            if (shareBtn) {
                shareBtn.innerHTML = '<span class="animate-pulse text-xs">กำลังโหลด...</span>';
            }

            const loaded = await ensureHtml2Canvas();
            if (!loaded) {
                throw new Error('html2canvas library not loaded');
            }

            if (shareBtn) {
                shareBtn.innerHTML = '<span class="animate-pulse text-xs">กำลังสร้างรูป...</span>';
            }
        }

        await new Promise(r => setTimeout(r, 100));

        // iOS specific: ใช้ options ที่เหมาะสมกับ iOS Safari
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        const canvas = await html2canvas(preview, {
            backgroundColor: '#ffffff',
            scale: isIOS ? 1.5 : 2, // ลด scale บน iOS
            useCORS: true,
            allowTaint: false,
            logging: false,
            removeContainer: true,
            imageTimeout: 15000,
            foreignObjectRendering: false,
            // แก้ปัญหา background image และ patterns
            onclone: (clonedDoc) => {
                try {
                    // ลบ background patterns ที่ซับซ้อนออกจาก cloned document
                    const body = clonedDoc.body;
                    if (body) {
                        body.style.backgroundImage = 'none';
                        body.style.backgroundColor = '#FDFBF7';
                    }
                    
                    // ลบ animations และ transitions
                    const allElements = clonedDoc.querySelectorAll('*');
                    allElements.forEach(el => {
                        if (el.style) {
                            el.style.animation = 'none';
                            el.style.transition = 'none';
                            el.style.transform = 'none';
                        }
                    });
                    
                    // แก้ไข preview element
                    const clonedPreview = clonedDoc.getElementById('a4Preview');
                    if (clonedPreview) {
                        clonedPreview.style.transform = 'none';
                        clonedPreview.style.boxShadow = 'none';
                    }
                } catch (e) {
                    console.warn('onclone error:', e);
                }
            }
        });

        if (!canvas || canvas.width === 0 || canvas.height === 0) {
            throw new Error('Canvas creation failed - invalid dimensions');
        }

        const blob = await (await fetch(canvas.toDataURL('image/png', 0.95))).blob();
        const fileName = `JodHuay_${currentTab === 'underground' ? 'ใต้ดิน' : 'รัฐบาล'}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'JodHuay - จดหวย'
            });
            showToast('✓ แชร์แล้ว');
        } else {
            showToast('เบราว์เซอร์ไม่รองรับการแชร์รูป');
        }

    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error('Share image error:', e);
            let errorMsg = 'ไม่สามารถแชร์ได้';
            let showFallback = false;

            if (e.message && e.message.includes('html2canvas')) {
                errorMsg = 'ไม่สามารถโหลดไลบรารีได้';
                showFallback = true;
            } else if (e.message && e.message.includes('Canvas')) {
                errorMsg = 'ไม่สามารถสร้างรูปภาพได้';
                showFallback = true;
            } else if (e.name === 'SecurityError') {
                errorMsg = 'ไม่สามารถเข้าถึงรูปภาพได้';
                showFallback = true;
            } else if (e.name === 'DOMException') {
                errorMsg = 'รูปภาพมีขนาดใหญ่เกินไป ลองลดจำนวนรายการ';
                showFallback = true;
            }

            showToast(errorMsg);
            
            // แสดง fallback UI สำหรับ iOS
            if (showFallback && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
                setTimeout(() => showScreenshotFallback(), 500);
            }
        }
    } finally {
        if (shareBtn && originalHTML) {
            shareBtn.disabled = false;
            shareBtn.innerHTML = originalHTML;
        }
    }
}

window.shareAsText = shareAsText;
window.shareAsImage = shareAsImage;
window.showScreenshotFallback = showScreenshotFallback;

// ============================================
// MODAL MODE SWITCHING
// ============================================

let currentModalMode = 'text'; // 'text' or 'image'

function switchModalMode(mode) {
    currentModalMode = mode;

    // Update toggle buttons
    document.getElementById('modeText').classList.toggle('active', mode === 'text');
    document.getElementById('modeImage').classList.toggle('active', mode === 'image');

    // Update action button text and icons
    const btnCopyOrSaveText = document.getElementById('btnCopyOrSaveText');
    const btnShareText = document.getElementById('btnShareText');

    if (mode === 'text') {
        btnCopyOrSaveText.textContent = 'คัดลอก';
        btnShareText.textContent = 'แชร์';
    } else {
        btnCopyOrSaveText.textContent = 'บันทึกรูป';
        btnShareText.textContent = 'แชร์รูป';
    }

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);
}

function handleCopyOrSave() {
    if (currentModalMode === 'text') {
        copyAsText();
    } else {
        saveImage();
    }
}

function handleShare() {
    if (currentModalMode === 'text') {
        shareAsText();
    } else {
        shareAsImage();
    }
}

window.switchModalMode = switchModalMode;
window.handleCopyOrSave = handleCopyOrSave;
window.handleShare = handleShare;

// ============================================
// SELECTION PANEL TOGGLE
// ============================================

function toggleSelectionPanel() {
    const panel = document.getElementById('selectionPanel');
    const btn = document.getElementById('toggleSelectionBtn');

    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        btn.textContent = 'ซ่อน';
    } else {
        panel.classList.add('hidden');
        btn.textContent = 'แก้ไข';
    }
}

function updateSelectedCount() {
    const countEl = document.getElementById('selectedCount');
    if (countEl) {
        countEl.textContent = selectedItems.size;
    }
}

window.toggleSelectionPanel = toggleSelectionPanel;

function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = msg;
    toast.classList.add('toast-show');
    setTimeout(() => toast.classList.remove('toast-show'), 2000);
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
}

// Global
window.switchTab = switchTab;
window.addUnderground = addUnderground;
window.deleteUnderground = deleteUnderground;
window.addGovernment = addGovernment;
window.deleteGovernment = deleteGovernment;
window.clearData = clearData;
window.onUgTypeChange = onUgTypeChange;
window.onGovTypeChange = onGovTypeChange;
window.toggleTodPrice = toggleTodPrice;
window.openPreviewModal = openPreviewModal;
window.closePreviewModal = closePreviewModal;
window.selectAll = selectAll;
window.selectNone = selectNone;
window.toggleItem = toggleItem;
window.saveImage = saveImage;

// ============================================
// COPY AS TEXT
// ============================================

function copyAsText() {
    try {
        const data = currentTab === 'underground' ? undergroundData : governmentData;
        const selected = data.filter(i => selectedItems.has(i.id));

        if (selected.length === 0) {
            showToast('กรุณาเลือกรายการ');
            return;
        }

        let text = `JODHUAY - จดหวย\n`;
        text += `─────────────\n`;

        let totalAmount = 0;

        if (currentTab === 'underground') {
            // Group by type
            const groups = {
                '3bon': selected.filter(i => i.type === '3bon'),
                '2bon': selected.filter(i => i.type === '2bon'),
                '2lang': selected.filter(i => i.type === '2lang'),
                'runBon': selected.filter(i => i.type === 'runBon'),
                'runLang': selected.filter(i => i.type === 'runLang')
            };

            Object.keys(groups).forEach(type => {
                if (groups[type].length) {
                    text += `\n[ ${typeNames[type]} ]\n`;
                    groups[type].forEach(item => {
                        text += `${item.number} = ${item.price}\n`;
                        // Calculate total safely
                        if (item.amount && !isNaN(item.amount)) {
                            totalAmount += item.amount;
                        } else {
                            // Fallback: parse from price string
                            const prices = item.price.split(' x ');
                            prices.forEach(p => {
                                if (p.includes('กลับ')) return;
                                const num = parseInt(p.trim(), 10);
                                if (!isNaN(num) && num > 0) totalAmount += num;
                            });
                        }
                    });
                }
            });

            text += `\n─────────────\n`;
            text += `รวม ${selected.length} รายการ\n`;
            text += `ยอดรวม: ${totalAmount.toLocaleString()} บาท\n`;
        } else {
            // Government
            const groups = {
                '6': selected.filter(i => i.type === '6'),
                'front3': selected.filter(i => i.type === 'front3'),
                'back3': selected.filter(i => i.type === 'back3'),
                'back2': selected.filter(i => i.type === 'back2')
            };

            Object.keys(groups).forEach(type => {
                if (groups[type].length) {
                    text += `\n[ ${typeNames[type]} ]\n`;
                    groups[type].forEach(item => {
                        text += `${item.number}${item.qty > 1 ? ` (${item.qty} ใบ)` : ''}\n`;
                    });
                }
            });

            text += `\n─────────────\n`;
            text += `รวม ${selected.length} รายการ\n`;
        }

        text += `ขอให้โชคดี!`;

        // Copy to clipboard
        navigator.clipboard.writeText(text).then(() => {
            showToast('คัดลอกแล้ว');
        }).catch(() => {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast('คัดลอกแล้ว');
            } catch (err) {
                console.error('Copy failed:', err);
                showToast('⚠️ ไม่สามารถคัดลอกได้');
            }
            document.body.removeChild(textarea);
        });
    } catch (error) {
        console.error('Copy as text error:', error);
        showToast('⚠️ เกิดข้อผิดพลาด');
    }
}

window.copyAsText = copyAsText;


// ============================================
// CUSTOM NUMPAD
// ============================================

let numpadTarget = null;
let numpadValue = '';
let numpadMaxLength = 6;
let numpadCallback = null;
let numpadIsPrice = false;

function openNumpad(targetId, label, maxLen, callback) {
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

        // แสดง/ซ่อนปุ่มราคาด่วน
        const quickBtns = document.getElementById('quickPriceButtons');
        if (quickBtns) {
            quickBtns.classList.toggle('hidden', !numpadIsPrice);
        }

        const overlay = document.getElementById('numpadOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.classList.add('active');
        }
    } catch (error) {
        console.error('Open numpad error:', error);
        showToast('⚠️ ไม่สามารถเปิดแป้นตัวเลขได้');
    }
}

function closeNumpad() {
    try {
        const overlay = document.getElementById('numpadOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        numpadTarget = null;
        numpadValue = '';
        numpadCallback = null;
        numpadIsPrice = false;
    } catch (error) {
        console.error('Close numpad error:', error);
    }
}

function numpadPress(num) {
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

        // Haptic feedback - สั่นเบาๆ
        if (navigator.vibrate) navigator.vibrate(10);

        // Auto confirm เมื่อกรอกครบ (เฉพาะเลขหวย ไม่ใช่ราคา)
        if (!numpadIsPrice && numpadValue.length >= numpadMaxLength) {
            setTimeout(() => confirmNumpad(), 150);
        }
    } catch (error) {
        console.error('Numpad press error:', error);
    }
}

function numpadClear() {
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
        if (navigator.vibrate) navigator.vibrate(20);
    } catch (error) {
        console.error('Numpad clear error:', error);
    }
}

function numpadBackspace() {
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
        if (navigator.vibrate) navigator.vibrate(10);
    } catch (error) {
        console.error('Numpad backspace error:', error);
    }
}

function confirmNumpad() {
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
function quickPrice(amount) {
    try {
        numpadValue = String(amount);
        const valueDisplay = document.getElementById('numpadValue');
        if (valueDisplay) valueDisplay.textContent = numpadValue;
        if (navigator.vibrate) navigator.vibrate(10);
        setTimeout(() => confirmNumpad(), 100);
    } catch (error) {
        console.error('Quick price error:', error);
    }
}

// Make numpad functions global
window.openNumpad = openNumpad;
window.closeNumpad = closeNumpad;
window.numpadPress = numpadPress;
window.numpadClear = numpadClear;
window.numpadBackspace = numpadBackspace;
window.confirmNumpad = confirmNumpad;
window.quickPrice = quickPrice;

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

function showConfetti() {
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

// ============================================
// OFFLINE DETECTION
// ============================================

function setupOfflineDetection() {
    const indicator = document.getElementById('offlineIndicator');

    function updateOnlineStatus() {
        isOnline = navigator.onLine;

        if (indicator) {
            if (isOnline) {
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
        showToast('⚠ ออฟไลน์ - ข้อมูลจะถูกบันทึกเมื่อกลับมาออนไลน์');
    });

    // Initial check
    updateOnlineStatus();
}

// ============================================
// SWIPE TO DELETE
// ============================================

function setupSwipeToDelete() {
    let touchStartX = 0;
    let touchEndX = 0;
    let currentElement = null;

    document.addEventListener('touchstart', (e) => {
        const listItem = e.target.closest('.list-item');
        if (listItem) {
            currentElement = listItem;
            touchStartX = e.changedTouches[0].screenX;
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (currentElement) {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchEndX - touchStartX;

            // Only allow left swipe
            if (diff < 0) {
                currentElement.style.transform = `translateX(${diff}px)`;
                currentElement.style.opacity = 1 + (diff / 200);
            }
        }
    }, { passive: true });

    document.addEventListener('touchend', () => {
        if (currentElement) {
            const diff = touchEndX - touchStartX;

            // If swiped more than 100px, delete
            if (diff < -100) {
                currentElement.style.transform = 'translateX(-100%)';
                currentElement.style.opacity = '0';

                setTimeout(() => {
                    // Extract ID and delete
                    if (currentElement) {
                        const deleteBtn = currentElement.querySelector('.delete-btn');
                        if (deleteBtn) {
                            deleteBtn.click();
                        }
                    }
                }, 300);
            } else {
                // Reset position
                currentElement.style.transform = 'translateX(0)';
                currentElement.style.opacity = '1';
            }

            currentElement = null;
            touchStartX = 0;
            touchEndX = 0;
        }
    });
}

// ============================================
// QUICK ACTIONS (Long Press)
// ============================================

let longPressTimer = null;
let longPressElement = null;

function setupQuickActions() {
    document.addEventListener('touchstart', (e) => {
        const listItem = e.target.closest('.list-item');
        if (listItem) {
            longPressElement = listItem;
            longPressTimer = setTimeout(() => {
                showQuickActionsMenu(listItem);
                if (navigator.vibrate) navigator.vibrate(50);
            }, 500);
        }
    });

    document.addEventListener('touchend', () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    });

    document.addEventListener('touchmove', () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    });
}

function showQuickActionsMenu(element) {
    // Show context menu with options
    const menu = document.createElement('div');
    menu.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
    menu.innerHTML = `
        <div class="bg-white rounded-2xl p-4 m-4 max-w-xs w-full animate-scale-in">
            <h3 class="text-lg font-bold text-gray-800 mb-4 text-center">ตัวเลือก</h3>
            <div class="space-y-2">
                <button onclick="this.closest('.fixed').remove()" class="w-full py-3 bg-gold-500 text-white rounded-xl font-semibold">
                    แก้ไข
                </button>
                <button onclick="this.closest('.fixed').remove()" class="w-full py-3 bg-red-500 text-white rounded-xl font-semibold">
                    ลบ
                </button>
                <button onclick="this.closest('.fixed').remove()" class="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold">
                    ยกเลิก
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(menu);

    // Close on background click
    menu.addEventListener('click', (e) => {
        if (e.target === menu) {
            menu.remove();
        }
    });
}

// ============================================
// ENHANCED EMPTY STATE
// ============================================

function getEnhancedEmptyState(type) {
    const emoji = type === 'government' ? '🎫' : '📝';
    const title = type === 'government' ? 'ยังไม่มีรายการ' : 'ยังไม่มีรายการ';
    const subtitle = type === 'government'
        ? 'เลือกประเภท กรอกเลข และจำนวน<br>แล้วกดเพิ่มรายการ'
        : 'เลือกประเภท กรอกเลข และราคา<br>แล้วกดเพิ่มรายการ';

    return `
        <div class="text-center py-12 animate-fade-in">
            <div class="empty-state-icon text-6xl mb-4 animate-bounce-slow">${emoji}</div>
            <p class="text-gray-400 text-base mb-2 font-medium">${title}</p>
            <p class="text-gray-300 text-sm">${subtitle}</p>
        </div>
    `;
}

// ============================================
// ERROR HANDLING & VALIDATION
// ============================================

function validateData() {
    try {
        // Check localStorage availability
        if (!window.localStorage) {
            throw new Error('LocalStorage ไม่พร้อมใช้งาน');
        }

        // Check data integrity
        if (!Array.isArray(undergroundData)) {
            undergroundData = [];
        }
        if (!Array.isArray(governmentData)) {
            governmentData = [];
        }

        return true;
    } catch (error) {
        console.error('Data validation error:', error);
        showToast('⚠ เกิดข้อผิดพลาดในการตรวจสอบข้อมูล');
        return false;
    }
}

function safeExecute(fn, errorMessage = 'เกิดข้อผิดพลาด') {
    try {
        return fn();
    } catch (error) {
        console.error(error);
        showToast(`⚠ ${errorMessage}`);
        return null;
    }
}

// ============================================
// PERFORMANCE OPTIMIZATION
// ============================================

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Optimized search with debounce
const debouncedFilterUnderground = debounce(filterUnderground, 300);
const debouncedFilterGovernment = debounce(filterGovernment, 300);

// ============================================
// LAZY LOADING - html2canvas
// ============================================

let html2canvasLoaded = false;
let html2canvasLoading = false;

// Load html2canvas only when needed (saves ~400KB on initial load)
async function loadHtml2Canvas() {
    if (html2canvasLoaded) return true;
    if (html2canvasLoading) {
        // Wait for existing load to complete
        return new Promise((resolve) => {
            const checkLoaded = setInterval(() => {
                if (html2canvasLoaded) {
                    clearInterval(checkLoaded);
                    resolve(true);
                }
            }, 100);
        });
    }

    html2canvasLoading = true;

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
        script.async = true;

        script.onload = () => {
            html2canvasLoaded = true;
            html2canvasLoading = false;
            console.log('✓ html2canvas loaded on-demand');
            resolve(true);
        };

        script.onerror = () => {
            html2canvasLoading = false;
            console.error('Failed to load html2canvas');
            reject(new Error('Failed to load html2canvas library'));
        };

        document.head.appendChild(script);
    });
}

// Wrapper function to ensure html2canvas is loaded before use
async function ensureHtml2Canvas() {
    if (typeof html2canvas !== 'undefined') {
        return true;
    }

    try {
        await loadHtml2Canvas();
        // ตรวจสอบว่าโหลดสำเร็จจริงๆ
        if (typeof html2canvas === 'undefined') {
            throw new Error('html2canvas not loaded after script execution');
        }
        return true;
    } catch (error) {
        console.error('ensureHtml2Canvas error:', error);
        showToast('⚠️ ไม่สามารถโหลดไลบรารีสร้างรูปได้');
        return false;
    }
}

// แสดง fallback UI เมื่อไม่สามารถสร้างรูปได้
function showScreenshotFallback() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div class="text-center">
                <div class="text-5xl mb-4">📸</div>
                <h3 class="text-xl font-bold text-gray-800 mb-3">ไม่สามารถสร้างรูปอัตโนมัติได้</h3>
                <p class="text-gray-600 mb-4 text-sm leading-relaxed">
                    เนื่องจากข้อจำกัดของเบราว์เซอร์<br>
                    กรุณาใช้วิธีนี้แทน:
                </p>
                <div class="bg-gold-50 rounded-xl p-4 mb-4 text-left">
                    <ol class="text-sm text-gray-700 space-y-2">
                        <li class="flex items-start gap-2">
                            <span class="font-bold text-gold-600">1.</span>
                            <span>กดปุ่ม Screenshot บนมือถือ</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <span class="font-bold text-gold-600">2.</span>
                            <span>ครอบตัดเฉพาะส่วนที่ต้องการ</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <span class="font-bold text-gold-600">3.</span>
                            <span>บันทึกหรือแชร์รูปได้เลย</span>
                        </li>
                    </ol>
                </div>
                <button onclick="this.closest('.fixed').remove()" 
                    class="w-full py-3 bg-gold-500 text-white rounded-xl font-semibold hover:bg-gold-600 transition-colors">
                    เข้าใจแล้ว
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// ============================================
// DOM CACHING - Reduce repeated DOM queries
// ============================================

const DOMCache = {
    _cache: {},

    get(id) {
        if (!this._cache[id]) {
            this._cache[id] = document.getElementById(id);
        }
        return this._cache[id];
    },

    clear() {
        this._cache = {};
    }
};

// ============================================
// PERFORMANCE MONITORING
// ============================================

const PerfMonitor = {
    marks: {},

    start(name) {
        this.marks[name] = performance.now();
    },

    end(name) {
        if (this.marks[name]) {
            const duration = performance.now() - this.marks[name];
            if (duration > 100) { // Log slow operations (>100ms)
                console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
            }
            delete this.marks[name];
            return duration;
        }
        return 0;
    }
};

// Add CSS for new animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes bounce-slow {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
    }
    
    .animate-bounce-slow {
        animation: bounce-slow 2s ease-in-out infinite;
    }
    
    @keyframes scale-in {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }
    
    .animate-scale-in {
        animation: scale-in 0.3s ease-out;
    }
    
    @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    .animate-fade-in {
        animation: fade-in 0.5s ease-out;
    }
    
    .list-item {
        transition: transform 0.3s ease, opacity 0.3s ease;
    }
`;
document.head.appendChild(style);

// Log initial load performance
if (typeof performance !== 'undefined' && performance.timing) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const timing = performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            console.log(`📊 Page load time: ${loadTime}ms`);
        }, 0);
    });
}

