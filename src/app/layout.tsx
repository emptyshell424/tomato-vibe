import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { TimerProvider } from '@/contexts/TimerContext'
import { LanguageProvider } from '@/contexts/LanguageContext'

export const metadata: Metadata = {
  title: 'Tomato Vibe - Pomodoro Timer',
  description: 'A focused Pomodoro workspace with AI reports, task planning, and a lightweight mood pet.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <AuthProvider>
          <LanguageProvider>
            <TimerProvider>
              {children}
            </TimerProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
