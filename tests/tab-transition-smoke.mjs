const endpoint = process.argv[2] || 'http://127.0.0.1:9224';
const pages = await fetch(`${endpoint}/json`).then(response => response.json());
const page = pages.find(item => item.type === 'page' && item.url.includes('tab-motion-fresh'));

if (!page) throw new Error('Fresh JodHuay transition test page was not found');

const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const exceptions = [];
let messageId = 0;

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
await new Promise(resolve => setTimeout(resolve, 700));

const result = await evaluate(`
    setMotionMode('full');
    const promise = switchTab('underground');
    await new Promise(resolve => setTimeout(resolve, 110));
    const stage = document.getElementById('lotterySectionsStage');
    const government = document.getElementById('governmentSection');
    const underground = document.getElementById('undergroundSection');
    const midTransition = {
        bothPanelsPresent: !government.classList.contains('hidden') && !underground.classList.contains('hidden'),
        stageIsLocked: stage.classList.contains('is-switching') && stage.style.height.endsWith('px'),
        panelAnimationRunning: [government, underground].some(panel =>
            panel.getAnimations().some(animation => animation.playState === 'running')),
        noBlankFrame: Number.parseFloat(getComputedStyle(government).opacity) > 0
            || Number.parseFloat(getComputedStyle(underground).opacity) > 0
    };
    await promise;
    const settled = {
        undergroundVisible: !underground.classList.contains('hidden'),
        governmentHidden: government.classList.contains('hidden'),
        stageReleased: stage.style.height === 'auto' && !stage.classList.contains('is-switching'),
        transitionFlagReleased: !document.body.classList.contains('transitioning'),
        tabStateAccessible: document.getElementById('tabUnderground').getAttribute('aria-selected') === 'true'
    };

    const first = switchTab('government');
    switchTab('underground');
    await first;
    await new Promise(resolve => setTimeout(resolve, 650));
    const rapidSwitchSettled = currentTab === 'underground'
        && !underground.classList.contains('hidden')
        && government.classList.contains('hidden')
        && !document.body.classList.contains('transitioning');

    return { midTransition, settled, rapidSwitchSettled };
`);

const passed = Object.values(result.midTransition).every(Boolean)
    && Object.values(result.settled).every(Boolean)
    && result.rapidSwitchSettled
    && exceptions.length === 0;

console.log(JSON.stringify({ passed, result, exceptions }, null, 2));
socket.close();
if (!passed) process.exitCode = 1;
