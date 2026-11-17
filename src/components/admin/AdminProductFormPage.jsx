'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, PackagePlus } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import useShop from '@/store/useShop'
import ProductForm from '@/components/admin/ProductForm'
import GlassButton from '@/components/motion/GlassButton'
import GradientText from '@/components/motion/GradientText'

// Страница формы товара в админке: добавление и редактирование (не модалка)

const AdminProductFormPage = ({ editId = '' }) => {
  const navigate = useShop((state) => state.navigate)
  const [categories, setCategories] = useState([])
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(Boolean(editId))

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await API.get('/api/categories')
        if (!cancelled) setCategories(data.categories || [])
      } catch (error) {
        if (!cancelled) toast.error('Категории недоступны', { description: error.message })
      }

      if (!editId) return
      try {
        const data = await API.admin.get(`/api/admin/products/${editId}`)
        if (!cancelled) setProduct(data.product)
      } catch (error) {
        if (!cancelled) {
          toast.error('Товар не найден', { description: error.message })
          navigate('admin', { slug: 'products' })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [editId, navigate])

  const backToProducts = () => navigate('admin', { slug: 'products' })

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" aria-label="Загрузка товара" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-display text-2xl font-bold text-white">
          <PackagePlus className="h-6 w-6 text-orange-300" aria-hidden />
          {product ? 'Редактирование товара' : 'Добавить товар'}
        </h2>
        <GlassButton tone="ghost" onClick={backToProducts} className="h-10">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> К списку товаров
        </GlassButton>
      </div>

      {categories.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <p className="font-display text-lg font-bold text-orange-200">
            <GradientText styleIndex={7}>Сначала создайте категорию</GradientText>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Товар не может существовать без категории каталога.</p>
          <GlassButton tone="primary" className="mt-5" onClick={() => navigate('admin', { slug: 'categories' })}>
            Перейти к категориям
          </GlassButton>
        </div>
      ) : (
        <div className="glass-panel p-5 sm:p-6">
          <ProductForm product={product} categories={categories} onSaved={backToProducts} onCancel={backToProducts} />
        </div>
      )}
    </div>
  )
}

export default AdminProductFormPage
