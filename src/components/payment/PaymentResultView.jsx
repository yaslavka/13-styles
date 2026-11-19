'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Hourglass, ArrowLeft, ExternalLink } from 'lucide-react'
import API from '@/lib/api'
import useShop from '@/store/useShop'
import useCart from '@/store/useCart'
import useT from '@/hooks/useT'
import GlassButton from '@/components/motion/GlassButton'
import GradientText from '@/components/motion/GradientText'

// Статус оплаты DOKU: опрашиваем /api/payments/doku/state пока идёт подтверждение.
// При успехе снимаем оплаченные позиции из корзины — товар пропадает из корзины
// только после успешной оплаты или если покупатель удалил его вручную.

const PaymentResultView = () => {
  const navigate = useShop((state) => state.navigate)
  const locale = useShop((state) => state.locale)
  const t = useT()
  const [orderCode, setOrderCode] = useState('')
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const attemptsRef = useRef(0)
  const clearedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('order') || ''
      const canceled = params.get('canceled') === '1'
      if (cancelled) return
      setOrderCode(code)
      if (!code) {
        setLoading(false)
        return
      }
      // Покупатель отменил оплату на странице DOKU — просто показываем статус
      if (canceled) setState((prev) => ({ ...(prev || {}), status: 'canceled' }))

      const poll = async () => {
        try {
          const data = await API.get(`/api/payments/doku/state?order=${encodeURIComponent(code)}`)
          if (cancelled) return
          setState(data)
          attemptsRef.current += 1
          // Уведомление от DOKU может приходить с задержкой — опрашиваем до ~4 минут
          if (['pending'].includes(data.status) && attemptsRef.current < 48) {
            setTimeout(poll, 5000)
          } else {
            setLoading(false)
            // Оплата успешна — снимаем оплаченные позиции из корзины (один раз)
            if (data.status === 'success' && !clearedRef.current) {
              clearedRef.current = true
              const keys = (data.items || []).map((item) => `${item.slug}__${item.size || 'one'}`)
              for (const key of keys) useCart.getState().remove(key)
            }
          }
        } catch {
          if (cancelled) return
          attemptsRef.current += 1
          if (attemptsRef.current < 8) setTimeout(poll, 3000)
          else setLoading(false)
        }
      }
      poll()
    }

    const timer = setTimeout(run, 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  const status = state?.status || 'pending'
  const success = status === 'success'
  const failed = ['failed', 'expired', 'canceled'].includes(status)
  const waiting = status === 'pending'

  const statusText = success
    ? t('result.statusPaid')
    : failed
      ? (status === 'expired' ? t('result.statusExpired') : status === 'canceled' ? t('result.statusCanceled') : t('result.statusFailed'))
      : t('result.statusPending')

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-20 text-center sm:px-6">
      {waiting && loading ? (
        <Hourglass className="h-20 w-20 animate-pulse text-amber-300" aria-hidden />
      ) : success ? (
        <CheckCircle2 className="h-20 w-20 text-emerald-400 animate-pop" aria-hidden />
      ) : failed ? (
        <XCircle className="h-20 w-20 text-rose-400" aria-hidden />
      ) : (
        <Hourglass className="h-20 w-20 text-amber-300" aria-hidden />
      )}

      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
        <GradientText styleIndex={4}>
          {!orderCode
            ? t('result.notFound')
            : success
              ? t('result.confirmed')
              : failed
                ? t('result.failedTitle')
                : t('result.waiting')}
        </GradientText>
      </h1>

      {orderCode ? (
        <p className="text-sm font-bold text-purple-200">
          {t('result.order')} <span className="font-display text-lg text-orange-300">{orderCode}</span>
        </p>
      ) : (
        <p className="text-sm text-purple-200">{t('result.noOrderCode')}</p>
      )}

      {state ? (
        <div className="glass-panel w-full space-y-2 p-5 text-left text-sm text-purple-100">
          <p>
            <span className="font-bold text-purple-300">{t('result.status')}:</span> {statusText}
          </p>
          <p><span className="font-bold text-purple-300">{t('result.amount')}:</span> €{Number(state.amountEur || 0).toFixed(2)}</p>
          <p><span className="font-bold text-purple-300">{t('result.toPay')}:</span> {Number(state.amountIdr || 0).toLocaleString(locale === 'en' ? 'en-US' : locale)} IDR</p>
          <p><span className="font-bold text-purple-300">{t('result.rate')}:</span> {state.rate}</p>
          {state.merchant ? <p><span className="font-bold text-purple-300">{t('result.merchant')}:</span> {state.merchant}</p> : null}
          {state.channel ? <p><span className="font-bold text-purple-300">{t('result.method')}:</span> {state.channel}</p> : null}
          {state.invoiceNumber ? <p><span className="font-bold text-purple-300">{t('result.invoice')}:</span> <code className="text-xs">{state.invoiceNumber}</code></p> : null}
        </div>
      ) : null}

      {failed && state?.payUrl ? (
        <GlassButton
          tone="primary"
          onClick={() => window.location.assign(state.payUrl)}
        >
          <ExternalLink className="mr-2 h-4 w-4" aria-hidden /> {t('result.retry')}
        </GlassButton>
      ) : null}

      <div className="flex flex-wrap justify-center gap-4">
        <GlassButton tone="ghost" onClick={() => navigate('catalog')}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> {t('result.toCatalog')}
        </GlassButton>
        <GlassButton tone="ghost" onClick={() => navigate('account')}>
          {t('result.myOrders')}
        </GlassButton>
      </div>
    </div>
  )
}

export default PaymentResultView
