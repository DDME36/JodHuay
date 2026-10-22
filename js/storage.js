// localStorage persistence: migration, validation, backup, JSON export/import and debug tools.
import { DATA_VERSION, NUMBER_LENGTHS, state } from './state.js';
import { generateUniqueId, showCustomConfirm, showToast } from './utils.js';
import { sanitizeSlipMeta, saveSlipMeta, setupSlipMetaValues } from './slip-meta.js';
import { renderAll, setEditing } from './entries.js';

// เวอร์ชันข้อมูลปัจจุบัน

export function getStorageKey(type) {
    return `lottery_${type}`;
}

export function getVersionKey() {
    return 'lottery_data_version';
}

// ตรวจสอบและแปลงข้อมูลเก่า
export function migrateData() {
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
        showToast('⚠️ กำลังอัปเดตข้อมูล…');
    }
}

// Migration จาก 1.0 -> 1.1
export function migrateToV1_1() {
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
export function calculateAmountFromPrice(priceStr) {
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
export function validateAndFixData(data, type) {
    if (!Array.isArray(data)) return [];

    const seenIds = new Set();
    const numberLengths = NUMBER_LENGTHS[type];

    return data.filter(item => {
        // ตรวจสอบ required fields
        if (!item || typeof item !== 'object') return false;
        if (!item.type || !numberLengths[item.type]) return false;
        if (typeof item.number !== 'string') return false;

        item.number = item.number.replace(/\s/g, '');
        if (!/^\d+$/.test(item.number) || item.number.length !== numberLengths[item.type]) return false;

        let normalizedId = String(item.id || '');
        if (!/^[A-Za-z0-9_-]{1,100}$/.test(normalizedId) || seenIds.has(normalizedId)) {
            normalizedId = generateUniqueId();
        }
        item.id = normalizedId;
        seenIds.add(normalizedId);

        if (type === 'underground') {
            if (typeof item.price !== 'string') return false;
            item.price = item.price.trim();
            if (!/^\d+(?: x (?:\d+|กลับ [36]))?$/.test(item.price)) return false;
            item.amount = calculateAmountFromPrice(item.price);
            if (!Number.isFinite(item.amount) || item.amount <= 0) return false;
        } else if (type === 'government') {
            item.qty = Number.parseInt(item.qty, 10);
            if (!Number.isFinite(item.qty) || item.qty <= 0) item.qty = 1;
            item.qty = Math.min(item.qty, 9999);
        }

        return true;
    });
}

export function loadData() {
    try {
        // ทำ migration ก่อน
        migrateData();

        // โหลดข้อมูล
        const undergroundRaw = localStorage.getItem(getStorageKey('underground')) || '[]';
        const governmentRaw = localStorage.getItem(getStorageKey('government')) || '[]';

        state.undergroundData = JSON.parse(undergroundRaw);
        state.governmentData = JSON.parse(governmentRaw);

        // Validate และซ่อมแซมข้อมูล
        state.undergroundData = validateAndFixData(state.undergroundData, 'underground');
        state.governmentData = validateAndFixData(state.governmentData, 'government');

        // ถ้ามีการแก้ไข ให้บันทึกกลับ
        if (undergroundRaw !== JSON.stringify(state.undergroundData) ||
            governmentRaw !== JSON.stringify(state.governmentData)) {
            saveData();
            console.log('Data validated and fixed');
        }

    } catch (error) {
        console.error('Load data error:', error);

        // ถ้าโหลดไม่ได้ ให้สำรองข้อมูลและรีเซ็ต
        backupCorruptedData();
        state.undergroundData = [];
        state.governmentData = [];

        showToast('⚠️ พบข้อมูลเสียหาย กำลังรีเซ็ต…');
    }
}

// สำรองข้อมูลที่เสียหาย
export function backupCorruptedData() {
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

export function saveData() {
    try {
        // ตรวจสอบข้อมูลก่อนบันทึก
        const undergroundValid = validateAndFixData(state.undergroundData, 'underground');
        const governmentValid = validateAndFixData(state.governmentData, 'government');

        // บันทึกข้อมูล
        localStorage.setItem(getStorageKey('underground'), JSON.stringify(undergroundValid));
        localStorage.setItem(getStorageKey('government'), JSON.stringify(governmentValid));

        // อัปเดตข้อมูลในหน่วยความจำ
        state.undergroundData = undergroundValid;
        state.governmentData = governmentValid;

    } catch (error) {
        console.error('Save data error:', error);

        if (error.name === 'QuotaExceededError') {
            // พื้นที่เต็ม - ลองลบ backup เก่า
            cleanupOldBackups();

            // ลองบันทึกอีกครั้ง
            try {
                localStorage.setItem(getStorageKey('underground'), JSON.stringify(state.undergroundData));
                localStorage.setItem(getStorageKey('government'), JSON.stringify(state.governmentData));
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
export function cleanupOldBackups() {
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

// ============================================
// DATA EXPORT / IMPORT (สำหรับกู้คืนข้อมูล)
// ============================================

// Export ข้อมูลเป็น JSON
export function exportData() {
    try {
        const exportData = {
            version: DATA_VERSION,
            timestamp: Date.now(),
            date: new Date().toISOString(),
            meta: state.slipMeta,
            underground: state.undergroundData,
            government: state.governmentData
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
export function importData(file) {
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showToast('⚠️ ไฟล์ใหญ่เกิน 2 MB');
        return;
    }

    const reader = new FileReader();

    reader.onload = async function (e) {
        try {
            const imported = JSON.parse(e.target.result);

            // ตรวจสอบโครงสร้างข้อมูล
            if (!Array.isArray(imported.underground) || !Array.isArray(imported.government)) {
                throw new Error('Invalid data structure');
            }

            // Validate และแก้ไขข้อมูล
            const undergroundValid = validateAndFixData(imported.underground, 'underground');
            const governmentValid = validateAndFixData(imported.government, 'government');

            // ถามยืนยันก่อน import
            const confirmed = await showCustomConfirm({
                title: 'กู้คืนข้อมูลสำรอง',
                message: `พบข้อมูลในไฟล์สำรอง:\n- หวยใต้ดิน: ${undergroundValid.length} รายการ\n- หวยรัฐบาล: ${governmentValid.length} รายการ\n\nต้องการนำเข้าข้อมูลหรือไม่? (ข้อมูลเดิมจะถูกแทนที่)`,
                icon: 'import',
                confirmText: 'นำเข้าข้อมูล',
                cancelText: 'ยกเลิก',
                isDanger: false
            });

            if (confirmed) {
                // สำรองข้อมูลเก่าก่อน
                backupCorruptedData();

                // Import ข้อมูลใหม่
                state.undergroundData = undergroundValid;
                state.governmentData = governmentValid;
                setEditing('underground', null);
                setEditing('government', null);
                if (imported.meta) {
                    state.slipMeta = sanitizeSlipMeta(imported.meta);
                    saveSlipMeta();
                    setupSlipMetaValues();
                }

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
export function openImportDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function (e) {
        const file = e.target.files[0];
        if (file) importData(file);
    };
    input.click();
}

// ============================================
// DEBUG TOOLS (สำหรับแก้ปัญหา)
// ============================================

// แสดงข้อมูล debug ใน console
export function debugInfo() {
    console.log('=== JodHuay Debug Info ===');
    console.log('Data Version:', localStorage.getItem(getVersionKey()) || 'Not set');
    console.log('Underground Data:', state.undergroundData);
    console.log('Government Data:', state.governmentData);
    console.log('LocalStorage Keys:', Object.keys(localStorage).filter(k => k.startsWith('lottery_')));
    console.log('Storage Used:', JSON.stringify(localStorage).length, 'bytes');
    console.log('========================');
}

// ซ่อมแซมข้อมูลทั้งหมด
export function repairAllData() {
    try {
        console.log('Starting data repair...');

        // โหลดข้อมูลใหม่
        loadData();

        // Validate และแก้ไข
        state.undergroundData = validateAndFixData(state.undergroundData, 'underground');
        state.governmentData = validateAndFixData(state.governmentData, 'government');

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
export async function resetAllData() {
    const confirmed = await showCustomConfirm({
        title: 'รีเซ็ตข้อมูลทั้งหมด',
        message: '⚠️ คำเตือน!\n\nระบบจะลบข้อมูลทั้งหมดรวมถึงไฟล์สำรองในเครื่อง\nคุณแน่ใจหรือไม่ว่าต้องการรีเซ็ต?',
        icon: 'warning',
        confirmText: 'รีเซ็ตทั้งหมด',
        cancelText: 'ยกเลิก',
        isDanger: true
    });

    if (confirmed) {
        try {
            // ลบข้อมูลทั้งหมด
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('lottery_')) {
                    localStorage.removeItem(key);
                }
            });

            // รีเซ็ตตัวแปร
            state.undergroundData = [];
            state.governmentData = [];

            // Render ใหม่
            renderAll();

            console.log('All data reset');
            showToast('✓ รีเซ็ตข้อมูลทั้งหมดแล้ว');
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
