'use client'

import { motion } from 'framer-motion'
import { LayoutDashboard, Package, Shapes, GitBranch, PackagePlus, ShoppingCart, MessagesSquare, ArrowLeft, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import useShop from '@/store/useShop'
import AdminAuth from '@/components/admin/AdminAuth'
import AdminDashboard from '@/components/admin/AdminDashboard'
import AdminProducts from '@/components/admin/AdminProducts'
import AdminCategories from '@/components/admin/AdminCategories'
import AdminSubcategories from '@/components/admin/AdminSubcategories'
import AdminProductFormPage from '@/components/admin/AdminProductFormPage'
import AdminOrders from '@/components/admin/AdminOrders'
import AdminChat from '@/components/admin/AdminChat'
import GradientText from '@/components/motion/GradientText'

// Админ-панель 13 STYLES: сайдбар со страницами (главная, товары, категории,
// подкатегории, форма добавления товара, заказы, чат) + контент раздела

const ADMIN_SECTIONS = [
  { slug: '', label: 'Главная', icon: LayoutDashboard },
  { slug: 'products', label: 'Товары', icon: Package },
  { slug: 'categories', label: 'Категории товаров', icon: Shapes },
  { slug: 'subcategories', label: 'Подкатегории товаров', icon: GitBranch },
  { slug: 'product-new', label: 'Форма добавления товара', icon: PackagePlus },
  { slug: 'orders', label: 'Заказы', icon: ShoppingCart },
  { slug: 'chat', label: 'Чат поддержки', icon: MessagesSquare },
]

const AdminSidebar = ({ active }) => {
  const navigate = useShop((state) => state.navigate)

  const logout = () => {
    API.admin.clearToken()
    toast.success('Вы вышли из админки')
    window.location.reload()
  }

  const go = (slug) => navigate('admin', { slug })

  return (
    <nav aria-label="Разделы админ-панели">
      <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {ADMIN_SECTIONS.map((section) => {
          const isActive = active === section.slug
          return (
            <li key={section.slug || 'dashboard'} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => go(section.slug)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-2.5 whitespace-nowrap rounded-2xl px-3.5 py-2.5 text-left font-display text-sm font-bold transition-all lg:whitespace-normal ${
                  isActive
                    ? 'glass-btn glass-btn-primary text-white'
                    : 'glass-btn glass-btn-ghost text-purple-200 hover:text-white'
                }`}
              >
                <section.icon className="h-4 w-4 shrink-0" aria-hidden />
                {section.label}
              </button>
            </li>
          )
        })}
        <li className="shrink-0 lg:mt-2 lg:shrink lg:border-t lg:border-purple-500/20 lg:pt-3">
          <button
            type="button"
            onClick={logout}
            className="glass-btn glass-btn-ghost flex w-full items-center gap-2.5 whitespace-nowrap rounded-2xl px-3.5 py-2.5 text-left font-display text-sm font-bold text-orange-200"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Выйти
          </button>
        </li>
      </ul>
    </nav>
  )
}

const AdminPanel = () => {
  const route = useShop((state) => state.route)
  const navigate = useShop((state) => state.navigate)
  const section = route.slug || ''

  const renderSection = () => {
    switch (section) {
      case 'products':
        return <AdminProducts />
      case 'categories':
        return <AdminCategories />
      case 'subcategories':
        return <AdminSubcategories />
      case 'product-new':
        return <AdminProductFormPage editId={route.query.id || ''} />
      case 'orders':
        return <AdminOrders />
      case 'chat':
        return <AdminChat />
      default:
        return <AdminDashboard />
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          <GradientText styleIndex={4}>ПУЛЬТ УПРАВЛЕНИЯ</GradientText>
        </h1>
        <button
          type="button"
          onClick={() => navigate('home')}
          className="flex items-center gap-1.5 font-display text-sm text-purple-300 hover:text-orange-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> На витрину
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="self-start lg:sticky lg:top-[96px]">
          <AdminSidebar active={section} />
        </aside>

        <motion.section
          key={section}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="min-w-0"
        >
          {renderSection()}
        </motion.section>
      </div>
    </div>
  )
}

const AdminView = () => (
  <AdminAuth>
    <AdminPanel />
  </AdminAuth>
)

export default AdminView
