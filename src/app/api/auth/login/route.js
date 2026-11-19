import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import DTO from '@/lib/dto'
import USER_AUTH from '@/lib/userAuth'

export const dynamic = 'force-dynamic'

// POST /api/auth/login — вход покупателя по логину и паролю
const POST = async (request) => {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const login = typeof body.login === 'string' ? body.login.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    const user = await db.user.findUnique({ where: { login } })
    if (!user || !USER_AUTH.verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid login or password' }, { status: 401 })
    }

    // Заблокированные и забаненные аккаунты не проходят
    if (user.banned) {
      return NextResponse.json({ error: 'Account banned by administrator' }, { status: 403 })
    }
    if (user.blocked) {
      return NextResponse.json({ error: 'Account is blocked — contact support' }, { status: 403 })
    }

    return NextResponse.json({ token: USER_AUTH.issueToken(user.id), user: DTO.toUserDTO(user) })
  } catch (error) {
    console.error('[api/auth/login] ошибка входа:', error?.message || error)
    return NextResponse.json({ error: 'Could not sign in' }, { status: 500 })
  }
}

export { POST }
