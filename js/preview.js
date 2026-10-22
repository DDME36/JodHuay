// Preview modal: item selection, export sheet layout, text/image copy and share.
import { state, typeNames } from './state.js';
import { copyText, escapeHtml, getTabData, isIOSDevice, showToast, vibrate } from './utils.js';
import { getSlipFileName, getSlipTextHeader, renderPreviewMeta } from './slip-meta.js';
import { getUndergroundTotal } from './entries.js';

// ============================================
// PREVIEW MODAL
// ============================================

export function openPreviewModal() {
    const data = getTabData();
    if (data.length === 0) {
        showToast('ไม่มีรายการ');
        return;
    }

    state.selectedItems = new Set(data.map(i => i.id));
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

export function closePreviewModal() {
    document.getElementById('previewModal').classList.add('hidden');
}

export function selectAll() {
    const data = getTabData();
    state.selectedItems = new Set(data.map(i => i.id));
    renderSelectionList();
    renderPreview();
    updateSelectedCount();
}

export function selectNone() {
    state.selectedItems.clear();
    renderSelectionList();
    renderPreview();
    updateSelectedCount();
}

export function toggleItem(id) {
    id = String(id);
    if (state.selectedItems.has(id)) {
        state.selectedItems.delete(id);
    } else {
        state.selectedItems.add(id);
    }
    renderSelectionList();
    renderPreview();
    updateSelectedCount();
}

export function renderSelectionList() {
    const data = getTabData();
    const container = document.getElementById('selectionList');

    // Group by type
    const grouped = {};
    data.forEach(item => {
        if (!grouped[item.type]) grouped[item.type] = [];
        grouped[item.type].push(item);
    });

    let html = '';

    Object.keys(grouped).forEach(type => {
        const typeName = escapeHtml(typeNames[type] || type);
        html += `<div class="w-full mb-2">
            <div class="text-xs text-gray-500 font-medium mb-1">${typeName}</div>
            <div class="flex flex-wrap gap-1.5">`;

        grouped[type].forEach(item => {
            const isSelected = state.selectedItems.has(item.id);
            const label = state.currentTab === 'underground'
                ? `${item.number}`
                : `${item.number}${item.qty > 1 ? ' x' + item.qty : ''}`;

            html += `
                <button type="button" data-selection-id="${escapeHtml(String(item.id))}"
                    class="chip ${isSelected ? 'chip-selected' : 'chip-unselected'}">
                    ${escapeHtml(label)}
                </button>
            `;
        });

        html += `</div></div>`;
    });

    container.innerHTML = html;
    container.querySelectorAll('[data-selection-id]').forEach(button => {
        button.addEventListener('click', () => toggleItem(button.dataset.selectionId));
    });
}

export function renderPreview() {
    const data = getTabData();
    const selected = data.filter(i => state.selectedItems.has(i.id));
    const container = document.getElementById('previewContent');
    renderPreviewMeta();

    if (selected.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-8">เลือกรายการที่ต้องการ</p>';
        applyExportSheetLayout(0, 0);
        return;
    }

    if (state.currentTab === 'underground') {
        renderUndergroundPreview(selected, container);
    } else {
        renderGovernmentPreview(selected, container);
    }
}

export function renderExportGroups(data, container, sections, tab) {
    const activeSections = sections
        .map(section => ({ ...section, items: data.filter(item => item.type === section.key) }))
        .filter(section => section.items.length > 0);

    const groupsHtml = activeSections.map(section => {
        const lowerClass = section.key.toLowerCase().includes('lang') ? ' export-group-lower' : '';
        const rows = section.items.map(item => {
            const detail = tab === 'underground'
                ? item.price.replace(' x ', ' × ')
                : `${Number.parseInt(item.qty, 10)} ใบ`;
            return `
                <div class="export-number-row">
                    <strong class="export-number">${escapeHtml(item.number)}</strong>
                    <span class="export-number-detail">${escapeHtml(detail)}</span>
                </div>`;
        }).join('');

        return `
            <section class="export-group${lowerClass}">
                <div class="export-group-header">
                    <strong>${escapeHtml(section.title)}</strong>
                    <span>${section.items.length} รายการ</span>
                </div>
                <div class="export-number-list">${rows}</div>
            </section>`;
    }).join('');

    const totalValue = tab === 'underground'
        ? `${getUndergroundTotal(data).toLocaleString('th-TH')} บาท`
        : `${data.reduce((sum, item) => sum + Number.parseInt(item.qty, 10), 0).toLocaleString('th-TH')} ใบ`;
    const totalLabel = tab === 'underground' ? 'ยอดรวม' : 'จำนวนสลากรวม';

    const groupsClass = activeSections.length === 1 ? ' export-groups-single' : '';

    container.innerHTML = `
        <div class="export-groups${groupsClass}">${groupsHtml}</div>
        <div class="export-summary">
            <div class="export-summary-item">
                <span class="export-summary-label">รายการที่เลือก</span>
                <strong class="export-summary-value">${data.length.toLocaleString('th-TH')} รายการ</strong>
            </div>
            <div class="export-summary-item">
                <span class="export-summary-label">${totalLabel}</span>
                <strong class="export-summary-value">${totalValue}</strong>
            </div>
        </div>`;
    applyExportSheetLayout(data.length, activeSections.length);
}

export function applyExportSheetLayout(itemCount, groupCount) {
    const sheet = document.getElementById('a4Preview');
    if (!sheet) return;

    sheet.classList.remove(
        'export-sheet-empty',
        'export-sheet-mini',
        'export-sheet-compact',
        'export-sheet-balanced',
        'export-sheet-a4',
        'export-sheet-dense',
        'export-sheet-ultra-dense',
        'export-sheet-single-group',
        'export-sheet-flow-columns'
    );

    let layout = 'a4';
    if (itemCount === 0) layout = 'empty';
    else if (itemCount <= 2) layout = 'mini';
    else if (itemCount <= 6) layout = 'compact';
    else if (itemCount <= 14) layout = 'balanced';

    sheet.classList.add(`export-sheet-${layout}`);
    if (itemCount > 24) sheet.classList.add('export-sheet-dense');
    if (itemCount > 60) sheet.classList.add('export-sheet-ultra-dense');
    if (groupCount === 1) sheet.classList.add('export-sheet-single-group');
    if (groupCount === 1 && itemCount > 4) sheet.classList.add('export-sheet-flow-columns');
    sheet.dataset.itemCount = String(itemCount);
    sheet.dataset.groupCount = String(groupCount);
    sheet.dataset.layout = layout;
}

export async function waitForExportSheetReady(sheet) {
    try { await document.fonts?.ready; } catch { /* Use available fonts if the browser cannot report readiness. */ }
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const animations = sheet?.getAnimations?.({ subtree: true }) || [];
    if (!animations.length) return;
    await Promise.race([
        Promise.all(animations.map(animation => animation.finished.catch(() => undefined))),
        new Promise(resolve => setTimeout(resolve, 420))
    ]);
}

export function getExportCanvasOptions(preview, isIOS, {
    safeBackgrounds = false,
    nativeRendering = true
} = {}) {
    const rect = preview.getBoundingClientRect();
    const captureWidth = Math.ceil(rect.width);
    const captureHeight = Math.ceil(rect.height);

    return {
        backgroundColor: null,
        scale: isIOS ? 1.5 : 2,
        width: captureWidth,
        height: captureHeight,
        windowWidth: Math.max(document.documentElement.clientWidth, captureWidth),
        windowHeight: Math.max(document.documentElement.clientHeight, captureHeight),
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        useCORS: true,
        allowTaint: false,
        logging: false,
        removeContainer: true,
        imageTimeout: 15000,
        // Let the browser paint the same HTML/CSS used by the visible preview.
        // html2canvas's manual renderer measures Thai glyphs and thin rules
        // differently, which made downloaded slips drift from the preview.
        foreignObjectRendering: nativeRendering,
        onclone: (clonedDoc) => {
            try {
                const clonedPreview = clonedDoc.getElementById('a4Preview');
                if (!clonedPreview) return;

                // Freeze only timing-related styles. Preserve transforms used by ornaments and alignment.
                clonedPreview.classList.add('export-sheet-capture');
                clonedPreview.style.width = `${captureWidth}px`;
                clonedPreview.style.maxWidth = `${captureWidth}px`;
                clonedPreview.style.height = `${captureHeight}px`;
                clonedPreview.style.minHeight = '0';
                clonedPreview.style.boxShadow = 'none';
                const clonedElements = [clonedPreview, ...clonedPreview.querySelectorAll('*')];
                clonedElements.forEach(element => {
                    element.style.animation = 'none';
                    element.style.transition = 'none';

                    // html2canvas cannot create a repeating pattern from an image/gradient
                    // whose cloned element has no drawable area. Hidden metadata is a common
                    // example, so remove only its background image during normal captures.
                    const elementRect = element.getBoundingClientRect();
                    const hasNoDrawableArea = elementRect.width <= 0 || elementRect.height <= 0;
                    if (safeBackgrounds || hasNoDrawableArea) {
                        element.style.backgroundImage = 'none';
                    }
                });

                if (safeBackgrounds) {
                    clonedPreview.style.background = '#fdf8ed';
                    clonedPreview.style.backgroundColor = '#fdf8ed';
                }
            } catch (error) {
                console.warn('Unable to prepare export clone:', error);
            }
        }
    };
}

export async function createExportCanvas(preview, isIOS) {
    await waitForExportSheetReady(preview);

    // Clone computed browser styles and embed fonts before rasterizing so the
    // canvas keeps the same Thai baselines, spacing and rules as the preview.
    try {
        if (!window.modernScreenshot?.domToCanvas) {
            throw new Error('Modern screenshot renderer is unavailable');
        }
        const canvas = await window.modernScreenshot.domToCanvas(preview, {
            scale: isIOS ? 1.5 : 2,
            backgroundColor: '#fdf8ed',
            features: { removeControlCharacter: true }
        });
        if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
            throw new Error('Modern renderer returned a zero-sized canvas');
        }
        return canvas;
    } catch (error) {
        const message = String(error?.message || error);
        console.warn('Pixel-matched export failed; retrying with compatibility renderer.', message);
        if (typeof html2canvas === 'undefined') {
            const loaded = await ensureHtml2Canvas();
            if (!loaded) throw error;
        }
        await new Promise(resolve => requestAnimationFrame(resolve));
        return html2canvas(preview, getExportCanvasOptions(preview, isIOS, {
            safeBackgrounds: true,
            nativeRendering: false
        }));
    }
}

