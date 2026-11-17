import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ADMIN from '@/lib/admin'
import DTO from '@/lib/dto'
import USER_AUTH from '@/lib/userAuth'

export const dynamic = 'force-dynamic'

const parseId = (raw) => {
  const num = parseInt(raw, 10)
  return Number.isNaN(num) ? null : num
}

// PUT /api/admin/users/[id] — редактирование пользователя: имя, логин, пароль,
// блокировка (blocked), бан (banned). Логин и пароль валидируются как при регистрации.
const PUT = async (request, context) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const params = await context.params
    const id = parseId(params?.id)
    if (id === null) {
      return NextResponse.json({ error: 'Некорректный идентификатор пользователя' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    const data = {}

    if (body.name !== undefined) {
      data.name = USER_AUTH.cleanName(body.name)
    }

    if (body.login !== undefined && body.login !== existing.login) {
      const login = typeof body.login === 'string' ? body.login.trim().toLowerCase() : ''
      if (!USER_AUTH.isValidLogin(login)) {
        return NextResponse.json(
          { error: 'Логин: 3–40 символов, только латиница, цифры и знаки _ . -' },
          { status: 400 }
        )
      }
      const taken = await db.user.findUnique({ where: { login } })
      if (taken && taken.id !== id) {
        return NextResponse.json({ error: 'Такой логин уже занят' }, { status: 400 })
      }
      data.login = login
    }

    if (body.password !== undefined && body.password !== '') {
      if (!USER_AUTH.isValidPassword(body.password)) {
        return NextResponse.json(
          { error: `Пароль должен быть минимум ${USER_AUTH.MIN_PASSWORD_LENGTH} символов` },
          { status: 400 }
        )
      }
      data.passwordHash = USER_AUTH.hashPassword(body.password)
    }

    if (body.blocked !== undefined) data.blocked = body.blocked === true
    if (body.banned !== undefined) data.banned = body.banned === true

    const updated = await db.user.update({
      where: { id },
      data,
      include: { _count: { select: { orders: true } } },
    })

    return NextResponse.json({ user: DTO.toAdminUserDTO(updated) })
  } catch (error) {
    console.error('[api/admin/users/[id]] ошибка обновления пользователя:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось обновить пользователя' }, { status: 500 })
  }
}

// DELETE /api/admin/users/[id] — полное удаление аккаунта
const DELETE = async (request, context) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const params = await context.params
    const id = parseId(params?.id)
    if (id === null) {
      return NextResponse.json({ error: 'Некорректный идентификатор пользователя' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    await db.user.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/admin/users/[id]] ошибка удаления пользователя:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось удалить пользователя' }, { status: 500 })
  }
}

export { PUT, DELETE }
