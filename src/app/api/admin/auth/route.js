import { NextResponse } from 'next/server'
import ADMIN from '@/lib/admin'

export const dynamic = 'force-dynamic'

// POST /api/admin/auth — вход в админку по паролю, обмен на токен
const POST = async (request) => {
  try {
    const body = await request.json().catch(() => null)
    const password = body && typeof body.password === 'string' ? body.password : ''

    if (!ADMIN.verifyPassword(password)) {
      return NextResponse.json({ error: 'Неверный пароль администратора' }, { status: 401 })
    }

    return NextResponse.json({ token: ADMIN.token() })
  } catch (error) {
    console.error('[api/admin/auth] ошибка авторизации:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось выполнить авторизацию' }, { status: 500 })
  }
}

export { POST }
