import PaymentResultView from '@/components/payment/PaymentResultView'

// Страница результата оплаты: покупатель возвращается с DOKU сюда
// (?order=CODE), статус подтягивается с сервера опросом.

export const metadata = {
  title: 'Статус оплаты',
  robots: { index: false, follow: false },
}

const PaymentResultPage = () => <PaymentResultView />

export default PaymentResultPage
