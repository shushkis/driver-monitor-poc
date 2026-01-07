import { useState, useEffect, useRef, useCallback } from 'react'

export const useMotionSensors = (isRunning, onEvent) => {
    const [jerkCount, setJerkCount] = useState(0)
    const [permissionGranted, setPermissionGranted] = useState(false)

    const JERK_THRESHOLD = 15
    const TURN_THRESHOLD = 60 // deg/s

    const lastEventTime = useRef(0)
    const COOLDOWN_MS = 2000

    const requestPermission = useCallback(async () => {
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                const response = await DeviceMotionEvent.requestPermission()
                if (response === 'granted') setPermissionGranted(true)
                else alert('Permission denied')
            } catch (e) {
                console.error(e)
            }
        } else {
            setPermissionGranted(true)
        }
    }, [])

    useEffect(() => {
        if (!isRunning || !permissionGranted) return

        const handleMotion = (event) => {
            const now = Date.now()
            if (now - lastEventTime.current < COOLDOWN_MS) return

            const { x, y, z } = event.acceleration || { x: 0, y: 0, z: 0 }
            const magnitude = Math.sqrt(x * x + y * y + z * z)

            if (magnitude > JERK_THRESHOLD) {
                setJerkCount(prev => prev + 1)
                lastEventTime.current = now
                onEvent('JERK_DETECTED', { value: magnitude.toFixed(1) + ' m/s^2' })
            }
        }

        const handleOrientation = (event) => {
            // Not used if rotationRate is available in deviceMotion, but let's stick to motion listener
        }

        // Listen to rotation rate inside devicemotion if available, otherwise ...
        // Actually rotationRate is part of DeviceMotionEvent
        // But usually accessed via event.rotationRate

        // Let's modify handleMotion to check rotation too
    }, [isRunning, permissionGranted]) // Rerun if permissions change

    // Better implementation merging both checks in one listener
    useEffect(() => {
        if (!isRunning || !permissionGranted) return

        const listener = (event) => {
            const now = Date.now()
            if (now - lastEventTime.current < COOLDOWN_MS) return

            // Jerk
            const { x, y, z } = event.acceleration || { x: 0, y: 0, z: 0 }
            const mag = Math.sqrt(x * x + y * y + z * z)

            if (mag > JERK_THRESHOLD) {
                setJerkCount(prev => prev + 1)
                lastEventTime.current = now
                onEvent('JERK_DETECTED', { value: mag.toFixed(1) })
                return
            }

            // Turn
            const { alpha, beta, gamma } = event.rotationRate || { alpha: 0, beta: 0, gamma: 0 }
            const maxRot = Math.max(Math.abs(alpha), Math.abs(beta), Math.abs(gamma))

            if (maxRot > TURN_THRESHOLD) {
                setJerkCount(prev => prev + 1)
                lastEventTime.current = now
                onEvent('SHARP_TURN', { value: maxRot.toFixed(1) })
            }
        }

        window.addEventListener('devicemotion', listener)
        return () => window.removeEventListener('devicemotion', listener)
    }, [isRunning, permissionGranted])

    return { jerkCount, requestPermission, permissionGranted }
}
