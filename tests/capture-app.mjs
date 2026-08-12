import { writeFileSync } from 'node:fs';

const endpoint = process.argv[2] || 'http://127.0.0.1:9223';
const outputPath = process.argv[3] || 'jodhuay-app.png';
const mode = process.argv[4] || 'page';
const pages = await fetch(`${endpoint}/json`).then((response) => response.json());
const page = pages.find((item) => item.type === 'page' && item.url.includes('127.0.0.1:4173'));
if (!page) throw new Error('JodHuay page was not found');

const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let messageId = 0;

socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
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

await command('Page.enable');
await command('Runtime.enable');
await command('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
});
await evaluate(`
    if (!location.href.includes('127.0.0.1:4173')) location.href = 'http://127.0.0.1:4173/';
`);
await new Promise((resolve) => setTimeout(resolve, 800));
await evaluate(`
    localStorage.clear();
    localStorage.setItem('lottery_data_version', '1.1');
    localStorage.setItem('lottery_underground', '[]');
    localStorage.setItem('lottery_government', '[]');
    location.reload();
`);
await new Promise((resolve) => setTimeout(resolve, 900));

if (mode === 'numpad') {
    await evaluate(`openNumpad('govNumber', 'หมายเลข 6 ตัว', 6, () => {});`);
    await new Promise((resolve) => setTimeout(resolve, 450));
} else if (mode === 'numpad-price') {
    await evaluate(`openNumpad('ugPriceDirect', 'ราคาเต็ม', 6, () => {});`);
    await new Promise((resolve) => setTimeout(resolve, 450));
} else if (mode === 'device') {
    await evaluate(`setMotionMode('full'); toggleDeviceVault(true);`);
    await new Promise((resolve) => setTimeout(resolve, 500));
} else if (mode === 'hero') {
    await evaluate(`
        document.getElementById('pwaInstallBanner')?.remove();
        document.getElementById('motionReducedNotice')?.remove();
    `);
    await new Promise((resolve) => setTimeout(resolve, 150));
}

const buttonStyles = await evaluate(`
    return [...document.querySelectorAll('button')]
        .filter((button) => {
            const rect = button.getBoundingClientRect();
            const style = getComputedStyle(button);
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        })
        .map((button) => {
            const style = getComputedStyle(button);
            return {
                label: button.textContent.trim().replace(/\\s+/g, ' '),
                classes: button.className,
                background: style.backgroundImage === 'none' ? style.backgroundColor : style.backgroundImage
            };
        });
`);

const uiAudit = await evaluate(`
    const strip = document.querySelector('.choice-chips');
    const activeChip = document.querySelector('.choice-chip.active');
    const overlay = document.getElementById('numpadOverlay');
    const banner = document.getElementById('pwaInstallBanner');
    const heroBorder = document.querySelector('.hero-input-container');
    const heroLine = null;
    return {
        choiceOverflowX: strip ? getComputedStyle(strip).overflowX : null,
        choiceOverflowY: strip ? getComputedStyle(strip).overflowY : null,
        activeChipAnimation: activeChip ? getComputedStyle(activeChip).animationName : null,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        numpadZIndex: overlay ? getComputedStyle(overlay).zIndex : null,
        installBannerVisibility: banner ? getComputedStyle(banner).visibility : null,
        heroBorderWidth: heroBorder ? getComputedStyle(heroBorder).borderTopWidth : null,
        heroBorderLeftWidth: heroBorder ? getComputedStyle(heroBorder).borderLeftWidth : null,
        heroBorderBottomWidth: heroBorder ? getComputedStyle(heroBorder).borderBottomWidth : null,
        heroBorderColor: heroBorder ? getComputedStyle(heroBorder).borderLeftColor : null,
        heroLineHeight: heroLine?.height || null,
        heroLineBackground: heroLine?.backgroundColor || null
    };
`);

const screenshot = await command('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: !mode.startsWith('numpad'),
    fromSurface: true
});
writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'));
console.log(JSON.stringify({ screenshot: outputPath, uiAudit, buttonStyles }, null, 2));
socket.close();