export function renderUndergroundPreview(data, container) {
    renderExportGroups(data, container, [
        { key: '3bon', title: '3 ตัวบน' },
        { key: '2bon', title: '2 ตัวบน' },
        { key: '2lang', title: '2 ตัวล่าง' },
        { key: 'runBon', title: 'วิ่งบน' },
        { key: 'runLang', title: 'วิ่งล่าง' }
    ], 'underground');
}

export function renderGovernmentPreview(data, container) {
    renderExportGroups(data, container, [
        { key: '6', title: '6 ตัวตรง' },
        { key: 'front3', title: 'เลขหน้า 3 ตัว' },
        { key: 'back3', title: 'เลขท้าย 3 ตัว' },
        { key: 'back2', title: 'เลขท้าย 2 ตัว' }
    ], 'government');
}

// ============================================
// IMAGE EXPORT (ใช้ร่วมกันระหว่าง "บันทึกรูป" และ "แชร์รูป")
// ============================================

// แสดงสถานะกำลังทำงานบนปุ่ม แล้วคืนค่าเดิมเมื่อเสร็จ
export async function withBusyButton(button, busyText, task) {
    const label = button?.querySelector('span');
    const originalText = label?.textContent;
    if (button) button.disabled = true;
    const setLabel = text => { if (label) label.textContent = text; };
    setLabel(busyText);
    try {
        return await task(setLabel);
    } finally {
        if (button) button.disabled = false;
        if (label && originalText) label.textContent = originalText;
    }
}

