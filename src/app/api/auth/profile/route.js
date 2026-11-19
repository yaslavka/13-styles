import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import DTO from '@/lib/dto'
import USER_AUTH from '@/lib/userAuth'

export const dynamic = 'force-dynamic'

// PUT /api/auth/profile — личный кабинет: смена имени и пароля (нужен текущий пароль)
const PUT = async (request) => {
  try {
    const userId = USER_AUTH.requireUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (user.blocked || user.banned) {
      return NextResponse.json({ error: 'Account is blocked' }, { status: 403 })
    }

    const data = {}

    if (body.name !== undefined) {
      data.name = USER_AUTH.cleanName(body.name) || user.name
    }

    if (body.newPassword !== undefined && body.newPassword !== '') {
      if (!USER_AUTH.isValidPassword(body.newPassword)) {
        return NextResponse.json(
          { error: `New password must be at least ${USER_AUTH.MIN_PASSWORD_LENGTH} characters` },
          { status: 400 }
        )
      }
      if (!USER_AUTH.verifyPassword(String(body.currentPassword || ''), user.passwordHash)) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
      data.passwordHash = USER_AUTH.hashPassword(body.newPassword)
    }

    const updated = await db.user.update({ where: { id: userId }, data })

    return NextResponse.json({ user: DTO.toUserDTO(updated) })
  } catch (error) {
    console.error('[api/auth/profile] ошибка обновления профиля:', error?.message || error)
    return NextResponse.json({ error: 'Could not update the profile' }, { status: 500 })
  }
}

export { PUT }
