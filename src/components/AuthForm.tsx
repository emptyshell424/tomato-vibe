'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'

interface AuthFormProps {
  onSuccess?: () => void
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const { t } = useLanguage()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp, signInWithGoogle } = useAuth()

  const handleGoogleLogin = async () => {
    try {
      setError('')
      setLoading(true)
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('googleLoginFailed'))
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorOccurred'))
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-gray-700 overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-tomato/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-orange-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <motion.div
            layout
            className="text-center mb-8"
          >
            <motion.div
              initial={false}
              animate={{ rotate: isLogin ? 0 : 360 }}
              transition={{ type: 'spring', duration: 1.5 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-tomato to-orange-500 text-white mb-4 shadow-lg shadow-tomato/30"
            >
              <Sparkles size={32} />
            </motion.div>
            <motion.h2
              key={isLogin ? 'login-title' : 'register-title'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-gray-900 dark:text-white"
            >
              {isLogin ? t('welcomeBack') : t('startJourneyAuth')}
            </motion.h2>
            <motion.p
              key={isLogin ? 'login-subtitle' : 'register-subtitle'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-gray-500 dark:text-gray-400 mt-2 text-sm"
            >
              {isLogin ? t('loginSubtitle') : t('registerSubtitle')}
            </motion.p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                  {t('email')}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-tomato transition-colors" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600
                             bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-tomato/20 focus:border-tomato transition-all outline-none"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                  {t('password')}
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-tomato transition-colors" size={20} />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600
                             bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-tomato/20 focus:border-tomato transition-all outline-none"
                    placeholder="******"
                  />
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-red-50/80 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm overflow-hidden"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-tomato to-orange-500 text-white font-bold
                       shadow-xl shadow-tomato/20 hover:shadow-tomato/30
                       disabled:opacity-70 disabled:cursor-not-allowed transition-all
                       flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span>{isLogin ? t('login') : t('registerNow')}</span>
                  <ArrowRight size={20} />
                </>
              )}
            </motion.button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
            <span className="text-sm text-gray-400">{t('or')}</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700
                     bg-white/50 dark:bg-gray-700/30 text-gray-700 dark:text-gray-200 font-medium
                     hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors
                     flex items-center justify-center gap-2 group"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>{t('googleLogin')}</span>
          </button>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLogin ? t('noAccount') : t('hasAccount')}
              <button
                onClick={toggleMode}
                className="ml-2 font-semibold text-tomato hover:text-tomato-deep dark:hover:text-tomato transition-colors"
              >
                {isLogin ? t('clickToRegister') : t('goToLogin')}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
