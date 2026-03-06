import { useState } from 'react'

import { X, Timer, CheckSquare, Music } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export function WelcomePopup() {
    const { t } = useLanguage()
    const [isOpen, setIsOpen] = useState(() => {
        if (typeof window === 'undefined') return false
        return !localStorage.getItem('hasSeenWelcome')
    })

    const handleClose = () => {
        setIsOpen(false)
        localStorage.setItem('hasSeenWelcome', 'true')
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={handleClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-tomato/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <div className="p-8 relative">
                    <button
                        onClick={handleClose}
                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X size={20} />
                    </button>

                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-tomato/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                            🍅
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                            {t('welcomeTitle')}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400">
                            {t('welcomeSubtitle')}
                        </p>
                    </div>

                    <div className="grid gap-6 mb-8">
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-none transition-all">
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-500 dark:text-red-400">
                                <Timer size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t('featureFocus')}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('featureFocusDesc')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-none transition-all">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-500 dark:text-green-400">
                                <CheckSquare size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t('featureTasks')}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('featureTasksDesc')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-none transition-all">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-500 dark:text-blue-400">
                                <Music size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t('featureNoise')}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('featureNoiseDesc')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        className="w-full py-4 rounded-xl bg-tomato text-white font-bold text-lg
                       hover:bg-tomato-deep shadow-lg shadow-tomato/30 hover:shadow-tomato/40 
                       transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {t('startJourney')}
                    </button>
                </div>
            </div>
        </div>
    )
}
