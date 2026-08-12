const endpoint = process.argv[2] || 'http://127.0.0.1:9223';
const pages = await fetch(`${endpoint}/json`).then(response => response.json());
const page = pages.find(item => item.type === 'page' && item.url.includes('127.0.0.1:4173'));

if (!page) {
    throw new Error('JodHuay preview page was not found');
}

const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let messageId = 0;
const exceptions = [];
const browserMessages = [];

socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') {
        exceptions.push(message.params.exceptionDetails.text);
    }
    if (message.method === 'Runtime.consoleAPICalled') {
        browserMessages.push(message.params.args.map(arg => arg.value || arg.description || '').join(' '));
    }
    if (message.method === 'Log.entryAdded') {
        browserMessages.push(message.params.entry.text || '');
    }
});

await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
});

function command(method, params = {}) {
    const id = ++messageId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
    const result = await command('Runtime.evaluate', {
        expression: `(async () => { ${expression} })()`,
        awaitPromise: true,
        returnByValue: true
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
}

await command('Runtime.enable');
await command('Log.enable');
await evaluate(`
    localStorage.clear();
    location.reload();
`);
await new Promise(resolve => setTimeout(resolve, 800));

const result = await evaluate(`
    const input = (id, value) => {
        const element = document.getElementById(id);
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const metaCollapsedByDefault = document.getElementById('slipMetaToggle').getAttribute('aria-expanded') === 'false'
        && document.getElementById('slipMetaPanel').inert
        && document.getElementById('slipDrawDate').value === '';
    toggleSlipMeta();
    const metaPanelOpens = document.getElementById('slipMetaToggle').getAttribute('aria-expanded') === 'true'
        && !document.getElementById('slipMetaPanel').inert;
    const augustDraws = getThaiLotteryDrawSuggestions(new Date('2026-08-12T12:00:00+07:00'));
    const januaryDraws = getThaiLotteryDrawSuggestions(new Date('2026-01-01T12:00:00+07:00'));
    const mayDraws = getThaiLotteryDrawSuggestions(new Date('2026-05-01T12:00:00+07:00'));
    const officialThaiDrawRules = augustDraws.previous === '2026-08-01'
        && augustDraws.next === '2026-08-16'
        && januaryDraws.previous === '2025-12-30'
        && januaryDraws.next === '2026-01-17'
        && mayDraws.next === '2026-05-02';
    const motionControlsRemoved = !document.querySelector('[data-motion-mode]')
        && !document.getElementById('motionReducedNotice')
        && document.documentElement.dataset.motion === 'full';

    const vault = document.getElementById('deviceVault');
    const vaultCompactByDefault = !vault.classList.contains('is-open')
        && document.getElementById('deviceVaultPanel').inert
        && vault.getBoundingClientRect().height < 75;
    toggleDeviceVault();
    const vaultOpens = vault.classList.contains('is-open')
        && !document.getElementById('deviceVaultPanel').inert;
    toggleDeviceVault(false);
    setMotionMode('full');
    const brandMotionStyle = getComputedStyle(document.querySelector('.brand-title'));
    const fullMotionCanBeForced = document.documentElement.dataset.motion === 'full'
        && brandMotionStyle.animationName.includes('jh-brand-breathe')
        && Number.parseFloat(brandMotionStyle.animationDuration) >= 4
        && brandMotionStyle.animationIterationCount === 'infinite';
    const productionTailwindLoaded = [...document.styleSheets]
        .some(sheet => sheet.href?.includes('css/tailwind-built.css'));

    const choiceStripStyle = getComputedStyle(document.querySelector('.choice-chips'));
    const choiceShadowsNotClipped = choiceStripStyle.overflowX === 'visible'
        && choiceStripStyle.overflowY === 'visible';
    const reducedMotionRequested = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionStylesLoaded = reducedMotionRequested || getComputedStyle(document.querySelector('.choice-chip.active'))
        .animationName.includes('jh-chip-select');
    openNumpad('govNumber', 'หมายเลข 6 ตัว', 6, () => {});
    const numpadSuppressesInstallBanner = document.body.classList.contains('numpad-open');
    closeNumpad();

    input('slipOwner', 'แม่');
    input('slipReceiver', 'ร้านพี่แหม่ม');

    input('govNumber', '123456');
    addGovernment();
    const governmentAdded = document.querySelectorAll('#govList [data-item-id]').length === 1;
    document.querySelector('#govList [data-item-id]').click();
    const governmentEdited = document.getElementById('govNumber').value.replace(/\\s/g, '') === '123456'
        && document.querySelectorAll('#govList [data-item-id]').length === 0;
    addGovernment();
    document.querySelector('#govList [data-delete-item]').click();
    const governmentDeleted = document.querySelectorAll('#govList [data-item-id]').length === 0;

    await switchTab('underground');
    input('ugNumber', '123');
    input('ugPriceDirect', '50');
    addUnderground();
    const undergroundAdded = document.querySelectorAll('#ugList [data-item-id]').length === 1;
    document.querySelector('#ugList [data-item-id]').click();
    const undergroundEdited = document.getElementById('ugNumber').value.replace(/\\s/g, '') === '123'
        && document.querySelectorAll('#ugList [data-item-id]').length === 0;
    addUnderground();
    document.querySelector('#ugList [data-delete-item]').click();
    const undergroundDeleted = document.querySelectorAll('#ugList [data-item-id]').length === 0;

    await switchTab('government');
    const transitionPromise = switchTab('underground');
    await new Promise(resolve => setTimeout(resolve, 100));
    const visibleDuringTransition = document.querySelectorAll('.section-content:not(.hidden)').length === 2;
    const transitionIsAnimated = document.getElementById('lotterySectionsStage').classList.contains('is-switching')
        && document.getAnimations().some(animation => animation.playState === 'running');
    await transitionPromise;
    const transitionSettlesCleanly = !document.body.classList.contains('transitioning')
        && !document.getElementById('lotterySectionsStage').classList.contains('is-switching')
        && document.getElementById('undergroundSection').classList.contains('hidden') === false
        && document.getElementById('governmentSection').classList.contains('hidden') === true
        && document.getElementById('lotterySectionsStage').style.height === 'auto';

    const rapidFirst = switchTab('government');
    switchTab('underground');
    await rapidFirst;
    await new Promise(resolve => setTimeout(resolve, 650));
    const rapidTabSwitchSettles = currentTab === 'underground'
        && document.getElementById('tabUnderground').getAttribute('aria-selected') === 'true'
        && !document.body.classList.contains('transitioning');

    return {
        governmentAdded,
        governmentEdited,
        governmentDeleted,
        undergroundAdded,
        undergroundEdited,
        undergroundDeleted,
        metaCollapsedByDefault,
        metaPanelOpens,
        officialThaiDrawRules,
        motionControlsRemoved,
        vaultCompactByDefault,
        vaultOpens,
        fullMotionCanBeForced,
        productionTailwindLoaded,
        choiceShadowsNotClipped,
        motionStylesLoaded,
        numpadSuppressesInstallBanner,
        visibleDuringTransition,
        transitionIsAnimated,
        transitionSettlesCleanly,
        rapidTabSwitchSettles,
        metaSaved: JSON.parse(localStorage.getItem('lottery_slip_meta')).owner === 'แม่',
        noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth
    };
`);

await evaluate(`
    localStorage.setItem('lottery_data_version', '1.1');
    localStorage.setItem('lottery_government', JSON.stringify([
        { id: "x');window.__xss=1;//", type: '6', number: '654321', qty: 1 }
    ]));
    localStorage.setItem('lottery_underground', JSON.stringify([
        { id: 'unsafe', type: '3bon', number: '123', price: '<img src=x onerror=window.__xss=1>' }
    ]));
    location.reload();
`);
await new Promise(resolve => setTimeout(resolve, 800));

const security = await evaluate(`
    const governmentItem = document.querySelector('#govList [data-item-id]');
    openPreviewModal();
    return {
        unsafeIdReplaced: Boolean(governmentItem) && /^[A-Za-z0-9_-]+$/.test(governmentItem.dataset.itemId),
        unsafePriceDiscarded: document.querySelectorAll('#ugList [data-item-id]').length === 0,
        noScriptExecuted: window.__xss !== 1,
        previewHasOwner: document.getElementById('previewOwner').textContent.includes('แม่'),
        sharedTextHasReceiver: buildSlipText(governmentData).includes('ร้านพี่แหม่ม'),
        exportHasStructuredSummary: document.querySelector('.export-summary')?.textContent.includes('1 ใบ') === true,
        singleExportGroupIsCentered: document.querySelector('.export-groups')?.classList.contains('export-groups-single') === true
    };
`);

const passed = Object.values(result).every(Boolean)
    && Object.values(security).every(Boolean)
    && exceptions.length === 0
    && !browserMessages.some(message => /cdn\.tailwindcss\.com should not be used|manifest.*blocked by CORS|Service Worker registration failed/i.test(message));
console.log(JSON.stringify({ passed, result, security, exceptions, browserMessages }, null, 2));
socket.close();
if (!passed) process.exitCode = 1;
