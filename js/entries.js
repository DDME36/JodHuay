// Entry forms and saved lists for government and underground lotteries (add/edit/delete/render).
import { state, typeNames } from './state.js';
import { escapeHtml, generateUniqueId, getNumberLength, getTabData, getTabName, showCustomConfirm, showToast, syncNumberInputReadonly, usesCustomNumpad, vibrate } from './utils.js';
import { animateValue, showConfetti } from './motion.js';
import { calculateAmountFromPrice, saveData } from './storage.js';
import { openGovNumpad, openUgNumpad } from './numpad.js';

// Update readonly state for inputs based on platform
export function updateInputReadonlyState() {
    syncNumberInputReadonly(document.getElementById('govNumber'));
    syncNumberInputReadonly(document.getElementById('ugNumber'));
}

// Setup Choice Chips
export function setupChoiceChips() {
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

// จัดการ input ตามแพลตฟอร์ม
export function handleNumberInput(inputId) {
    try {
        const input = document.getElementById(inputId);
        if (!input) {
            console.warn('Input element not found:', inputId);
            return;
        }

        // iOS หรือ Mobile: บังคับใช้ numpad เสมอ
        if (usesCustomNumpad()) {
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
export function handleKeyPress(event, type) {
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
export function formatNumberInput(input) {
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

// ตั้งค่าช่องกรอกเลข: เผื่อ maxLength สำหรับช่องว่าง และล็อกคีย์บอร์ดบนมือถือ
export function setupNumberInputs() {
    [['govNumber', 6], ['ugNumber', 3]].forEach(([id, fallbackLength]) => {
        const input = document.getElementById(id);
        if (!input) return;
        const realMaxLength = input.maxLength > 0 ? input.maxLength : fallbackLength;
        input.setAttribute('data-max-length', realMaxLength);
        input.maxLength = realMaxLength * 2 - 1;
        syncNumberInputReadonly(input);
        input.addEventListener('input', () => formatNumberInput(input));
    });
}

// Toggle Tod Price field
export function toggleTodPrice() {
    state.showTodPrice = !state.showTodPrice;
    const section = document.getElementById('todPriceSection');
    const btn = document.getElementById('addTodBtn');
    const copyBtn = document.getElementById('copyPriceBtn');

    if (!section || !btn) return;

    btn.setAttribute('aria-expanded', String(state.showTodPrice));
    if (state.showTodPrice) {
        section.classList.remove('hidden');
        btn.textContent = '− ไม่ใส่โต๊ด';
        const isGlab = Boolean(document.getElementById('ugTodType')?.value);
        if (copyBtn) copyBtn.classList.toggle('hidden', isGlab);
    } else {
        section.classList.add('hidden');
        btn.textContent = '+ เพิ่มโต๊ด';
        if (copyBtn) copyBtn.classList.add('hidden');
        setTodType('');
    }
}

// Copy price from เต็ง to โต๊ด
export function copyPriceToTod() {
    const directInput = document.getElementById('ugPriceDirect');
    const directPrice = directInput?.value;

    if (!directPrice) {
        showToast('กรุณากรอกราคาเต็งก่อน');
        return;
    }

    // เปิดช่องโต๊ดถ้ายังไม่เปิด
    if (!state.showTodPrice) toggleTodPrice();

    // Copy ค่า
    const todInput = document.getElementById('ugPriceTod');
    if (todInput) todInput.value = directPrice;

    // สั่นนิดนึง
    vibrate(50);

    showToast('คัดลอกราคาแล้ว');
}

// Handle กลับ selection in Tod field
const GLAB_SETS = { 'ก.3': 3, 'ก.6': 6 };

// เลือกแบบโต๊ด: '' = โต๊ดเป็นเงิน, 'ก.3'/'ก.6' = กลับ 3/กลับ 6 (คิดเงิน = เต็ง × ชุด)
export function setTodType(value = '') {
    const type = value in GLAB_SETS ? value : '';
    const hidden = document.getElementById('ugTodType');
    const input = document.getElementById('ugPriceTod');
    if (!hidden || !input) return;
    hidden.value = type;

    document.querySelectorAll('#todTypeChips [data-action="setTodType"]').forEach(chip => {
        const active = (chip.dataset.arg || '') === type;
        chip.classList.toggle('active', active);
        chip.setAttribute('aria-pressed', String(active));
    });

    const sets = GLAB_SETS[type];
    const hint = document.getElementById('todGlabHint');
    document.getElementById('todPriceField')?.classList.toggle('hidden', Boolean(sets));
    document.getElementById('copyPriceBtn')?.classList.toggle('hidden', Boolean(sets) || !state.showTodPrice);
    if (hint) {
        hint.classList.toggle('hidden', !sets);
        hint.textContent = sets ? `ซื้อทุกการสลับเลข ${sets} ชุด · คิดเงิน = ราคาเต็ง × ${sets}` : '';
    }

    // ค่าในช่องโต๊ดใช้ตอนบันทึก: "กลับ 3"/"กลับ 6" หรือราคาเป็นตัวเลข
    input.value = sets ? `กลับ ${sets}` : '';
    input.disabled = Boolean(sets);
}

export function onTodGlabChange() {
    setTodType(document.getElementById('ugTodType')?.value);
}

// Underground type change
export function onUgTypeChange() {
    try {
        const type = document.getElementById('ugType')?.value;
        const input = document.getElementById('ugNumber');
        
        if (!type || !input) {
            console.warn('onUgTypeChange: missing type or input');
            return;
        }

        applyNumberInputLength(input, getNumberLength('underground', type));
    } catch (error) {
        console.error('onUgTypeChange error:', error);
    }
}

// Government type change
export function onGovTypeChange() {
    try {
        const type = document.getElementById('govType')?.value;
        const input = document.getElementById('govNumber');
        
        if (!type || !input) {
            console.warn('onGovTypeChange: missing type or input');
            return;
        }
        
        applyNumberInputLength(input, getNumberLength('government', type));
    } catch (error) {
        console.error('onGovTypeChange error:', error);
    }
}

// ปรับช่องกรอกเลขตามจำนวนหลัก (เช่น 3 หลัก → placeholder "_ _ _")
export function applyNumberInputLength(input, realMaxLength) {
    input.placeholder = Array(realMaxLength).fill('_').join(' ');
    input.setAttribute('data-max-length', realMaxLength);
    // ตั้ง maxLength ให้มากพอสำหรับช่องว่าง
    input.maxLength = realMaxLength * 2 - 1;
    input.value = '';
    syncNumberInputReadonly(input);
}

// เปลี่ยนสถานะ "กำลังแก้ไข" และปุ่มในฟอร์มให้ตรงกัน
export function setEditing(tab, id) {
    state.editingIds[tab] = id;
    const prefix = tab === 'underground' ? 'ug' : 'gov';
    const addBtn = document.getElementById(`${prefix}AddBtn`);
    if (addBtn) addBtn.textContent = id ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ';
    document.getElementById(`${prefix}CancelEditBtn`)?.classList.toggle('hidden', !id);
}

export function cancelEdit(tab) {
    if (!state.editingIds[tab]) return;
    setEditing(tab, null);
    if (tab === 'underground') {
        clearUndergroundForm();
        renderUnderground();
    } else {
        const numberInput = document.getElementById('govNumber');
        if (numberInput) numberInput.value = '';
        renderGovernment();
    }
    showToast('ยกเลิกการแก้ไขแล้ว');
}

// บันทึกรายการใหม่ หรือแทนที่รายการที่กำลังแก้ไขในตำแหน่งเดิม
export function upsertEntry(tab, entry) {
    const data = getTabData(tab);
    const index = data.findIndex(item => item.id === state.editingIds[tab]);
    setEditing(tab, null);
    if (index === -1) {
        data.push({ id: generateUniqueId(), ...entry });
        return false;
    }
    data[index] = { ...data[index], ...entry };
    return true;
}

// Add underground
export function addUnderground() {
    const type = document.getElementById('ugType')?.value;
    const numberRaw = document.getElementById('ugNumber')?.value.trim();
    // ลบช่องว่างออก (กรณีพิมพ์บน Desktop)
    const number = numberRaw.replace(/\s/g, '');
    const priceDirectInput = document.getElementById('ugPriceDirect');
    const priceTodInput = document.getElementById('ugPriceTod');
    const todTypeSelect = document.getElementById('ugTodType');

    // Validate number length
    const expectedLen = getNumberLength('underground', type);

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
    if (state.showTodPrice) {
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
        const updated = upsertEntry('underground', { type, number, price: priceStr, amount });

        saveData();
        renderUnderground();

        // Success feedback: vibrate-pause-vibrate
        vibrate([50, 30, 50]);

        clearUndergroundForm();
        showConfetti();
        showToast(updated ? '✓ แก้ไขแล้ว' : '✓ เพิ่มแล้ว');
    } catch (error) {
        console.error('Add underground error:', error);
        showToast('⚠️ ไม่สามารถเพิ่มรายการได้');
    }
}

export function clearUndergroundForm() {
    try {
        const ugNumberEl = document.getElementById('ugNumber');
        const ugPriceDirectEl = document.getElementById('ugPriceDirect');

        // เคลียร์เลข
        if (ugNumberEl) {
            ugNumberEl.value = '';
            syncNumberInputReadonly(ugNumberEl);
        }

        // เคลียร์ราคาเต็ง
        if (ugPriceDirectEl) {
            ugPriceDirectEl.value = '';
            ugPriceDirectEl.disabled = false;
            ugPriceDirectEl.classList.remove('glab-locked');
        }

        // รีเซ็ตแบบโต๊ดกลับเป็น "โต๊ด" และล้างราคาโต๊ด
        setTodType('');

        // Reset tod price section if open
        if (state.showTodPrice) {
            toggleTodPrice();
        }
    } catch (error) {
        console.error('clearUndergroundForm error:', error);
    }
}

export function deleteEntry(tab, id) {
    try {
        const index = getTabData(tab).findIndex(i => i.id === id);
        const item = getTabData(tab)[index];
        if (!item) {
            console.warn('deleteEntry: item not found', tab, id);
            return;
        }

        if (tab === 'underground') {
            state.undergroundData = state.undergroundData.filter(i => i.id !== id);
        } else {
            state.governmentData = state.governmentData.filter(i => i.id !== id);
        }
        if (state.editingIds[tab] === id) setEditing(tab, null);
        saveData();
        renderAll();

        // ลบทันทีแต่ให้กดเลิกทำได้ เผื่อเผลอแตะ × หรือปัดโดนรายการ
        showToast(`ลบ "${item.number}" แล้ว`, {
            actionLabel: 'เลิกทำ',
            onAction: () => restoreEntry(tab, item, index)
        });
        vibrate(50);
    } catch (error) {
        console.error('deleteEntry error:', error);
        showToast('⚠️ ไม่สามารถลบรายการได้');
    }
}

function restoreEntry(tab, item, index) {
    const data = getTabData(tab);
    if (data.some(i => i.id === item.id)) return;
    data.splice(Math.min(index, data.length), 0, item);
    saveData();
    renderAll();
    showToast(`นำ "${item.number}" กลับมาแล้ว`);
}

export function deleteUnderground(id) {
    deleteEntry('underground', id);
}

export function bindListItemActions(list, editHandler, deleteHandler) {
    list.querySelectorAll('[data-item-id]').forEach(element => {
        const id = element.dataset.itemId;
        element.addEventListener('click', () => editHandler(id));
        element.addEventListener('keydown', event => {
            if (event.target !== element || (event.key !== 'Enter' && event.key !== ' ')) return;
            event.preventDefault();
            editHandler(id);
        });

        const deleteButton = element.querySelector('[data-delete-item]');
        if (deleteButton) {
            deleteButton.addEventListener('click', event => {
                event.stopPropagation();
                deleteHandler(id);
            });
        }
    });
}

export function renderUnderground() {
    try {
        const list = document.getElementById('ugList');
        const count = document.getElementById('ugCount');
        const summary = document.getElementById('ugSummary');
        const totalEl = document.getElementById('ugTotal');
        const searchBar = document.getElementById('ugSearchBar');

        if (!list || !count || !summary || !totalEl) {
            console.error('renderUnderground: Required elements not found');
            return;
        }

        if (state.undergroundData.length === 0) {
        list.innerHTML = getEnhancedEmptyState('underground');
        count.textContent = '';
        summary.classList.add('hidden');
        if (searchBar) searchBar.classList.add('hidden');

        return;
    }

    // Show search bar if more than 3 items
    if (searchBar) {
        if (state.undergroundData.length > 3) {
            searchBar.classList.remove('hidden');
        } else {
            searchBar.classList.add('hidden');
        }
    }

    // Filter by type and search
    const searchInput = document.getElementById('ugSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    let filteredData = state.undergroundData;

    // Filter by type
    if (state.currentFilter !== 'all') {
        filteredData = filteredData.filter(item => item.type === state.currentFilter);
    }

    // Filter by search
    if (searchTerm) {
        filteredData = filteredData.filter(item =>
            item.number.includes(searchTerm) ||
            typeNames[item.type].toLowerCase().includes(searchTerm) ||
            item.price.toLowerCase().includes(searchTerm)
        );
    }

    count.textContent = `${filteredData.length}/${state.undergroundData.length} รายการ`;

    const total = getUndergroundTotal(state.undergroundData);

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
        const isNewest = index === filteredData.length - 1 && !searchTerm && state.currentFilter === 'all';
        const escapedNumber = escapeHtml(item.number);
        const escapedTypeName = escapeHtml(typeNames[item.type] || '');
        const escapedPrice = escapeHtml(item.price);
        const editingClass = item.id === state.editingIds.underground ? ' is-editing' : '';
        return `
        <div class="list-item cursor-pointer ${isNewest ? 'new-entry' : 'fade-in'}${editingClass}" style="animation-delay: ${index * 0.03}s" data-item-id="${escapeHtml(String(item.id))}" tabindex="0" aria-label="แก้ไขเลข ${escapedNumber}">
            <div class="saved-entry-row">
                <div class="saved-entry-main">
                    <span class="saved-entry-number text-3xl font-bold text-gold-700">${escapedNumber}</span>
                    <div class="saved-entry-meta text-left">
                        <span class="${getTypeClass(item.type)}">${escapedTypeName}</span>
                    </div>
                    <div class="saved-entry-value">
                        <small>ราคา</small>
                        <strong>${escapedPrice}</strong>
                    </div>
                </div>
                <button type="button" data-delete-item class="delete-btn" aria-label="ลบเลข ${escapedNumber}">&times;</button>
            </div>
        </div>
    `}).join('');
    bindListItemActions(list, editUnderground, deleteUnderground);
    } catch (error) {
        console.error('renderUnderground error:', error);
        const list = document.getElementById('ugList');
        if (list) {
            list.innerHTML = '<p class="text-red-500 text-center py-6 text-sm">⚠️ เกิดข้อผิดพลาดในการแสดงผล</p>';
        }
    }
}

export function getUndergroundTotal(items) {
    return items.reduce((sum, item) => sum + (Number(item.amount) || calculateAmountFromPrice(item.price)), 0);
}

export function editUnderground(id) {
    try {
        const item = state.undergroundData.find(i => i.id === id);
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
            syncNumberInputReadonly(numberInput);
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
            if (!state.showTodPrice) toggleTodPrice();

            const todValue = priceParts[1].trim();
            if (todValue === 'กลับ 3') {
                setTodType('ก.3');
            } else if (todValue === 'กลับ 6') {
                setTodType('ก.6');
            } else {
                setTodType('');
                const todInput = document.getElementById('ugPriceTod');
                if (todInput) todInput.value = todValue;
            }
        }

        setEditing('underground', id);
        renderUnderground();

        showToast(`กำลังแก้ไข "${item.number}"`);
    } catch (error) {
        console.error('Edit underground error:', error);
        showToast('⚠️ ไม่สามารถแก้ไขรายการได้');
    }
}

// Government
export function addGovernment() {
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

        const expectedLen = getNumberLength('government', type);

        if (!number || number.length !== expectedLen || !/^\d+$/.test(number)) {
            showToast(`กรุณากรอกเลข ${expectedLen} หลัก`);
            return;
        }

        if (isNaN(qty) || qty <= 0) {
            showToast('จำนวนใบไม่ถูกต้อง');
            return;
        }

        const updated = upsertEntry('government', { type, number, qty });
        saveData();
        renderGovernment();

        const numberInput = document.getElementById('govNumber');
        if (numberInput) {
            numberInput.value = '';
            syncNumberInputReadonly(numberInput);
            if (!usesCustomNumpad()) numberInput.focus();
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

        vibrate([50, 30, 50]);
        showConfetti();
        showToast(updated ? '✓ แก้ไขแล้ว' : '✓ เพิ่มแล้ว');
    } catch (error) {
        console.error('Add government error:', error);
        showToast('⚠️ ไม่สามารถเพิ่มรายการได้');
    }
}

export function deleteGovernment(id) {
    deleteEntry('government', id);
}

export function renderGovernment() {
    try {
        const list = document.getElementById('govList');
        const count = document.getElementById('govCount');
        const searchBar = document.getElementById('govSearchBar');

        if (!list || !count) {
            console.error('renderGovernment: Required elements not found');
            return;
        }

        if (state.governmentData.length === 0) {
            list.innerHTML = getEnhancedEmptyState('government');
            count.textContent = '';
            if (searchBar) searchBar.classList.add('hidden');
            return;
        }

        // Show search bar if more than 3 items
        if (searchBar) {
            if (state.governmentData.length > 3) {
                searchBar.classList.remove('hidden');
            } else {
                searchBar.classList.add('hidden');
            }
        }

        // Filter by search
        const searchInput = document.getElementById('govSearchInput');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

        let filteredData = state.governmentData;
        if (searchTerm) {
            filteredData = state.governmentData.filter(item =>
                item.number.includes(searchTerm) ||
            typeNames[item.type].toLowerCase().includes(searchTerm)
        );
    }

    count.textContent = `${filteredData.length}/${state.governmentData.length} รายการ`;

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
        const escapedNumber = escapeHtml(item.number);
        const escapedTypeName = escapeHtml(typeNames[item.type] || '');
        const editingClass = item.id === state.editingIds.government ? ' is-editing' : '';
        return `
        <div class="list-item cursor-pointer ${isNewest ? 'new-entry' : 'fade-in'}${editingClass}" style="animation-delay: ${index * 0.03}s" data-item-id="${escapeHtml(String(item.id))}" tabindex="0" aria-label="แก้ไขเลข ${escapedNumber}">
            <div class="saved-entry-row">
                <div class="saved-entry-main saved-entry-main-government">
                    <span class="saved-entry-number text-3xl font-bold text-gold-700">${escapedNumber}</span>
                    <span class="saved-entry-government-type text-sm text-gray-500">${escapedTypeName}</span>
                    <div class="saved-entry-value">
                        <small>จำนวน</small>
                        <strong>${parseInt(item.qty, 10)} ใบ</strong>
                    </div>
                </div>
                <button type="button" data-delete-item class="delete-btn" aria-label="ลบเลข ${escapedNumber}">&times;</button>
            </div>
        </div>
    `}).join('');
    bindListItemActions(list, editGovernment, deleteGovernment);
    } catch (error) {
        console.error('renderGovernment error:', error);
        const list = document.getElementById('govList');
        if (list) {
            list.innerHTML = '<p class="text-red-500 text-center py-6 text-sm">⚠️ เกิดข้อผิดพลาดในการแสดงผล</p>';
        }
    }
}

export function editGovernment(id) {
    const item = state.governmentData.find(i => i.id === id);
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
        syncNumberInputReadonly(numberInput);
    }

    // Set qty chip
    const qtyChips = document.getElementById('govQtyChips');
    qtyChips.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
    qtyChips.querySelector(`[data-value="${item.qty}"]`)?.classList.add('active');
    document.getElementById('govQty').value = item.qty;

    setEditing('government', id);
    renderGovernment();

    showToast(`กำลังแก้ไข "${item.number}"`);
}

export function renderAll() {
    renderUnderground();
    renderGovernment();
}

// Clear data
export async function clearData() {
    const data = getTabData();
    const tabName = getTabName();
    if (!data.length) {
        showToast('ไม่มีรายการ');
        return;
    }

    const confirmed = await showCustomConfirm({
        title: `ล้างรายการหวย${tabName}`,
        message: `คุณแน่ใจหรือไม่ว่าต้องการลบรายการหวย${tabName}ทั้งหมด (${data.length} รายการ)?`,
        icon: 'trash',
        confirmText: 'ลบทั้งหมด',
        cancelText: 'ยกเลิก',
        isDanger: true
    });

    if (!confirmed) return;

    if (state.currentTab === 'underground') state.undergroundData = [];
    else state.governmentData = [];
    setEditing(state.currentTab, null);

    saveData();
    renderAll();
    vibrate([100, 50, 100]);
    showToast('ล้างข้อมูลแล้ว');
}

// Filter state

// Filter underground by type
export function filterByType(type) {
    state.currentFilter = type;

    // Update active chip
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
        if (chip.dataset.filter === type) {
            chip.classList.add('active');
        }
    });

    renderUnderground();
    vibrate(30);
}

// ============================================
// SWIPE TO DELETE
// ============================================

export function setupSwipeToDelete() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let currentElement = null;

    document.addEventListener('touchstart', (e) => {
        const listItem = e.target.closest('.list-item');
        if (listItem && !e.target.closest('[data-delete-item]')) {
            currentElement = listItem;
            touchStartX = touchEndX = e.changedTouches[0].clientX;
            touchStartY = e.changedTouches[0].clientY;
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (currentElement) {
            const touch = e.changedTouches[0];
            // เลื่อนแนวตั้ง (scroll) ไม่นับเป็นการปัดลบ
            if (Math.abs(touch.clientY - touchStartY) > Math.abs(touch.clientX - touchStartX)) {
                currentElement.style.transform = 'translateX(0)';
                currentElement.style.opacity = '1';
                currentElement = null;
                return;
            }
            touchEndX = touch.clientX;
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
                const swipedElement = currentElement;
                swipedElement.style.transform = 'translateX(-100%)';
                swipedElement.style.opacity = '0';

                setTimeout(() => swipedElement.querySelector('.delete-btn')?.click(), 300);
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
// ENHANCED EMPTY STATE
// ============================================

export function getEnhancedEmptyState(type) {
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
