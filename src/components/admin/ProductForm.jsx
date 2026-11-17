'use client'

import { useEffect, useState } from 'react'
import { Loader2, Upload, X, Save, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import { GENDERS, LABELS, CLOTHING_SIZES, SHOE_SIZES } from '@/lib/constants'
import GlassButton from '@/components/motion/GlassButton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Форма создания/редактирования товара: загрузка фото, размеры, лейблы, цены,
// подкатегория и флаг декора (товар живёт только в анимации главной)

const ALL_SIZES = [...CLOTHING_SIZES, ...SHOE_SIZES]
const COLORWAY_PRESETS = ['violet', 'orange', 'blue', 'lilac', 'night']

// Админка на русском: подписи полов локальны и не зависят от словарей витрины
const GENDER_NAMES = { men: 'Мужской', women: 'Женский', unisex: 'Унисекс' }

const EMPTY_FORM = {
  name: '',
  slug: '',
  categoryId: '',
  subcategoryId: '',
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
  decor: false,
  // Собственная ссылка на оплату: платим по ней вместо общей платёжной системы
  customPayment: false,
  paymentUrl: '',
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
        subcategoryId: product.subcategoryId ? String(product.subcategoryId) : '',
        oldPrice: product.oldPrice ?? '',
        customPayment: product.customPayment === true,
        paymentUrl: product.paymentUrl || '',
      })
    } else {
      setForm({ ...EMPTY_FORM, categoryId: categories[0] ? String(categories[0].id) : '' })
    }
  }, [product, categories])

  const setField = (field) => (eventOrValue) => {
    const value = eventOrValue?.target ? eventOrValue.target.value : eventOrValue
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Смена категории сбрасывает подкатегорию, если она из другой категории.
  // Radix при инициализации контролируемого значения может дёрнуть onChange("") — игнорируем.
  const onCategoryChange = (value) => {
    if (!value) return
    setForm((prev) => {
      const category = categories.find((item) => String(item.id) === value)
      const belongs = category?.subcategories?.some((item) => String(item.id) === prev.subcategoryId)
      return { ...prev, categoryId: value, subcategoryId: belongs ? prev.subcategoryId : '' }
    })
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
        subcategoryId: form.subcategoryId ? Number(form.subcategoryId) : null,
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
        decor: form.decor,
        customPayment: form.customPayment,
        paymentUrl: form.paymentUrl,
      }
      const data = product
        ? await API.admin.put(`/api/admin/products/${product.id}`, payload)
        : await API.admin.post('/api/admin/products', payload)
      toast.success(product ? 'Товар обновлён' : 'Товар создан', { description: data.product?.name })
      onSaved(data.product)
    } catch (error) {
      toast.error('Ошибка сохранения', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const activeCategory = categories.find((item) => String(item.id) === String(form.categoryId))
  const subcategories = activeCategory?.subcategories || []
  const activeSubcategory = subcategories.find((item) => String(item.id) === String(form.subcategoryId))

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Название *</Label>
          <Input required value={form.name} onChange={setField('name')} placeholder="NEO Hoodie Violet" className="border-purple-500/30 bg-[#0d0c1c]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Slug (URL)</Label>
          <Input value={form.slug} onChange={setField('slug')} placeholder="auto из названия" className="border-purple-500/30 bg-[#0d0c1c]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Категория *</Label>
          <Select value={String(form.categoryId)} onValueChange={onCategoryChange}>
            <SelectTrigger className="border-purple-500/30 bg-[#0d0c1c]">
              <SelectValue placeholder="Выбери категорию">{activeCategory?.name || 'Выбери категорию'}</SelectValue>
            </SelectTrigger>
            <SelectContent className="border-purple-500/30 bg-[#10101f]">
              {categories.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Подкатегория</Label>
          <Select
            value={form.subcategoryId ? String(form.subcategoryId) : 'none'}
            onValueChange={(value) => { if (value) setField('subcategoryId')(value === 'none' ? '' : value) }}
          >
            <SelectTrigger className="border-purple-500/30 bg-[#0d0c1c]">
              <SelectValue placeholder="Без подкатегории">{activeSubcategory?.name || 'Без подкатегории'}</SelectValue>
            </SelectTrigger>
            <SelectContent className="border-purple-500/30 bg-[#10101f]">
              <SelectItem value="none">Без подкатегории</SelectItem>
              {subcategories.map((subcategory) => (
                <SelectItem key={subcategory.id} value={String(subcategory.id)}>{subcategory.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Пол</Label>
          <Select value={form.gender} onValueChange={(value) => { if (value) setField('gender')(value) }}>
            <SelectTrigger className="border-purple-500/30 bg-[#0d0c1c]">
              <SelectValue>{GENDER_NAMES[form.gender] || 'Унисекс'}</SelectValue>
            </SelectTrigger>
            <SelectContent className="border-purple-500/30 bg-[#10101f]">
              {GENDERS.filter((gender) => gender.value !== 'all').map((gender) => (
                <SelectItem key={gender.value} value={gender.value}>{GENDER_NAMES[gender.value]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Цена *</Label>
          <Input required type="number" min="1" value={form.price} onChange={setField('price')} className="border-purple-500/30 bg-[#0d0c1c]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Старая цена (для скидки)</Label>
          <Input type="number" min="0" value={form.oldPrice} onChange={setField('oldPrice')} placeholder="пусто = без скидки" className="border-purple-500/30 bg-[#0d0c1c]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Лейбл</Label>
          <Select value={form.label} onValueChange={(value) => { if (value) setField('label')(value) }}>
            <SelectTrigger className="border-purple-500/30 bg-[#0d0c1c]">
              <SelectValue>{form.label === 'none' ? 'Без лейбла' : LABELS[form.label]?.text || 'Без лейбла'}</SelectValue>
            </SelectTrigger>
            <SelectContent className="border-purple-500/30 bg-[#10101f]">
              {Object.entries(LABELS).map(([value, config]) => (
                <SelectItem key={value} value={value}>{value === 'none' ? 'Без лейбла' : config.text}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-purple-200">Остаток на складе (0 = нет в наличии)</Label>
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
              className={`rounded-xl px-2.5 py-1 font-display text-xs ${
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
              className="rounded-xl border border-purple-500/30 px-2.5 py-1 text-xs text-purple-200 hover:bg-purple-500/15"
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
          <label className="rounded-xl grid h-16 w-16 cursor-pointer place-items-center border border-dashed border-purple-500/50 text-purple-300 hover:bg-purple-500/10">
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
          <GlassButton type="button" tone="dark" className="h-9 px-4 text-xs" onClick={() => addImage(imageUrl.trim())}>
            Добавить
          </GlassButton>
        </div>
      </div>

      <div className="rounded-2xl border border-purple-500/25 bg-purple-500/5 p-4">
        <p className="mb-1 flex items-center gap-2 font-display text-sm font-bold text-purple-200">
          <CreditCard className="h-4 w-4 text-orange-300" aria-hidden />
          Оплата товара
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          По умолчанию товар оплачивается через общую платёжную систему. Включите переключатель,
          если у этого товара собственная ссылка на оплату.
        </p>
        <label className="flex items-center gap-2 text-sm text-purple-200">
          <Switch checked={form.customPayment} onCheckedChange={setField('customPayment')} aria-label="Оплата по собственной ссылке" />
          Оплачивается по собственной ссылке (не по общей платёжной системе)
        </label>
        {form.customPayment ? (
          <div className="mt-3 space-y-1.5">
            <Label className="text-xs text-purple-200">Ссылка на оплату *</Label>
            <Input
              value={form.paymentUrl}
              onChange={setField('paymentUrl')}
              placeholder="https://pay.example.com/my-product-13"
              className="border-purple-500/30 bg-[#0d0c1c]"
              type="url"
              required
            />
            <p className="text-xs text-muted-foreground">Откроется в новой вкладке, когда покупатель нажмёт «Оплатить» у этого товара в корзине.</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
        <label className="flex items-center gap-2 text-sm text-purple-200">
          <Switch checked={form.featured} onCheckedChange={setField('featured')} aria-label="Хит витрины" />
          Хит витрины (на главной)
        </label>
        <label className="flex items-center gap-2 text-sm text-purple-200">
          <Switch checked={form.published} onCheckedChange={setField('published')} aria-label="Опубликовано" />
          Опубликовано
        </label>
        <label className="flex items-center gap-2 text-sm text-purple-200">
          <Switch checked={form.decor} onCheckedChange={setField('decor')} aria-label="Товар-декор" />
          Товар-декор (только в анимации главной, скрыт из каталога)
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-purple-500/20 pt-4">
        <GlassButton type="button" tone="ghost" onClick={onCancel}>Отмена</GlassButton>
        <GlassButton type="submit" tone="primary" disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Save className="mr-2 h-4 w-4" aria-hidden />}
          Сохранить
        </GlassButton>
      </div>
    </form>
  )
}

export default ProductForm
