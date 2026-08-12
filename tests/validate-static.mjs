import fs from 'node:fs';

JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
console.log('manifest ok');

for (const file of [
    'styles.css',
    'css/fonts.css',
    'css/tailwind-built.css',
    'css/tokens.css',
    'css/workflow.css',
    'css/responsive.css',
    'css/sacred-theme.css',
    'css/motion.css',
    'css/export-sheet.css'
]) {
    const source = fs.readFileSync(file, 'utf8');
    let balance = 0;
    for (const character of source) {
        if (character === '{') balance += 1;
        if (character === '}') balance -= 1;
    }
    if (balance !== 0) throw new Error(`${file}: unbalanced braces (${balance})`);
    console.log(`${file} ok`);
}

const html = fs.readFileSync('index.html', 'utf8');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicateIds.length) throw new Error(`Duplicate HTML IDs: ${duplicateIds.join(', ')}`);
console.log('html ids ok');

const localRefs = [...html.matchAll(/(?:href|src)="(?!https?:|#|data:)([^"?]+)(?:\?[^\"]*)?"/g)]
    .map((match) => match[1].replace(/^\.\//, ''));
for (const localRef of localRefs) {
    if (!fs.existsSync(localRef)) throw new Error(`Missing local reference: ${localRef}`);
}
console.log('html local refs ok');

const serviceWorker = fs.readFileSync('sw.js', 'utf8');
const cachedRefs = [...serviceWorker.matchAll(/'\.\/([^']+)'/g)].map((match) => match[1]);
for (const cachedRef of cachedRefs) {
    if (!fs.existsSync(cachedRef)) throw new Error(`Missing service-worker asset: ${cachedRef}`);
}
console.log('service-worker refs ok');

const cssFiles = ['styles.css', ...fs.readdirSync('css').filter(name => name.endsWith('.css')).map(name => `css/${name}`)];
for (const cssFile of cssFiles) {
    const css = fs.readFileSync(cssFile, 'utf8');
    const urls = [...css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)].map(match => match[1]);
    for (const url of urls) {
        if (/^(?:data:|https?:)/.test(url)) continue;
        const resolved = new URL(url, `file:///${process.cwd().replace(/\\/g, '/')}/${cssFile}`).pathname.slice(1);
        if (!fs.existsSync(resolved)) throw new Error(`Missing CSS asset: ${cssFile} -> ${url}`);
    }
}
console.log('css local refs ok');
