import { useState, useEffect, useRef, useCallback } from 'react'

export const useMotionSensors = (isRunning, onEvent) => {
    const [jerkCount, setJerkCount] = useState(0)
    const [turnCount, setTurnCount] = useState(0)
    const [bumpCount, setBumpCount] = useState(0)
    const [permissionGranted, setPermissionGranted] = useState(false)

    const ACCEL_THRESHOLD = 3 // m/s^2 (Hard braking/accel)
    const BUMP_THRESHOLD = 3 // m/s^2 (Potholes, Speed bumps)
    const TURN_THRESHOLD = 30 // deg/s

    const lastEventTime = useRef(0)
    const COOLDOWN_MS = 2000

    // Gravity filtering
    const gravity = useRef({ x: 0, y: 0, z: 0 })
    const ALPHA = 0.8

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

        const listener = (event) => {
            const now = Date.now()

            // 1. Process Acceleration
            const { x, y, z } = event.accelerationIncludingGravity || { x: 0, y: 0, z: 0 }

            // Isolate gravity with low-pass filter
            gravity.current.x = ALPHA * gravity.current.x + (1 - ALPHA) * x
            gravity.current.y = ALPHA * gravity.current.y + (1 - ALPHA) * y
            gravity.current.z = ALPHA * gravity.current.z + (1 - ALPHA) * z

            // Linear acceleration (High-pass filter)
            const linearX = x - gravity.current.x
            const linearY = y - gravity.current.y
            const linearZ = z - gravity.current.z

            // 2. Separate Vertical vs Horizontal Force
            // Gravity vector approx indicates "Down" relative to phone
            const gMag = Math.sqrt(gravity.current.x ** 2 + gravity.current.y ** 2 + gravity.current.z ** 2)

            // Normalize gravity direction (if gravity is valid)
            let verticalAccel = 0
            let horizontalAccel = 0

            if (gMag > 1) {
                const gDir = {
                    x: gravity.current.x / gMag,
                    y: gravity.current.y / gMag,
                    z: gravity.current.z / gMag
                }

                // Vertical Component (Dot Product) = Force parallel to gravity (Bumps)
                verticalAccel = Math.abs(linearX * gDir.x + linearY * gDir.y + linearZ * gDir.z)

                // Horizontal Component = Magnitude of (LinearVector - VerticalVector)
                // Or simpler: sqrt(TotalMag^2 - Vertical^2)
                const totalMagSq = linearX ** 2 + linearY ** 2 + linearZ ** 2
                const horizontalAccelSq = totalMagSq - verticalAccel ** 2
                horizontalAccel = horizontalAccelSq > 0 ? Math.sqrt(horizontalAccelSq) : 0
            }

            if (now - lastEventTime.current > COOLDOWN_MS) {
                // Check Bumps (Vertical Shock)
                // Bumps are usually sharp vertical spikes
                if (verticalAccel > BUMP_THRESHOLD) { // Lowered threshold for vertical shock
                    setBumpCount(prev => prev + 1)
                    lastEventTime.current = now
                    onEvent('POTHOLE_BUMP', { value: verticalAccel.toFixed(1) })
                }
                // Check Drive Forces (Horizontal - Accel/Brake)
                else if (horizontalAccel > ACCEL_THRESHOLD) {
                    setJerkCount(prev => prev + 1)
                    lastEventTime.current = now
                    onEvent('HARSH_ACCEL_BRAKE', { value: horizontalAccel.toFixed(1) })
                }
            }

            // 2. Process Rotation (Turns)
            const { alpha, beta, gamma } = event.rotationRate || { alpha: 0, beta: 0, gamma: 0 }
            const maxRot = Math.max(Math.abs(alpha), Math.abs(beta), Math.abs(gamma))

            if (maxRot > TURN_THRESHOLD) {
                if (now - lastEventTime.current > COOLDOWN_MS) {
                    setTurnCount(prev => prev + 1)
                    lastEventTime.current = now
                    onEvent('SHARP_TURN', { value: maxRot.toFixed(1) })
                }
            }
        }

        window.addEventListener('devicemotion', listener)
        return () => window.removeEventListener('devicemotion', listener)
    }, [isRunning, permissionGranted])

    return { jerkCount, turnCount, bumpCount, requestPermission, permissionGranted }
}
