import AdminView from '@/components/admin/AdminView'

// Админ-панель /admin и её разделы /admin/[section] (товары, категории, заказы, ...)
// Реализована одним catch-all маршрутом — единый пульт управления.

export const metadata = {
  title: 'Пульт управления',
  robots: { index: false, follow: false },
}

const AdminPage = async ({ params, searchParams }) => {
  const resolved = await params
  const query = await searchParams
  const section = Array.isArray(resolved?.slug) ? resolved.slug[0] || '' : resolved?.slug || ''
  const editId = typeof query?.id === 'string' ? query.id : ''

  return <AdminView section={section} editId={editId} />
}

export default AdminPage
