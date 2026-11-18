import CheckoutView from '@/components/cart/CheckoutView'

// Оформление заказа /checkout

export const metadata = {
  title: 'Checkout',
  description: 'Complete your 13 STYLES order: fast checkout, secure payment, delivery across Europe in 1–3 days.',
  alternates: { canonical: '/checkout' },
  robots: { index: false, follow: true },
}

const CheckoutPage = () => <CheckoutView />

export default CheckoutPage
