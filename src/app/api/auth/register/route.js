import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import DTO from '@/lib/dto'
import USER_AUTH from '@/lib/userAuth'

export const dynamic = 'force-dynamic'

// POST /api/auth/register — регистрация покупателя (логин + пароль + имя)
const POST = async (request) => {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const login = typeof body.login === 'string' ? body.login.trim().toLowerCase() : ''
    if (!USER_AUTH.isValidLogin(login)) {
      return NextResponse.json(
        { error: `Login: ${USER_AUTH.MIN_LOGIN_LENGTH}–${USER_AUTH.MAX_LOGIN_LENGTH} characters — any letters and digits, no complexity required` },
        { status: 400 }
      )
    }

    if (!USER_AUTH.isValidPassword(body.password)) {
      return NextResponse.json(
        { error: `Password must be at least ${USER_AUTH.MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { login } })
    if (existing) {
      return NextResponse.json({ error: 'This login is already taken — try another one' }, { status: 400 })
    }

    const created = await db.user.create({
      data: {
        login,
        name: USER_AUTH.cleanName(body.name) || login,
        passwordHash: USER_AUTH.hashPassword(body.password),
      },
    })

    return NextResponse.json({ token: USER_AUTH.issueToken(created.id), user: DTO.toUserDTO(created) }, { status: 201 })
  } catch (error) {
    console.error('[api/auth/register] ошибка регистрации:', error?.message || error)
    return NextResponse.json({ error: 'Could not create the account' }, { status: 500 })
  }
}

export { POST }
