import { Suspense } from 'react'
import AccountView from '@/components/account/AccountView'

// Личный кабинет /account (табы через ?tab=orders | payments)

export const metadata = {
  title: 'My account',
  description: 'Your 13 STYLES account: profile settings, order history and saved payment methods.',
  alternates: { canonical: '/account' },
  robots: { index: false, follow: true },
}

const AccountPage = () => (
  <Suspense>
    <AccountView />
  </Suspense>
)

export default AccountPage
