import { useState, useEffect, useRef } from 'react'
import { differenceInSeconds } from 'date-fns'

export const useGeoLocation = (isRunning, onEvent) => {
    const [speed, setSpeed] = useState(0) // km/h
    const [coordinates, setCoordinates] = useState(null)
    const [maxSpeedExceededCount, setMaxSpeedCount] = useState(0)

    // Config
    const SPEED_LIMIT = 50 // km/h
    const COOLDOWN_SECONDS = 10

    const lastSpeedEventTime = useRef(0)
    const watchId = useRef(null)

    useEffect(() => {
        if (!isRunning) {
            setSpeed(0)
            if (watchId.current) navigator.geolocation.clearWatch(watchId.current)
            return
        }

        const handlePosition = (position) => {
            const { latitude, longitude, speed: speedMPS } = position.coords
            const currentSpeedKmh = (speedMPS || 0) * 3.6

            setCoordinates({ lat: latitude, lng: longitude })
            setSpeed(currentSpeedKmh)

            const now = Date.now()
            if (currentSpeedKmh > SPEED_LIMIT) {
                if (differenceInSeconds(now, lastSpeedEventTime.current) > COOLDOWN_SECONDS) {
                    setMaxSpeedCount(prev => prev + 1)
                    lastSpeedEventTime.current = now

                    onEvent('SPEED_EXCEEDED', {
                        speed: currentSpeedKmh.toFixed(1),
                        lat: latitude,
                        lng: longitude
                    })
                }
            }
        }

        const handleError = (error) => {
            console.error("GPS Error", error)
        }

        watchId.current = navigator.geolocation.watchPosition(
            handlePosition,
            handleError,
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        )

        return () => {
            if (watchId.current) navigator.geolocation.clearWatch(watchId.current)
        }
    }, [isRunning])

    return { speed, coordinates, maxSpeedExceededCount }
}
