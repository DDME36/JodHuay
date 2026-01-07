let currentTab = 'government';
let undergroundData = [];
let governmentData = [];
let selectedItems = new Set();
let showTodPrice = false;

// Get today's date in Thai timezone
function getTodayKey() {
    const now = new Date();
    const thai = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    return thai.toISOString().split('T')[0];
}

function formatThaiDate(dateStr) {
    const date = new Date(dateStr);
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
}

function formatThaiDateShort(dateStr) {
    const date = new Date(dateStr);
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const today = getTodayKey();
    document.getElementById('todayDate').textContent = formatThaiDateShort(today);
    
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
});

// Setup Choice Chips
function setupChoiceChips() {
    // Government Type Chips
    const govTypeChips = document.getElementById('govTypeChips');
    if (govTypeChips) {
        govTypeChips.addEventListener('click', (e) => {
            const chip = e.target.closest('.choice-chip');
            if (!chip) return;
            
            govTypeChips.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            document.getElementById('govType').value = chip.dataset.value;
            onGovTypeChange();
            document.getElementById('govNumber').focus();
        });
    }
    
    // Government Qty Chips
    const govQtyChips = document.getElementById('govQtyChips');
    if (govQtyChips) {
        govQtyChips.addEventListener('click', (e) => {
            const chip = e.target.closest('.choice-chip');
            if (!chip) return;
            
            govQtyChips.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            document.getElementById('govQty').value = chip.dataset.value;
        });
    }
    
    // Underground Type Chips
    const ugTypeChips = document.getElementById('ugTypeChips');
    if (ugTypeChips) {
        ugTypeChips.addEventListener('click', (e) => {
            const chip = e.target.closest('.choice-chip');
            if (!chip) return;
            
            ugTypeChips.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            document.getElementById('ugType').value = chip.dataset.value;
            onUgTypeChange();
            document.getElementById('ugNumber').focus();
        });
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

// Open NumPad for Price
function openPriceNumpad(targetId, label) {
    openNumpad(targetId, label, 5); // ราคาสูงสุด 5 หลัก (99,999)
}

window.openPriceNumpad = openPriceNumpad;

function switchTab(tab) {
    currentTab = tab;
    document.getElementById('tabUnderground').classList.toggle('active', tab === 'underground');
    document.getElementById('tabGovernment').classList.toggle('active', tab === 'government');
    document.getElementById('undergroundSection').classList.toggle('hidden', tab !== 'underground');
    document.getElementById('governmentSection').classList.toggle('hidden', tab !== 'government');
}

function getStorageKey(type) {
    return `lottery_${type}_${getTodayKey()}`;
}

function loadData() {
    undergroundData = JSON.parse(localStorage.getItem(getStorageKey('underground')) || '[]');
    governmentData = JSON.parse(localStorage.getItem(getStorageKey('government')) || '[]');
}

function saveData() {
    localStorage.setItem(getStorageKey('underground'), JSON.stringify(undergroundData));
    localStorage.setItem(getStorageKey('government'), JSON.stringify(governmentData));
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
    
    if (!section || !btn) return;
    
    if (showTodPrice) {
        section.classList.remove('hidden');
        btn.textContent = '−';
    } else {
        section.classList.add('hidden');
        btn.textContent = '+';
        const todInput = document.getElementById('ugPriceTod');
        const todType = document.getElementById('ugTodType');
        if (todInput) todInput.value = '';
        if (todType) todType.value = '';
    }
}

window.toggleTodPrice = toggleTodPrice;

// Handle กลับ selection - disable input and show text
function onGlabChange(field) {
    const input = document.getElementById(field === 'direct' ? 'ugPriceDirect' : 'ugPriceTod');
    const select = document.getElementById(field === 'direct' ? 'ugDirectType' : 'ugTodType');
    
    if (!input || !select) return;
    
    const value = select.value;
    
    if (value === 'ก.3') {
        input.value = 'กลับ 3';
        input.disabled = true;
        input.classList.add('bg-gold-50', 'text-black');
    } else if (value === 'ก.6') {
        input.value = 'กลับ 6';
        input.disabled = true;
        input.classList.add('bg-gold-50', 'text-black');
    } else {
        input.value = '';
        input.disabled = false;
        input.classList.remove('bg-gold-50', 'text-black');
        input.placeholder = field === 'direct' ? 'เต็ง' : 'โต๊ด';
    }
}

window.onGlabChange = onGlabChange;

// Underground type change
function onUgTypeChange() {
    const type = document.getElementById('ugType').value;
    const input = document.getElementById('ugNumber');
    
    if (type === '3bon') {
        input.maxLength = 3;
        input.placeholder = '123';
    } else if (type === '2bon' || type === '2lang') {
        input.maxLength = 2;
        input.placeholder = '12';
    } else {
        // วิ่ง
        input.maxLength = 1;
        input.placeholder = '5';
    }
    input.value = '';
}

// Government type change
function onGovTypeChange() {
    const type = document.getElementById('govType').value;
    const input = document.getElementById('govNumber');
    if (type === '6') {
        input.maxLength = 6;
        input.placeholder = '123456';
    } else if (type === 'front3' || type === 'back3') {
        input.maxLength = 3;
        input.placeholder = '123';
    } else {
        input.maxLength = 2;
        input.placeholder = '12';
    }
    input.value = '';
}

// Add underground
function addUnderground() {
    const type = document.getElementById('ugType')?.value;
    const number = document.getElementById('ugNumber')?.value.trim();
    const priceDirect = document.getElementById('ugPriceDirect')?.value.trim();
    const priceDirectType = document.getElementById('ugDirectType')?.value;
    const priceTod = document.getElementById('ugPriceTod')?.value.trim();
    const priceTodType = document.getElementById('ugTodType')?.value;
    
    // Validate number length
    const expectedLen = type === '3bon' ? 3 : (type === '2bon' || type === '2lang') ? 2 : 1;
    
    if (!number || number.length !== expectedLen || !/^\d+$/.test(number)) {
        showToast(`กรุณากรอกเลข ${expectedLen} หลัก`);
        return;
    }
    
    // Check if กลับ is selected or price is entered
    const isDirectGlab = priceDirectType === 'ก.3' || priceDirectType === 'ก.6';
    const isTodGlab = priceTodType === 'ก.3' || priceTodType === 'ก.6';
    
    if (!isDirectGlab && (!priceDirect || !/^\d+$/.test(priceDirect))) {
        showToast('กรุณากรอกราคา');
        return;
    }
    
    // Build price string
    let priceStr = '';
    
    if (isDirectGlab) {
        priceStr = priceDirectType === 'ก.3' ? 'กลับ 3' : 'กลับ 6';
    } else {
        priceStr = priceDirect;
    }
    
    if (showTodPrice) {
        if (isTodGlab) {
            priceStr += ' x ' + (priceTodType === 'ก.3' ? 'กลับ 3' : 'กลับ 6');
        } else if (priceTod && /^\d+$/.test(priceTod)) {
            priceStr += ' x ' + priceTod;
        }
    }
    
    // Add entry
    undergroundData.push({
        id: Date.now() + Math.random(),
        type,
        number: number,
        price: priceStr
    });
    
    saveData();
    renderUnderground();
    
    // Clear form
    clearUndergroundForm();
    
    document.getElementById('ugNumber')?.focus();
    showToast('เพิ่มแล้ว');
}

function clearUndergroundForm() {
    const ugNumberEl = document.getElementById('ugNumber');
    const ugPriceDirectEl = document.getElementById('ugPriceDirect');
    const ugPriceTodEl = document.getElementById('ugPriceTod');
    const ugDirectTypeEl = document.getElementById('ugDirectType');
    const ugTodTypeEl = document.getElementById('ugTodType');
    
    if (ugNumberEl) ugNumberEl.value = '';
    if (ugPriceDirectEl) {
        ugPriceDirectEl.value = '';
        ugPriceDirectEl.disabled = false;
        ugPriceDirectEl.classList.remove('bg-gold-50', 'text-black');
    }
    if (ugPriceTodEl) {
        ugPriceTodEl.value = '';
        ugPriceTodEl.disabled = false;
        ugPriceTodEl.classList.remove('bg-gold-50', 'text-black');
    }
    if (ugDirectTypeEl) ugDirectTypeEl.value = '';
    if (ugTodTypeEl) ugTodTypeEl.value = '';
    
    // Reset tod price section if open
    if (showTodPrice) {
        toggleTodPrice();
    }
}

function deleteUnderground(id) {
    if (!confirm('ลบรายการนี้?')) return;
    undergroundData = undergroundData.filter(i => i.id !== id);
    saveData();
    renderUnderground();
    showToast('ลบแล้ว');
}

function renderUnderground() {
    const list = document.getElementById('ugList');
    const count = document.getElementById('ugCount');
    const summary = document.getElementById('ugSummary');
    const totalEl = document.getElementById('ugTotal');
    
    if (undergroundData.length === 0) {
        list.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-400 text-sm mb-2">ยังไม่มีรายการ</p>
                <p class="text-gray-300 text-xs">เลือกประเภท กรอกเลข ราคา แล้วกดเพิ่มรายการ</p>
            </div>
        `;
        count.textContent = '';
        summary.classList.add('hidden');
        return;
    }
    
    count.textContent = `${undergroundData.length} รายการ`;
    
    // Calculate total (only numeric prices)
    let total = 0;
    undergroundData.forEach(item => {
        const prices = item.price.split(' x ');
        prices.forEach(p => {
            const num = parseInt(p);
            if (!isNaN(num)) total += num;
        });
    });
    
    // Show summary
    summary.classList.remove('hidden');
    totalEl.textContent = total.toLocaleString() + ' บาท';
    
    // Determine type class (bon/lang)
    const getTypeClass = (type) => {
        if (type === '2lang' || type === 'runLang') return 'type-lang';
        return 'type-bon';
    };
    
    list.innerHTML = undergroundData.map((item, index) => `
        <div class="list-item cursor-pointer" style="animation-delay: ${index * 0.03}s" onclick="editUnderground(${item.id})">
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
    `).join('');
}

function editUnderground(id) {
    const item = undergroundData.find(i => i.id === id);
    if (!item) return;
    
    // Set type chip
    const typeChips = document.getElementById('ugTypeChips');
    typeChips.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
    typeChips.querySelector(`[data-value="${item.type}"]`)?.classList.add('active');
    document.getElementById('ugType').value = item.type;
    onUgTypeChange();
    
    // Set number
    document.getElementById('ugNumber').value = item.number;
    
    // Parse price (e.g., "100 x 50" or "กลับ 3 x 100")
    const priceParts = item.price.split(' x ');
    document.getElementById('ugPriceDirect').value = priceParts[0] || '';
    
    if (priceParts[1]) {
        if (!showTodPrice) toggleTodPrice();
        document.getElementById('ugPriceTod').value = priceParts[1] || '';
    }
    
    // Delete old entry
    undergroundData = undergroundData.filter(i => i.id !== id);
    saveData();
    renderUnderground();
    
    showToast('แก้ไขรายการ');
}

window.editUnderground = editUnderground;

// Government
function addGovernment() {
    const type = document.getElementById('govType').value;
    const number = document.getElementById('govNumber').value.trim();
    const qty = parseInt(document.getElementById('govQty').value) || 1;
    
    const expectedLen = type === '6' ? 6 : (type === 'front3' || type === 'back3') ? 3 : 2;
    
    if (!number || number.length !== expectedLen || !/^\d+$/.test(number)) {
        showToast(`กรุณากรอกเลข ${expectedLen} หลัก`);
        return;
    }
    
    governmentData.push({ id: Date.now(), type, number, qty });
    saveData();
    renderGovernment();
    document.getElementById('govNumber').value = '';
    document.getElementById('govNumber').focus();
    
    // Reset qty to 1
    const govQtyChips = document.getElementById('govQtyChips');
    if (govQtyChips) {
        govQtyChips.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
        govQtyChips.querySelector('[data-value="1"]').classList.add('active');
        document.getElementById('govQty').value = '1';
    }
    
    showToast('เพิ่มแล้ว');
}

function deleteGovernment(id) {
    if (!confirm('ลบรายการนี้?')) return;
    governmentData = governmentData.filter(i => i.id !== id);
    saveData();
    renderGovernment();
    showToast('ลบแล้ว');
}

function renderGovernment() {
    const list = document.getElementById('govList');
    const count = document.getElementById('govCount');
    
    if (governmentData.length === 0) {
        list.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-400 text-sm mb-2">ยังไม่มีรายการ</p>
                <p class="text-gray-300 text-xs">เลือกประเภท กรอกเลข แล้วกดเพิ่มรายการ</p>
            </div>
        `;
        count.textContent = '';
        return;
    }
    
    count.textContent = `${governmentData.length} รายการ`;
    
    list.innerHTML = governmentData.map((item, index) => `
        <div class="list-item cursor-pointer" style="animation-delay: ${index * 0.03}s" onclick="editGovernment(${item.id})">
            <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-4">
                    <span class="text-3xl font-bold text-gold-700 tracking-widest">${item.number}</span>
                    <span class="text-sm text-gray-500">${typeNames[item.type]}${item.qty > 1 ? ` (${item.qty} ใบ)` : ''}</span>
                </div>
                <button onclick="event.stopPropagation(); deleteGovernment(${item.id})" class="delete-btn">&times;</button>
            </div>
        </div>
    `).join('');
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
    document.getElementById('govNumber').value = item.number;
    
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
    
    document.getElementById('previewModal').classList.remove('hidden');
    document.getElementById('previewDate').textContent = 'วันที่ ' + formatThaiDate(getTodayKey());
}

function closePreviewModal() {
    document.getElementById('previewModal').classList.add('hidden');
}

function selectAll() {
    const data = currentTab === 'underground' ? undergroundData : governmentData;
    selectedItems = new Set(data.map(i => i.id));
    renderSelectionList();
    renderPreview();
}

function selectNone() {
    selectedItems.clear();
    renderSelectionList();
    renderPreview();
}

function toggleItem(id) {
    if (selectedItems.has(id)) {
        selectedItems.delete(id);
    } else {
        selectedItems.add(id);
    }
    renderSelectionList();
    renderPreview();
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
    
    let html = '';
    
    const renderSection = (items, title) => {
        if (!items.length) return '';
        return `
            <div style="margin-bottom:16px;padding:0 16px;">
                <div style="text-align:center;padding:6px 0;border-bottom:1px solid #D4C4A8;margin-bottom:8px;">
                    <span style="color:#6B5A45;font-weight:600;font-size:13px;letter-spacing:0.05em;">${title}</span>
                </div>
                <div style="text-align:center;font-size:13px;color:#5C5C52;">
                    ${items.map(i => `<div style="padding:4px 0;"><b style="color:#6B5A45;">${i.number}</b> = ${i.price}</div>`).join('')}
                </div>
            </div>
        `;
    };
    
    html += renderSection(groups['3bon'], '3 ตัวบน');
    html += renderSection(groups['2bon'], '2 ตัวบน');
    html += renderSection(groups['2lang'], '2 ตัวล่าง');
    html += renderSection(groups['runBon'], 'วิ่งบน');
    html += renderSection(groups['runLang'], 'วิ่งล่าง');
    
    container.innerHTML = html;
}

function renderGovernmentPreview(data, container) {
    const groups = {
        '6': data.filter(i => i.type === '6'),
        'front3': data.filter(i => i.type === 'front3'),
        'back3': data.filter(i => i.type === 'back3'),
        'back2': data.filter(i => i.type === 'back2')
    };
    
    let html = '';
    
    const sections = [
        { key: '6', title: '6 ตัวตรง' },
        { key: 'front3', title: 'เลขหน้า 3 ตัว' },
        { key: 'back3', title: 'เลขท้าย 3 ตัว' },
        { key: 'back2', title: 'เลขท้าย 2 ตัว' }
    ];
    
    sections.forEach(sec => {
        if (groups[sec.key].length) {
            html += `
                <div style="margin-bottom:16px;padding:0 16px;">
                    <div style="text-align:center;padding:6px 0;border-bottom:1px solid #D4C4A8;margin-bottom:8px;">
                        <span style="color:#6B5A45;font-weight:600;font-size:13px;letter-spacing:0.05em;">${sec.title}</span>
                    </div>
                    <div style="text-align:center;font-size:13px;color:#5C5C52;">
                        ${groups[sec.key].map(i => `<div style="padding:4px 0;"><b style="color:#6B5A45;">${i.number}</b>${i.qty > 1 ? ` (${i.qty} ใบ)` : ''}</div>`).join('')}
                    </div>
                </div>
            `;
        }
    });
    
    container.innerHTML = html;
}

// Save image
async function saveImage() {
    if (selectedItems.size === 0) {
        showToast('กรุณาเลือกรายการ');
        return;
    }
    
    const preview = document.getElementById('a4Preview');
    const saveBtn = document.querySelector('[onclick="saveImage()"]');
    
    // Show loading
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="animate-pulse">กำลังสร้างรูป...</span>';
    }
    
    try {
        // Small delay for UI update
        await new Promise(r => setTimeout(r, 100));
        
        const canvas = await html2canvas(preview, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false
        });
        
        const dataUrl = canvas.toDataURL('image/png');
        const fileName = `JodHuay_${currentTab === 'underground' ? 'ใต้ดิน' : 'รัฐบาล'}_${getTodayKey()}.png`;
        
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        // iOS: ใช้ Web Share API เท่านั้น
        if (isIOS && navigator.share && navigator.canShare) {
            try {
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], fileName, { type: 'image/png' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ 
                        files: [file],
                        title: 'JodHuay - จดหวย'
                    });
                    showToast('บันทึกแล้ว');
                }
            } catch (e) {
                // User cancelled - ไม่ต้องทำอะไร
                if (e.name !== 'AbortError') {
                    showToast('เกิดข้อผิดพลาด');
                }
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
        showToast('บันทึกแล้ว');
        closePreviewModal();
        
    } catch (e) {
        console.error('Save image error:', e);
        showToast('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
        // Reset button
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'บันทึกรูปภาพ';
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
    if (!confirm('ล้างข้อมูลทั้งหมด?')) return;
    
    if (currentTab === 'underground') undergroundData = [];
    else governmentData = [];
    
    saveData();
    renderAll();
    showToast('ล้างแล้ว');
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = msg;
    toast.classList.add('toast-show');
    setTimeout(() => toast.classList.remove('toast-show'), 2000);
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
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
    const data = currentTab === 'underground' ? undergroundData : governmentData;
    const selected = data.filter(i => selectedItems.has(i.id));
    
    if (selected.length === 0) {
        showToast('กรุณาเลือกรายการ');
        return;
    }
    
    let text = `JODHUAY - จดหวย\n`;
    text += `วันที่ ${formatThaiDate(getTodayKey())}\n`;
    text += `─────────────\n`;
    
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
                });
            }
        });
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
    }
    
    text += `\n─────────────\n`;
    text += `ขอให้โชคดี!`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
        showToast('คัดลอกแล้ว');
    }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('คัดลอกแล้ว');
    });
}

