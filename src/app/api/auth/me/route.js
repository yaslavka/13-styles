import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import DTO from '@/lib/dto'
import USER_AUTH from '@/lib/userAuth'

export const dynamic = 'force-dynamic'

// GET /api/auth/me — данные пользователя по токену из заголовка x-user-key
const GET = async (request) => {
  try {
    const userId = USER_AUTH.requireUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    // Заблокирован или забанен — токен больше не действителен
    if (user.blocked || user.banned) {
      return NextResponse.json({ error: 'Аккаунт заблокирован' }, { status: 403 })
    }

    return NextResponse.json({ user: DTO.toUserDTO(user) })
  } catch (error) {
    console.error('[api/auth/me] ошибка запроса профиля:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось загрузить профиль' }, { status: 500 })
  }
}

export { GET }
