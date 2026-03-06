'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ErrorContent() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle size={32} />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Login encountered a problem
                </h1>

                <p className="text-gray-500 dark:text-gray-400 mb-8">
                    {error || 'Verification failed. Please try again later.'}
                </p>

                <div className="space-y-3">
                    <Link
                        href="/"
                        className="block w-full py-3 px-6 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold
                     shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all hover:scale-[1.02]"
                    >
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function AuthCodeError() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <ErrorContent />
        </Suspense>
    )
}
