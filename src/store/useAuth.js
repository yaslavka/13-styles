'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import API from '@/lib/api'

// Аккаунт покупателя: токен в localStorage, профиль в сторe.
// init() восстанавливает профиль по /api/auth/me после перезагрузки страницы.

const useAuth = create(
  persist(
    (set) => ({
      user: null,
      authOpen: false,

      setAuthOpen: (open) => set({ authOpen: Boolean(open) }),

      setUser: (user) => set({ user: user || null }),

      init: async () => {
        if (!API.user.hasToken()) return
        try {
          const data = await API.user.get('/api/auth/me')
          set({ user: data.user })
        } catch {
          API.user.clearToken()
          set({ user: null })
        }
      },

      logout: () => {
        API.user.clearToken()
        set({ user: null })
      },
    }),
    {
      name: 'styles-user-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
      skipHydration: true,
    }
  )
)

export default useAuth
