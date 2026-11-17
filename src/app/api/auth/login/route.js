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
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 })
    }

    const login = typeof body.login === 'string' ? body.login.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    const user = await db.user.findUnique({ where: { login } })
    if (!user || !USER_AUTH.verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
    }

    return NextResponse.json({ token: USER_AUTH.issueToken(user.id), user: DTO.toUserDTO(user) })
  } catch (error) {
    console.error('[api/auth/login] ошибка входа:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось выполнить вход' }, { status: 500 })
  }
}

export { POST }
