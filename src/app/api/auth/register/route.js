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
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 })
    }

    const login = typeof body.login === 'string' ? body.login.trim().toLowerCase() : ''
    if (!USER_AUTH.isValidLogin(login)) {
      return NextResponse.json(
        { error: `Логин: от ${USER_AUTH.MIN_LOGIN_LENGTH} до ${USER_AUTH.MAX_LOGIN_LENGTH} символов — любые буквы и цифры, сложность не требуется` },
        { status: 400 }
      )
    }

    if (!USER_AUTH.isValidPassword(body.password)) {
      return NextResponse.json(
        { error: `Пароль должен быть минимум ${USER_AUTH.MIN_PASSWORD_LENGTH} символов` },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { login } })
    if (existing) {
      return NextResponse.json({ error: 'Такой логин уже занят — попробуйте другой' }, { status: 400 })
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
    return NextResponse.json({ error: 'Не удалось создать аккаунт' }, { status: 500 })
  }
}

export { POST }
