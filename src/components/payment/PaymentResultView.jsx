'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Hourglass, ArrowLeft, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import useShop from '@/store/useShop'
import GlassButton from '@/components/motion/GlassButton'
import GradientText from '@/components/motion/GradientText'

// Статус оплаты DOKU: опрашиваем /api/payments/doku/state пока идёт подтверждение

const PaymentResultView = () => {
  const navigate = useShop((state) => state.navigate)
  const [orderCode, setOrderCode] = useState('')
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const attemptsRef = useRef(0)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const code = new URLSearchParams(window.location.search).get('order') || ''
      if (cancelled) return
      setOrderCode(code)
      if (!code) {
        setLoading(false)
        return
      }

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
            ? 'Платёж не найден'
            : success
              ? 'Оплата подтверждена'
              : failed
                ? 'Оплата не прошла'
                : 'Ожидаем подтверждение'}
        </GradientText>
      </h1>

      {orderCode ? (
        <p className="text-sm font-bold text-purple-200">
          Заказ <span className="font-display text-lg text-orange-300">{orderCode}</span>
        </p>
      ) : (
        <p className="text-sm text-purple-200">В ссылке отсутствует номер заказа (?order=CODE)</p>
      )}

      {state ? (
        <div className="glass-panel w-full space-y-2 p-5 text-left text-sm text-purple-100">
          <p>
            <span className="font-bold text-purple-300">Статус:</span>{' '}
            {success ? 'оплачен успешно' : failed ? (status === 'expired' ? 'истёк срок оплаты' : status === 'canceled' ? 'отменён' : 'ошибка платежа') : 'ожидание уведомления от DOKU'}
          </p>
          <p><span className="font-bold text-purple-300">Сумма:</span> €{Number(state.amountEur || 0).toFixed(2)}</p>
          <p><span className="font-bold text-purple-300">К оплате:</span> {Number(state.amountIdr || 0).toLocaleString('ru-RU')} IDR</p>
          <p><span className="font-bold text-purple-300">Курс EUR→IDR:</span> {state.rate}</p>
          {state.merchant ? <p><span className="font-bold text-purple-300">Мерчант:</span> {state.merchant}</p> : null}
          {state.channel ? <p><span className="font-bold text-purple-300">Способ оплаты:</span> {state.channel}</p> : null}
          {state.invoiceNumber ? <p><span className="font-bold text-purple-300">Инвойс DOKU:</span> <code className="text-xs">{state.invoiceNumber}</code></p> : null}
        </div>
      ) : null}

      {failed && state?.payUrl ? (
        <GlassButton
          tone="primary"
          onClick={() => window.location.assign(state.payUrl)}
        >
          <ExternalLink className="mr-2 h-4 w-4" aria-hidden /> Попробовать оплатить снова
        </GlassButton>
      ) : null}

      <div className="flex flex-wrap justify-center gap-4">
        <GlassButton tone="ghost" onClick={() => navigate('catalog')}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> В каталог
        </GlassButton>
        <GlassButton tone="ghost" onClick={() => navigate('account')}>
          Мои заказы
        </GlassButton>
      </div>
    </div>
  )
}

export default PaymentResultView
