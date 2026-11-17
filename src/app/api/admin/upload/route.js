import { NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import ADMIN from '@/lib/admin'

export const dynamic = 'force-dynamic'

const DATA_URL_PATTERN = /^data:(image\/(png|jpe?g|webp|svg\+xml));base64,([A-Za-z0-9+/=]+)$/i
const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4 МБ

const EXT_BY_MIME = {
  'image/png': 'png',
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

// POST /api/admin/upload — сохранение base64-картинки в public/uploads
const POST = async (request) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => null)
    const dataUrl = body && typeof body.dataUrl === 'string' ? body.dataUrl.trim() : ''

    const match = DATA_URL_PATTERN.exec(dataUrl)
    if (!match) {
      return NextResponse.json(
        { error: 'Некорректный формат файла: ожидается base64 data URL изображения (png, jpg, webp или svg)' },
        { status: 400 },
      )
    }

    const mime = match[1].toLowerCase()
    const ext = EXT_BY_MIME[mime] || 'png'
    const buffer = Buffer.from(match[3], 'base64')

    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: 'Файл пуст' }, { status: 400 })
    }
    if (buffer.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Файл слишком большой: максимум 4 МБ' }, { status: 400 })
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    await writeFile(join(uploadDir, filename), buffer)

    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch (error) {
    console.error('[api/admin/upload] ошибка загрузки файла:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось сохранить файл' }, { status: 500 })
  }
}

export { POST }
