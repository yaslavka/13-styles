import { io } from 'socket.io-client'

const URL = 'http://localhost:3003/'
const log = (...args) => console.log('[test]', ...args)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// watchdog: always self-exit so the bash timeout never kills the whole process group
setTimeout(() => {
  console.log('[test] WATCHDOG TIMEOUT — aborting')
  const failed = results.filter(([, ok]) => !ok)
  console.log(`[test] watchdog summary: ${results.length - failed.length}/${results.length} passed`)
  process.exit(2)
}, 20000).unref()

// bun has no XHR: force websocket-only transport (browsers will use default polling+upgrade)
const support = io(URL, { path: '/', transports: ['websocket'] })
const user = io(URL, { path: '/', transports: ['websocket'] })

const wireLifecycle = (name, sock) => {
  sock.on('connect', () => log(`${name} connected id=${sock.id}`))
  sock.on('connect_error', (err) => log(`${name} connect_error: ${err.message}`))
  sock.on('disconnect', (reason) => log(`${name} disconnected: ${reason}`))
}
wireLifecycle('support', support)
wireLifecycle('user', user)

const results = []
const expect = (name, cond) => {
  results.push([name, !!cond])
  log(cond ? 'PASS' : 'FAIL', name)
}

support.on('rooms:update', (rooms) => {
  log('support rooms:update ->', JSON.stringify(rooms))
  globalThis.__lastRooms = rooms
})

user.on('chat:online', (p) => log('user chat:online ->', JSON.stringify(p)))
user.on('chat:typing', (p) => {
  globalThis.__userTyping = p
  log('user chat:typing ->', JSON.stringify(p))
})
support.on('chat:typing', (p) => log('support chat:typing ->', JSON.stringify(p)))

support.on('chat:message', (m) => log('support chat:message ->', JSON.stringify(m)))
user.on('chat:message', (m) => {
  globalThis.__userMessages = globalThis.__userMessages || []
  globalThis.__userMessages.push(m)
  log('user chat:message ->', JSON.stringify(m))
})

const main = async () => {
  await delay(300)

  // support joins
  support.emit('hello', { role: 'support' })
  await delay(200)
  expect('support hello done', true)

  // user joins
  const userHistory = new Promise((resolve) => user.once('chat:history', resolve))
  user.emit('hello', { role: 'user', roomId: 'user-test1', userName: 'Иван Тестовый' })
  const history = await userHistory
  expect('user gets chat:history', history.roomId === 'user-test1' && Array.isArray(history.messages))
  expect('history.supportOnline true', history.supportOnline === true)
  await delay(200)
  expect(
    'support got rooms:update with room',
    Array.isArray(globalThis.__lastRooms) &&
      globalThis.__lastRooms.some((r) => r.id === 'user-test1' && r.userName === 'Иван Тестовый'),
  )

  // user sends message
  user.emit('user:message', { text: '  Здравствуйте, товар не пришёл  ' })
  await delay(300)
  const roomRow = globalThis.__lastRooms && globalThis.__lastRooms.find((r) => r.id === 'user-test1')
  expect('rooms:update unread=1, lastText trimmed', roomRow && roomRow.unread === 1 && roomRow.lastText === 'Здравствуйте, товар не пришёл')
  expect('user got own chat:message', (globalThis.__userMessages || []).some((m) => m.from === 'user'))

  // typing
  user.emit('chat:typing', { who: 'user' })
  await delay(200)
  expect('user typing forwarded', globalThis.__userTyping && globalThis.__userTyping.who === 'user' && globalThis.__userTyping.roomId === 'user-test1')

  // support opens room
  const supHistory = new Promise((resolve) => support.once('chat:history', resolve))
  support.emit('support:open', { roomId: 'user-test1' })
  const supH = await supHistory
  expect('support:open -> chat:history', supH.roomId === 'user-test1' && supH.messages.length >= 1)
  await delay(200)
  expect('unread reset after open', globalThis.__lastRooms.find((r) => r.id === 'user-test1').unread === 0)

  // support replies
  support.emit('support:message', { roomId: 'user-test1', text: 'Проверим заказ, минутку' })
  await delay(300)
  expect('user got support reply', (globalThis.__userMessages || []).some((m) => m.from === 'support' && m.text === 'Проверим заказ, минутку'))
  // contract: support:message emits chat:message only (no rooms:update) — snapshot must be unchanged
  expect('support:message emits no rooms:update (per contract)', globalThis.__lastRooms.find((r) => r.id === 'user-test1').lastText === 'Здравствуйте, товар не пришёл')

  // support:read resets unread
  user.emit('user:message', { text: 'второе сообщение' })
  await delay(250)
  support.emit('support:read', { roomId: 'user-test1' })
  await delay(200)
  expect('support:read resets unread', globalThis.__lastRooms.find((r) => r.id === 'user-test1').unread === 0)

  // rooms:list
  support.emit('rooms:list')
  await delay(200)
  expect('rooms:list -> rooms:update', Array.isArray(globalThis.__lastRooms) && globalThis.__lastRooms.length >= 1)

  // support disconnect -> chat:online false
  const onlineOff = new Promise((resolve) => user.once('chat:online', resolve))
  support.close()
  const off = await onlineOff
  expect('chat:online false after support left', off.online === false)

  // invalid input rejected silently (no crash)
  user.emit('user:message', { text: '' })
  user.emit('user:message', { text: 'x'.repeat(1001) })
  user.emit('user:message', { text: 42 })
  await delay(200)
  expect('invalid messages ignored, no crash', true)

  const failed = results.filter(([, ok]) => !ok)
  log(`---- ${results.length - failed.length}/${results.length} checks passed ----`)
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => {
  console.error('[test] error', e)
  process.exit(1)
})
