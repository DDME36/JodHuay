// Optional slip header (customer, receiver, draw date) and Thai lottery draw-date helpers.
import { SLIP_META_KEY, state } from './state.js';
import { getLocalDateValue, showCustomConfirm, showToast, vibrate } from './utils.js';

export function sanitizeSlipMeta(value) {
    const meta = value && typeof value === 'object' ? value : {};
    const cleanText = input => typeof input === 'string' ? input.trim().slice(0, 60) : '';
    const drawDate = typeof meta.drawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(meta.drawDate)
        ? meta.drawDate
        : '';

    return {
        owner: cleanText(meta.owner),
        receiver: cleanText(meta.receiver),
        drawDate
    };
}

export function loadSlipMeta() {
    try {
        const stored = localStorage.getItem(SLIP_META_KEY);
        state.slipMeta = sanitizeSlipMeta(stored ? JSON.parse(stored) : null);
    } catch (error) {
        console.warn('Unable to load slip information:', error);
        state.slipMeta = sanitizeSlipMeta(null);
    }
}

export function saveSlipMeta() {
    try {
        state.slipMeta = sanitizeSlipMeta(state.slipMeta);
        localStorage.setItem(SLIP_META_KEY, JSON.stringify(state.slipMeta));
    } catch (error) {
        console.warn('Unable to save slip information:', error);
        showToast('⚠️ ไม่สามารถบันทึกข้อมูลโพยได้');
    }
}

export function setupSlipMeta() {
    const fields = {
        owner: document.getElementById('slipOwner'),
        receiver: document.getElementById('slipReceiver'),
        drawDate: document.getElementById('slipDrawDate')
    };

    Object.entries(fields).forEach(([key, element]) => {
        if (!element) return;
        element.value = state.slipMeta[key] || '';
        element.addEventListener('input', () => {
            state.slipMeta[key] = element.value;
            saveSlipMeta();
            updateSlipMetaStatus();
            updateSlipMetaSummary();
            renderPreviewMeta();
            if (key === 'drawDate') renderLotteryDrawDateChoices();
        });
    });
    updateSlipMetaSummary();
    renderLotteryDrawDateChoices();
}

export function updateSlipMetaStatus() {
    const status = document.getElementById('slipMetaStatus');
    if (!status) return;
    status.textContent = 'บันทึกแล้ว';
    clearTimeout(updateSlipMetaStatus.timer);
    updateSlipMetaStatus.timer = setTimeout(() => {
        status.textContent = 'บันทึกอัตโนมัติในเครื่องนี้';
    }, 1200);
}

export function updateSlipMetaSummary() {
    const summary = document.getElementById('slipMetaSummary');
    const card = document.getElementById('slipMetaCard');
    if (!summary || !card) return;

    const parts = [];
    if (state.slipMeta.owner) parts.push(state.slipMeta.owner);
    if (state.slipMeta.receiver) parts.push(`ส่งให้ ${state.slipMeta.receiver}`);
    if (state.slipMeta.drawDate) parts.push(formatSlipDate(state.slipMeta.drawDate));

    summary.textContent = parts.length ? parts.join(' · ') : 'ไม่บังคับ · แตะเมื่อต้องการใช้';
    card.classList.toggle('has-data', parts.length > 0);
}

export function toggleSlipMeta(forceOpen) {
    const card = document.getElementById('slipMetaCard');
    const toggle = document.getElementById('slipMetaToggle');
    const panel = document.getElementById('slipMetaPanel');
    if (!card || !toggle || !panel) return;

    const shouldOpen = typeof forceOpen === 'boolean'
        ? forceOpen
        : !card.classList.contains('is-open');

    card.classList.toggle('is-open', shouldOpen);
    card.classList.toggle('is-collapsed', !shouldOpen);
    toggle.setAttribute('aria-expanded', String(shouldOpen));
    panel.setAttribute('aria-hidden', String(!shouldOpen));
    panel.inert = !shouldOpen;
}