// สร้างรูปใบโพยจาก preview ที่เลือกไว้
export async function renderSlipImage(setLabel = () => {}) {
    // The pixel-matched renderer is bundled with the app. Load the legacy
    // renderer only when the modern renderer is unavailable.
    if (typeof window.modernScreenshot === 'undefined' && typeof html2canvas === 'undefined') {
        setLabel('กำลังโหลด…');
        if (!(await ensureHtml2Canvas())) throw new Error('html2canvas library not loaded');
        setLabel('กำลังสร้างรูป…');
    }

    const canvas = await createExportCanvas(document.getElementById('a4Preview'), isIOSDevice());
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas creation failed - invalid dimensions');
    }

    const dataUrl = canvas.toDataURL('image/png');
    const fileName = getSlipFileName();
    const blob = await (await fetch(dataUrl)).blob();
    return { dataUrl, fileName, file: new File([blob], fileName, { type: 'image/png' }) };
}

export function canShareFile(file) {
    return Boolean(navigator.share && navigator.canShare?.({ files: [file] }));
}

export function handleImageExportError(error, defaultMessage) {
    console.error('Image export error:', error);
    let message = defaultMessage;
    let showFallback = true;

    if (error.message?.includes('html2canvas')) message = 'ไม่สามารถโหลดไลบรารีได้';
    else if (error.message?.includes('Canvas')) message = 'ไม่สามารถสร้างรูปภาพได้';
    else if (error.name === 'SecurityError') message = 'ไม่สามารถเข้าถึงรูปภาพได้';
    else if (error.name === 'DOMException') message = 'รูปภาพมีขนาดใหญ่เกินไป ลองลดจำนวนรายการ';
    else showFallback = false;

    showToast(`⚠️ ${message}`);
    if (showFallback && isIOSDevice()) setTimeout(() => showScreenshotFallback(), 500);
}

