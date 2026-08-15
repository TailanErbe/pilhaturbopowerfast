import fs from 'node:fs'
const SP = process.argv[2]
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json()
const page = list.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0; const pend = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } }
const send = (m, p = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await send('Page.enable'); await send('Runtime.enable')
await send('Page.navigate', { url: `file:///${SP}/render.html` })
let dado = null
for (let i = 0; i < 40; i++) {
  await sleep(1000)
  const r = await ev('window.__pronto ? window.__pronto.length : (window.__erro || 0)')
  if (typeof r?.value === 'number' && r.value > 1000) { dado = true; break }
}
console.log('medidas:', JSON.stringify((await ev('JSON.stringify(window.__medidas||null)'))?.value))
if (!dado) { console.log('nao renderizou'); ws.close(); process.exit(1) }
const url = (await ev('window.__pronto'))?.value
fs.writeFileSync(`${SP}/rotulo-oficial.png`, Buffer.from(url.split(',')[1], 'base64'))
console.log('salvo', fs.statSync(`${SP}/rotulo-oficial.png`).size, 'bytes')
ws.close()