window.copyAsText = copyAsText;


// ============================================
// CUSTOM NUMPAD
// ============================================

let numpadTarget = null;
let numpadValue = '';
let numpadMaxLength = 6;
let numpadCallback = null;

function openNumpad(targetId, label, maxLen, callback) {
    numpadTarget = targetId;
    numpadValue = document.getElementById(targetId)?.value || '';
    numpadMaxLength = maxLen;
    numpadCallback = callback;
    
    // สร้าง placeholder ตามจำนวนหลัก
    const placeholder = '_'.repeat(maxLen);
    document.getElementById('numpadValue').textContent = numpadValue || placeholder;
    document.getElementById('numpadLabel').textContent = label;
    document.getElementById('numpadOverlay').classList.remove('hidden');
}

function closeNumpad() {
    document.getElementById('numpadOverlay').classList.add('hidden');
    numpadTarget = null;
    numpadValue = '';
    numpadCallback = null;
}

function numpadPress(num) {
    if (numpadValue.length >= numpadMaxLength) return;
    numpadValue += num;
    document.getElementById('numpadValue').textContent = numpadValue;
    
    // Vibrate feedback
    if (navigator.vibrate) navigator.vibrate(10);
}

function numpadClear() {
    numpadValue = '';
    const placeholder = '_'.repeat(numpadMaxLength);
    document.getElementById('numpadValue').textContent = placeholder;
    if (navigator.vibrate) navigator.vibrate(20);
}

function numpadBackspace() {
    numpadValue = numpadValue.slice(0, -1);
    const placeholder = '_'.repeat(numpadMaxLength);
    document.getElementById('numpadValue').textContent = numpadValue || placeholder;
    if (navigator.vibrate) navigator.vibrate(10);
}

function confirmNumpad() {
    if (numpadTarget) {
        document.getElementById(numpadTarget).value = numpadValue;
    }
    if (numpadCallback) {
        numpadCallback(numpadValue);
    }
    closeNumpad();
}

// Make numpad functions global
window.openNumpad = openNumpad;
window.closeNumpad = closeNumpad;
window.numpadPress = numpadPress;
window.numpadClear = numpadClear;
window.numpadBackspace = numpadBackspace;
window.confirmNumpad = confirmNumpad;
