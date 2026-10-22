// Entry point: initialises the app and wires data-action buttons to handlers.
import { showToast } from './utils.js';
import { applyMotionPreference, setupScrollMotion, switchTab } from './motion.js';
import { exportData, loadData, openImportDialog } from './storage.js';
import { clearSlipMeta, loadSlipMeta, openThaiDatePicker, selectSuggestedDrawDate, setupSlipMeta, toggleSlipMeta } from './slip-meta.js';
import { closeNumpad, confirmNumpad, numpadBackspace, numpadClear, numpadPress, openPriceNumpad, openTodNumpad, quickPrice } from './numpad.js';
import { addGovernment, addUnderground, cancelEdit, clearData, copyPriceToTod, filterByType, handleKeyPress, handleNumberInput, onTodGlabChange, renderAll, renderGovernment, renderUnderground, setupChoiceChips, setupNumberInputs, setupSwipeToDelete, toggleTodPrice, updateInputReadonlyState } from './entries.js';
import { closePreviewModal, handleCopyOrSave, handleShare, openPreviewModal, selectAll, selectNone, switchModalMode, toggleSelectionPanel } from './preview.js';
import { dismissInstallBanner, registerServiceWorker, setupOfflineDetection, toggleDeviceVault, triggerInstall } from './shell.js';
import { state } from './state.js';
import * as utils from './utils.js';
import * as motion from './motion.js';
import * as storage from './storage.js';
import * as slipMeta from './slip-meta.js';
import * as numpad from './numpad.js';
import * as entries from './entries.js';
import * as preview from './preview.js';
import * as shell from './shell.js';

applyMotionPreference();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    try {
        loadData();
        loadSlipMeta();
        setupSlipMeta();
        renderAll();
        registerServiceWorker();

        // Setup Choice Chips
        setupChoiceChips();

        setupNumberInputs();

        setupActions();

        // Setup offline detection
        setupOfflineDetection();

        // Setup swipe to delete
        setupSwipeToDelete();
        if (location.protocol === 'file:') {
            document.getElementById('fileProtocolNotice')?.classList.remove('hidden');
        }
        toggleDeviceVault(false);
        applyMotionPreference();
        setupScrollMotion();

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
            // ข้าม Script error จาก external scripts (CORS)
            if (event && event.message === 'Script error.') {
                event.preventDefault();
                return;
            }
            
            // ป้องกัน error ที่เป็น null หรือ undefined - ไม่ log เลย
            if (!event || (!event.error && !event.message)) {
                event?.preventDefault();
                return;
            }
            
            // Log เฉพาะ error ที่มีข้อมูลจริงๆ
            if (event.error) {
                console.error('Global error:', event.error);
            } else if (event.message) {
                console.error('Global error:', event.message);
            }
            
            event.preventDefault(); // ป้องกัน error แสดงใน console ซ้ำ
        });

        window.addEventListener('unhandledrejection', (event) => {
            // ป้องกัน promise rejection ที่เป็น null หรือ undefined - ไม่ log เลย
            if (!event || !event.reason) {
                event?.preventDefault();
                return;
            }
            
            console.error('Unhandled promise rejection:', event.reason);
            event.preventDefault(); // ป้องกัน error แสดงใน console ซ้ำ
        });
    } catch (error) {
        console.error('DOMContentLoaded initialization error:', error);
        showToast('⚠️ เกิดข้อผิดพลาดในการเริ่มต้น');
    }
});

// ============================================
// UI EVENT WIRING (แทน onclick ใน HTML)
// ============================================

// ปุ่มใน HTML ระบุ data-action="ชื่อ" (และ data-arg ถ้ามีค่าที่ต้องส่ง)
const actions = {
    addGovernment,
    addUnderground,
    cancelEdit,
    clearData,
    clearSlipMeta,
    closeNumpad,
    closePreviewModal,
    confirmNumpad,
    copyPriceToTod,
    dismissInstallBanner,
    exportData,
    filterByType,
    handleCopyOrSave,
    handleNumberInput,
    handleShare,
    numpadBackspace,
    numpadClear,
    numpadPress,
    openImportDialog,
    openPreviewModal,
    openThaiDatePicker,
    openTodNumpad,
    quickPrice,
    selectAll,
    selectNone,
    selectSuggestedDrawDate,
    switchModalMode,
    switchTab,
    toggleDeviceVault,
    toggleSelectionPanel,
    toggleSlipMeta,
    toggleTodPrice,
    triggerInstall,
    openPriceNumpad: () => openPriceNumpad('ugPriceDirect', 'ราคาเต็ง'),
    dismissFileNotice: (_arg, element) => element.parentElement?.remove()
};

function setupActions() {
    document.addEventListener('click', event => {
        const element = event.target.closest('[data-action]');
        const action = actions[element?.dataset.action];
        if (action) action(element.dataset.arg, element);
    });

    [['govNumber', 'government'], ['ugNumber', 'underground']].forEach(([id, type]) => {
        const input = document.getElementById(id);
        const container = input?.closest('.hero-input-container');
        input?.addEventListener('keypress', event => handleKeyPress(event, type));
        input?.addEventListener('focus', () => container?.classList.add('input-focused'));
        input?.addEventListener('blur', () => container?.classList.remove('input-focused'));
    });

    document.getElementById('ugPriceDirect')?.addEventListener('keypress', event => {
        if (event.key === 'Enter') addUnderground();
    });
    document.getElementById('govSearchInput')?.addEventListener('input', () => renderGovernment());
    document.getElementById('ugSearchInput')?.addEventListener('input', () => renderUnderground());
    document.getElementById('ugTodType')?.addEventListener('change', onTodGlabChange);
}

// Console/test hook: module functions as JodHuay.<name>, live state as JodHuay.state
window.JodHuay = Object.freeze({
    ...utils, ...motion, ...storage, ...slipMeta, ...numpad, ...entries, ...preview, ...shell, state
});
