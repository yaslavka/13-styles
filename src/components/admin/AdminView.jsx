'use client'

import { useEffect, useState } from 'react'
import { LayoutDashboard, Package, ShoppingCart, MessagesSquare, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import useShop from '@/store/useShop'
import AdminAuth from '@/components/admin/AdminAuth'
import AdminDashboard from '@/components/admin/AdminDashboard'
import AdminProducts from '@/components/admin/AdminProducts'
import AdminOrders from '@/components/admin/AdminOrders'
import AdminChat from '@/components/admin/AdminChat'
import GradientText from '@/components/motion/GradientText'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Админ-панель маркетплейса: обзор, товары, заказы, чат техподдержки

const ADMIN_TABS = [
  { value: 'dashboard', label: 'Обзор', icon: LayoutDashboard },
  { value: 'products', label: 'Товары', icon: Package },
  { value: 'orders', label: 'Заказы', icon: ShoppingCart },
  { value: 'chat', label: 'Чат', icon: MessagesSquare },
]

const AdminPanel = () => {
  const navigate = useShop((state) => state.navigate)
  const [categories, setCategories] = useState([])
  const [cacheMode, setCacheMode] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await API.get('/api/categories')
        setCategories(data.categories)
        setCacheMode(data.cacheMode || '')
      } catch (error) {
        toast.error('Категории недоступны', { description: error.message })
      }
    }
    load()
  }, [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          <GradientText styleIndex={4}>ПУЛЬТ УПРАВЛЕНИЯ</GradientText>
        </h1>
        <div className="flex items-center gap-3">
          {cacheMode ? (
            <span className="pixel-corners-sm border border-purple-500/30 bg-purple-500/10 px-2 py-1 font-display text-[11px] text-purple-200">
              cache: {cacheMode}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => navigate('home')}
            className="flex items-center gap-1.5 font-display text-sm text-purple-300 hover:text-orange-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> На витрину
          </button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-5">
        <TabsList className="flex flex-wrap gap-1 border border-purple-500/30 bg-[#0d0c1c] p-1">
          {ADMIN_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-1.5 border border-transparent px-3 py-1.5 font-display text-sm text-purple-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-orange-500 data-[state=active]:text-white"
            >
              <tab.icon className="h-4 w-4" aria-hidden />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard"><AdminDashboard /></TabsContent>
        <TabsContent value="products"><AdminProducts categories={categories} /></TabsContent>
        <TabsContent value="orders"><AdminOrders /></TabsContent>
        <TabsContent value="chat"><AdminChat /></TabsContent>
      </Tabs>
    </div>
  )
}

const AdminView = () => (
  <AdminAuth>
    <AdminPanel />
  </AdminAuth>
)

export default AdminView
