'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseSedentaryReminderProps {
    enabled: boolean
    interval: number // in minutes
}

export function useSedentaryReminder({ enabled, interval }: UseSedentaryReminderProps) {
    const lastReminderTimeRef = useRef<number>(0)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const sendNotification = useCallback(() => {
        if (typeof window === 'undefined') return

        // Play sound logic similar to usePomodoroTimer
        // Play sound logic
        try {
            const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg')
            audio.volume = 0.5
            audio.play().catch(e => console.error('Play reminder sound failed', e))
        } catch (e) {
            console.error('Failed to play reminder sound', e)
        }

        // Browser notification
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                const stretches = [
                    '转动颈椎：轻轻转动头部，放松颈部肌肉。',
                    '拉伸手臂：双手举过头顶，交叉互握，向上伸展。',
                    '扭转腰部：坐在椅子上，向左右两侧转动上半身。',
                    '眼部放松：眺望远方，或做眼保健操。',
                    '起立深蹲：做10个深蹲，激活腿部血液循环。',
                    '耸肩放松：用力耸肩，保持5秒后放松。'
                ]
                const randomStretch = stretches[Math.floor(Math.random() * stretches.length)]

                new Notification('久坐提醒：该动一动了！', {
                    body: `即使是专注工作，也要注意身体哦。\n建议：${randomStretch}`,
                    icon: '/favicon.ico',
                    requireInteraction: true
                })
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission()
            }
        }

        // Fallback alert if needed (optional, maybe too intrusive)
        // alert('该起身活动一下啦！')
    }, [])

    useEffect(() => {
        if (!enabled) {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
            return
        }

        // Reset reminder time when enabled or interval changes
        lastReminderTimeRef.current = Date.now()

        timerRef.current = setInterval(() => {
            const now = Date.now()
            const elapsedMinutes = (now - lastReminderTimeRef.current) / 1000 / 60

            if (elapsedMinutes >= interval) {
                sendNotification()
                lastReminderTimeRef.current = now
            }
        }, 10000) // Check every 10 seconds

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }, [enabled, interval, sendNotification])

    const resetReminder = useCallback(() => {
        lastReminderTimeRef.current = Date.now()
    }, [])

    return { resetReminder }
}