export function getThaiLotteryDrawDates(referenceDate = new Date()) {
    const referenceYear = Number(getLocalDateValue(referenceDate).slice(0, 4));
    const dates = new Set();

    for (let year = referenceYear - 1; year <= referenceYear + 1; year += 1) {
        for (let month = 0; month < 12; month += 1) {
            // Official recurring exceptions: New Year, National Teacher's Day, and Labour Day.
            if (month === 0) dates.add(`${year - 1}-12-30`);
            else dates.add(`${year}-${String(month + 1).padStart(2, '0')}-${month === 4 ? '02' : '01'}`);

            dates.add(`${year}-${String(month + 1).padStart(2, '0')}-${month === 0 ? '17' : '16'}`);
        }
    }

    return [...dates].sort();
}

export function getThaiLotteryDrawSuggestions(referenceDate = new Date()) {
    const today = getLocalDateValue(referenceDate);
    const dates = getThaiLotteryDrawDates(referenceDate);
    const previous = dates.filter(value => value <= today).at(-1) || '';
    const next = dates.find(value => value > today) || '';
    return { today, previous, next, isDrawDay: previous === today };
}

export function formatThaiDrawDateCompact(value) {
    if (!value) return '—';
    const date = new Date(`${value}T12:00:00+07:00`);
    return new Intl.DateTimeFormat('th-TH', {
        day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Asia/Bangkok'
    }).format(date);
}

export function renderLotteryDrawDateChoices(referenceDate = new Date()) {
    const choices = getThaiLotteryDrawSuggestions(referenceDate);
    const configs = [
        { key: 'previous', button: document.getElementById('drawDatePrevious'), text: document.getElementById('drawDatePreviousText') },
        { key: 'next', button: document.getElementById('drawDateNext'), text: document.getElementById('drawDateNextText') }
    ];

    configs.forEach(({ key, button, text }) => {
        if (!button || !text) return;
        const value = choices[key];
        button.dataset.value = value;
        button.classList.toggle('active', Boolean(value) && state.slipMeta.drawDate === value);
        button.setAttribute('aria-pressed', String(Boolean(value) && state.slipMeta.drawDate === value));
        button.disabled = !value;
        text.textContent = formatThaiDrawDateCompact(value);
    });

    const previousLabel = document.querySelector('#drawDatePrevious > span');
    if (previousLabel) previousLabel.textContent = choices.isDrawDay ? 'งวดวันนี้' : 'งวดล่าสุด';
    updateSlipDrawDateDisplay();
}

export function updateSlipDrawDateDisplay() {
    const display = document.getElementById('slipDrawDateDisplay');
    if (!display) return;
    if (state.slipMeta.drawDate) {
        display.textContent = formatSlipDate(state.slipMeta.drawDate);
        display.classList.remove('text-gray-400');
        display.classList.add('text-gold-700');
    } else {
        display.textContent = 'ไม่ระบุงวด';
        display.classList.remove('text-gold-700');
        display.classList.add('text-gray-400');
    }
}

export function setSlipDrawDate(value) {
    const input = document.getElementById('slipDrawDate');
    if (!input) return;
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    input.value = value || '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vibrate(8);
}

export function selectSuggestedDrawDate(kind) {
    if (!['previous', 'next'].includes(kind)) return;
    const button = document.getElementById(kind === 'previous' ? 'drawDatePrevious' : 'drawDateNext');
    const targetValue = button?.dataset.value || '';
    if (state.slipMeta.drawDate === targetValue) {
        setSlipDrawDate('');
    } else {
        setSlipDrawDate(targetValue);
    }
}

export function setSlipDateToday() {
    setSlipDrawDate(getLocalDateValue());
}

