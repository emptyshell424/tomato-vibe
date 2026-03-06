'use client'

import { useEffect, useRef } from 'react'

export type WhiteNoiseType = 'none' | 'rain' | 'cafe'

const NOISE_URLS: Record<Exclude<WhiteNoiseType, 'none'>, string> = {
    rain: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
    cafe: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
}

interface UseWhiteNoiseProps {
    type: WhiteNoiseType
    volume: number
    enabled: boolean
}

export function useWhiteNoise({ type, volume, enabled }: UseWhiteNoiseProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        // Cleanup previous audio if it exists
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.src = ''
            audioRef.current = null
        }

        if (type === 'none' || !enabled) return

        const audio = new Audio(NOISE_URLS[type])
        audio.loop = true
        audio.volume = volume
        audioRef.current = audio

        const playAudio = async () => {
            try {
                await audio.play()
            } catch (err) {
                console.warn('White noise autoplay failed:', err)
                // Fallback for browser interaction requirement
                const playOnGesture = () => {
                    audio.play().catch(e => console.error('Gesture play failed:', e))
                    window.removeEventListener('click', playOnGesture)
                }
                window.addEventListener('click', playOnGesture)
            }
        }

        playAudio()

        return () => {
            if (audio) {
                audio.pause()
                audio.src = ''
            }
            audioRef.current = null
        }
    }, [type, enabled, volume])

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume
        }
    }, [volume])

    return {}
}

