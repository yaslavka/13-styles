'use client'

import { useEffect, useState } from 'react'
import { Loader2, Upload, X, Save } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import { GENDERS, LABELS, CLOTHING_SIZES, SHOE_SIZES } from '@/lib/constants'
import PixelButton from '@/components/motion/PixelButton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Форма создания/редактирования товара: загрузка фото, размеры, лейблы, цены

const ALL_SIZES = [...CLOTHING_SIZES, ...SHOE_SIZES]
const COLORWAY_PRESETS = ['violet', 'orange', 'blue', 'lilac', 'night']

const EMPTY_FORM = {
  name: '',
  slug: '',
  categoryId: '',
  gender: 'unisex',
  price: '',
  oldPrice: '',
  shortDesc: '',
  description: '',
  label: 'none',
  sizes: [],
  colors: [],
  images: [],
  stock: 10,
  rating: 4.8,
  reviews: 0,
  featured: false,
  published: true,
}

const ProductForm = ({ product, categories, onSaved, onCancel }) => {
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageUrl, setImageUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (product) {
      setForm({
        ...EMPTY_FORM,
        ...product,
        categoryId: String(product.categoryId ?? product.category?.id ?? ''),
        oldPrice: product.oldPrice ?? '',
      })
    } else {
      setForm({ ...EMPTY_FORM, categoryId: categories[0] ? String(categories[0].id) : '' })
    }
  }, [product, categories])

  const setField = (field) => (eventOrValue) => {
    const value = eventOrValue?.target ? eventOrValue.target.value : eventOrValue
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleSize = (size) => {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter((item) => item !== size) : [...prev.sizes, size],
    }))
  }

  const addImage = (url) => {
    if (!url) return
    setForm((prev) => (prev.images.includes(url) ? prev : { ...prev, images: [...prev.images, url] }))
    setImageUrl('')
  }

  const uploadFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const data = await API.admin.post('/api/admin/upload', { dataUrl })
      addImage(data.url)
      toast.success('Фото загружено')
    } catch (error) {
      toast.error('Не удалось загрузить фото', { description: error.message })
    } finally {
      setUploading(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        categoryId: Number(form.categoryId),
        gender: form.gender,
        price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        shortDesc: form.shortDesc,
        description: form.description,
        label: form.label,
        sizes: form.sizes,
        colors: form.colors,
        images: form.images,
        stock: Number(form.stock),
        rating: Number(form.rating),
        reviews: Number(form.reviews),
        featured: form.featured,
        published: form.published,
      }
      const data = product
        ? await API.admin.put(`/api/admin/products/${product.id}`, payload)
        : await API.admin.post('/api/admin/products', payload)
      toast.success(product ? 'Товар обновлён' : 'Товар создан', { description: data.product?.name })
      onSaved()
    } catch (error) {
      toast.error('Ошибка сохранения', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="scrollbar-pixel max-h-[70vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Название *</Label>
          <Input required value={form.name} onChange={setField('name')} placeholder="Худи PIXART NEO" className="border-purple-500/30 bg-[#0d0c1c]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Slug (URL)</Label>
          <Input value={form.slug} onChange={setField('slug')} placeholder="auto из названия" className="border-purple-500/30 bg-[#0d0c1c]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Категория *</Label>
          <Select value={String(form.categoryId)} onValueChange={setField('categoryId')}>
            <SelectTrigger className="border-purple-500/30 bg-[#0d0c1c]"><SelectValue placeholder="Выбери категорию" /></SelectTrigger>
            <SelectContent className="border-purple-500/30 bg-[#10101f]">
              {categories.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Пол</Label>
          <Select value={form.gender} onValueChange={setField('gender')}>
            <SelectTrigger className="border-purple-500/30 bg-[#0d0c1c]"><SelectValue /></SelectTrigger>
            <SelectContent className="border-purple-500/30 bg-[#10101f]">
              {GENDERS.filter((gender) => gender.value !== 'all').map((gender) => (
                <SelectItem key={gender.value} value={gender.value}>{gender.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Цена ₽ *</Label>
          <Input required type="number" min="1" value={form.price} onChange={setField('price')} className="border-purple-500/30 bg-[#0d0c1c]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Старая цена ₽ (для скидки)</Label>
          <Input type="number" min="0" value={form.oldPrice} onChange={setField('oldPrice')} placeholder="пусто = без скидки" className="border-purple-500/30 bg-[#0d0c1c]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Лейбл</Label>
          <Select value={form.label} onValueChange={setField('label')}>
            <SelectTrigger className="border-purple-500/30 bg-[#0d0c1c]"><SelectValue /></SelectTrigger>
            <SelectContent className="border-purple-500/30 bg-[#10101f]">
              {Object.entries(LABELS).map(([value, config]) => (
                <SelectItem key={value} value={value}>{value === 'none' ? 'Без лейбла' : config.text}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Остаток на складе</Label>
          <Input type="number" min="0" value={form.stock} onChange={setField('stock')} className="border-purple-500/30 bg-[#0d0c1c]" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Краткое описание (на карточке)</Label>
          <Textarea value={form.shortDesc} onChange={setField('shortDesc')} maxLength={200} className="min-h-16 border-purple-500/30 bg-[#0d0c1c]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Полное описание</Label>
          <Textarea value={form.description} onChange={setField('description')} maxLength={2000} className="min-h-16 border-purple-500/30 bg-[#0d0c1c]" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-purple-200">Размеры</Label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => toggleSize(size)}
              aria-pressed={form.sizes.includes(size)}
              className={`pixel-corners-sm px-2.5 py-1 font-display text-xs ${
                form.sizes.includes(size) ? 'bg-orange-500 text-white' : 'border border-purple-500/30 text-purple-200 hover:bg-purple-500/15'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-purple-200">Цветовые схемы</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          {COLORWAY_PRESETS.map((colorway) => (
            <button
              key={colorway}
              type="button"
              onClick={() => setField('colors')([...new Set([...form.colors, colorway])])}
              className="pixel-corners-sm border border-purple-500/30 px-2.5 py-1 text-xs text-purple-200 hover:bg-purple-500/15"
            >
              + {colorway}
            </button>
          ))}
          <Input
            value={form.colors.join(', ')}
            onChange={(event) => setField('colors')(event.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
            placeholder="или через запятую"
            className="h-8 w-44 border-purple-500/30 bg-[#0d0c1c] text-xs"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-purple-200">Фото товара (слайдер)</Label>
        <div className="flex flex-wrap gap-2">
          {form.images.map((url) => (
            <span key={url} className="group relative h-16 w-16 overflow-hidden rounded-sm border border-purple-500/40">
              <img src={url} alt="" className="h-full w-full object-cover image-pixelated" />
              <button
                type="button"
                onClick={() => setField('images')(form.images.filter((item) => item !== url))}
                className="absolute inset-0 grid place-items-center bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Удалить фото"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </span>
          ))}
          <label className="pixel-corners-sm grid h-16 w-16 cursor-pointer place-items-center border border-dashed border-purple-500/50 text-purple-300 hover:bg-purple-500/10">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={uploadFile} aria-label="Загрузить фото" />
          </label>
        </div>
        <div className="flex gap-2">
          <Input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="/products/hoodie-violet-1.svg или https://…"
            className="h-9 border-purple-500/30 bg-[#0d0c1c] text-xs"
          />
          <PixelButton type="button" tone="dark" className="h-9 px-4 text-xs" onClick={() => addImage(imageUrl.trim())}>
            Добавить
          </PixelButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 pt-1">
        <label className="flex items-center gap-2 text-sm text-purple-200">
          <Switch checked={form.featured} onCheckedChange={setField('featured')} aria-label="Хит витрины" />
          Хит витрины (на главной)
        </label>
        <label className="flex items-center gap-2 text-sm text-purple-200">
          <Switch checked={form.published} onCheckedChange={setField('published')} aria-label="Опубликовано" />
          Опубликовано
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-purple-500/20 pt-4">
        <PixelButton type="button" tone="ghost" onClick={onCancel}>Отмена</PixelButton>
        <PixelButton type="submit" tone="primary" disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Save className="mr-2 h-4 w-4" aria-hidden />}
          Сохранить
        </PixelButton>
      </div>
    </form>
  )
}

export default ProductForm