export async function clearSlipMeta() {
    if (!state.slipMeta.owner && !state.slipMeta.receiver && !state.slipMeta.drawDate) {
        showToast('ยังไม่มีข้อมูลเสริม');
        return;
    }
    const confirmed = await showCustomConfirm({
        title: 'ล้างข้อมูลเสริม',
        message: 'คุณต้องการล้างชื่อผู้จด ชื่อแม่ค้า และงวดวันที่หรือไม่?',
        icon: 'broom',
        confirmText: 'ล้างข้อมูล',
        cancelText: 'ยกเลิก',
        isDanger: true
    });
    if (!confirmed) return;

    state.slipMeta = { owner: '', receiver: '', drawDate: '' };
    saveSlipMeta();
    setupSlipMetaValues();
    updateSlipMetaStatus();
    showToast('ล้างข้อมูลเสริมแล้ว');
}

export function openThaiDatePicker() {
    const input = document.getElementById('slipDrawDate');
    if (!input) return;
    try {
        if (typeof input.showPicker === 'function') {
            input.showPicker();
        } else {
            input.focus();
            input.click();
        }
    } catch {
        input.focus();
        input.click();
    }
}

export function formatSlipDate(value) {
    if (!value) return '';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('th-TH', {
        day: 'numeric', month: 'long', year: 'numeric'
    }).format(date);
}

export function getSlipTextHeader(tab = state.currentTab) {
    const lines = [`รายการหวย${tab === 'underground' ? 'ใต้ดิน' : 'รัฐบาล'}`];
    if (state.slipMeta.owner) lines.push(`ชื่อลูกค้า: ${state.slipMeta.owner}`);
    if (state.slipMeta.receiver) lines.push(`ส่งให้: ${state.slipMeta.receiver}`);
    if (state.slipMeta.drawDate) lines.push(`งวดวันที่: ${formatSlipDate(state.slipMeta.drawDate)}`);
    return lines.join('\n');
}

export function getSlipFileName(tab = state.currentTab) {
    const type = tab === 'underground' ? 'ใต้ดิน' : 'รัฐบาล';
    const owner = state.slipMeta.owner
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 24);
    const parts = ['JodHuay', type];
    if (owner) parts.push(owner);
    if (state.slipMeta.drawDate) parts.push(state.slipMeta.drawDate);
    return `${parts.join('_')}.png`;
}

export function renderPreviewMeta() {
    const title = document.getElementById('previewLotteryTitle');
    const wrapper = document.getElementById('previewSlipMeta');
    const owner = document.getElementById('previewOwner');
    const receiver = document.getElementById('previewReceiver');
    const drawDate = document.getElementById('previewDrawDate');
    const generatedAt = document.getElementById('previewGeneratedAt');

    if (title) title.textContent = `รายการหวย${state.currentTab === 'underground' ? 'ใต้ดิน' : 'รัฐบาล'}`;
    if (!wrapper || !owner || !receiver || !drawDate) return;

    owner.textContent = state.slipMeta.owner ? `ลูกค้า: ${state.slipMeta.owner}` : '';
    receiver.textContent = state.slipMeta.receiver ? `ส่งให้: ${state.slipMeta.receiver}` : '';
    drawDate.textContent = state.slipMeta.drawDate ? `งวด: ${formatSlipDate(state.slipMeta.drawDate)}` : '';
    const hasMeta = Boolean(state.slipMeta.owner || state.slipMeta.receiver || state.slipMeta.drawDate);
    wrapper.classList.toggle('hidden', !hasMeta);
    document.getElementById('a4Preview')?.classList.toggle('export-sheet-no-meta', !hasMeta);
    if (generatedAt) {
        generatedAt.textContent = `สร้างเมื่อ ${new Intl.DateTimeFormat('th-TH', {
            dateStyle: 'medium', timeStyle: 'short'
        }).format(new Date())}`;
    }
}

export function setupSlipMetaValues() {
    const fields = {
        owner: document.getElementById('slipOwner'),
        receiver: document.getElementById('slipReceiver'),
        drawDate: document.getElementById('slipDrawDate')
    };
    Object.entries(fields).forEach(([key, element]) => {
        if (element) element.value = state.slipMeta[key] || '';
    });
    updateSlipMetaSummary();
    renderPreviewMeta();
    renderLotteryDrawDateChoices();
}