// iOS Safari ดาวน์โหลดไฟล์ตรง ๆ ไม่ได้ จึงเปิดรูปในแท็บใหม่ให้กดค้างบันทึก
export function openImageInNewTab(dataUrl) {
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
        // ไม่ปิด modal - ให้ผู้ใช้ปิดเองหรือบันทึกต่อ
    } else {
        showToast('⚠️ กรุณาอนุญาตให้เปิดหน้าต่างใหม่');
        // ไม่ปิด modal เพื่อให้ผู้ใช้ลองใหม่
    }
}

// Save image
export async function saveImage() {
    if (state.selectedItems.size === 0) {
        showToast('กรุณาเลือกรายการ');
        return;
    }

    await withBusyButton(document.getElementById('btnCopyOrSave'), 'กำลังสร้าง…', async setLabel => {
        try {
            const { dataUrl, fileName, file } = await renderSlipImage(setLabel);

            if (isIOSDevice()) {
                // iOS: พยายามใช้ Web Share API ก่อน
                if (canShareFile(file)) {
                    try {
                        await navigator.share({ files: [file], title: 'JodHuay - จดหวย' });
                        showToast('✓ บันทึกแล้ว');
                        closePreviewModal();
                        return;
                    } catch (e) {
                        // ผู้ใช้ยกเลิก Share: อยู่ที่ modal เดิม
                        if (e.name === 'AbortError') return;
                        console.log('Share failed, opening image instead:', e);
                    }
                }
                openImageInNewTab(dataUrl);
                return;
            }

            // Desktop/Android: Download โดยตรง
            const link = document.createElement('a');
            link.download = fileName;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            link.remove();

            state.selectedItems.clear();
            showToast('✓ บันทึกแล้ว');
            closePreviewModal();
        } catch (e) {
            handleImageExportError(e, 'เกิดข้อผิดพลาด');
        }
    });
}

// ============================================
// SHARE AS TEXT (from Modal)
// ============================================

export function buildSlipText(items, tab = state.currentTab) {
    let text = `JODHUAY - จดหวย\n${getSlipTextHeader(tab)}\n`;
    text += `─────────────\n`;

    const groupOrder = tab === 'underground'
        ? ['3bon', '2bon', '2lang', 'runBon', 'runLang']
        : ['6', 'front3', 'back3', 'back2'];

    groupOrder.forEach(type => {
        const group = items.filter(item => item.type === type);
        if (!group.length) return;
        text += `\n[ ${typeNames[type]} ]\n`;
        group.forEach(item => {
            if (tab === 'underground') {
                text += `${item.number} = ${item.price}\n`;
            } else {
                text += `${item.number}${item.qty > 1 ? ` (${item.qty} ใบ)` : ''}\n`;
            }
        });
    });

    text += `\n─────────────\nรวม ${items.length} รายการ\n`;
    if (tab === 'underground') {
        const total = getUndergroundTotal(items);
        text += `ยอดรวม: ${total.toLocaleString()} บาท\n`;
    }
    return text.trim();
}

export async function shareAsText() {
    const data = getTabData();
    const selected = data.filter(i => state.selectedItems.has(i.id));

    if (selected.length === 0) {
        showToast('กรุณาเลือกรายการ');
        return;
    }

    const text = buildSlipText(selected);

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'รายการหวย - JodHuay',
                text: text
            });
            showToast('✓ แชร์แล้ว');
        } catch (err) {
            if (err.name !== 'AbortError') {
                showToast(await copyText(text) ? 'คัดลอกแล้ว (ไม่สามารถแชร์ได้)' : 'ไม่สามารถคัดลอกได้');
            }
        }
    } else {
        showToast(await copyText(text) ? 'คัดลอกแล้ว (ไม่รองรับการแชร์)' : 'ไม่สามารถคัดลอกได้');
    }
}

// ============================================
// SHARE AS IMAGE (from Modal)
// ============================================

export async function shareAsImage() {
    if (state.selectedItems.size === 0) {
        showToast('กรุณาเลือกรายการ');
        return;
    }

    await withBusyButton(document.getElementById('btnShare'), 'กำลังสร้างรูป…', async setLabel => {
        try {
            const { file } = await renderSlipImage(setLabel);
            if (!canShareFile(file)) {
                showToast('เบราว์เซอร์ไม่รองรับการแชร์รูป');
                return;
            }
            await navigator.share({ files: [file], title: 'JodHuay - จดหวย' });
            showToast('✓ แชร์แล้ว');
        } catch (e) {
            if (e.name !== 'AbortError') handleImageExportError(e, 'ไม่สามารถแชร์ได้');
        }
    });
}

// ============================================
// MODAL MODE SWITCHING
// ============================================

let currentModalMode = 'text';

 // 'text' or 'image'

export function switchModalMode(mode) {
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
    vibrate(30);
}

export function handleCopyOrSave() {
    if (currentModalMode === 'text') {
        copyAsText();
    } else {
        saveImage();
    }
}

export function handleShare() {
    if (currentModalMode === 'text') {
        shareAsText();
    } else {
        shareAsImage();
    }
}

// ============================================
// SELECTION PANEL TOGGLE
// ============================================

export function toggleSelectionPanel() {
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

export function updateSelectedCount() {
    const countEl = document.getElementById('selectedCount');
    if (countEl) {
        countEl.textContent = state.selectedItems.size;
    }
}

// ============================================
// COPY AS TEXT
// ============================================

export async function copyAsText() {
    try {
        const selected = getTabData().filter(i => state.selectedItems.has(i.id));

        if (selected.length === 0) {
            showToast('กรุณาเลือกรายการ');
            return;
        }

        showToast(await copyText(buildSlipText(selected)) ? 'คัดลอกแล้ว' : '⚠️ ไม่สามารถคัดลอกได้');
    } catch (error) {
        console.error('Copy as text error:', error);
        showToast('⚠️ เกิดข้อผิดพลาด');
    }
}

// ============================================
// LAZY LOADING - html2canvas
// ============================================

let html2canvasPromise = null;

// Load the pinned local build only when needed. Keeping the capture engine in
// the app avoids CDN/version differences and keeps image export available offline.
export function loadHtml2Canvas() {
    html2canvasPromise ??= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = './assets/vendor/html2canvas.min.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => {
            html2canvasPromise = null; // allow a retry later
            script.remove();
            reject(new Error('Failed to load html2canvas library'));
        };
        document.head.appendChild(script);
    });
    return html2canvasPromise;
}

// Wrapper function to ensure html2canvas is loaded before use
export async function ensureHtml2Canvas() {
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
export function showScreenshotFallback() {
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
                <button type="button" data-close-fallback
                    class="w-full py-3 bg-gold-500 text-white rounded-xl font-semibold hover:bg-gold-600 transition-colors">
                    เข้าใจแล้ว
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Close on button or backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('[data-close-fallback]')) {
            modal.remove();
        }
    });
}
