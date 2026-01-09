import { useState, useEffect, useRef } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

export const useFaceTracker = (isRunning, videoRef, onEvent) => {
    const [distractionCount, setDistractionCount] = useState(0)
    const [isLoaded, setIsLoaded] = useState(false)

    const faceLandmarkerRef = useRef(null)
    const lastVideoTimeRef = useRef(-1)
    const requestRef = useRef(null)

    const distractionFrames = useRef(0)
    const DISTRACTION_THRESHOLD_FRAMES = 30

    useEffect(() => {
        const loadModel = async () => {
            const filesetResolver = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
            )
            faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                    delegate: "GPU"
                },
                outputFaceBlendshapes: true,
                runningMode: "VIDEO",
                numFaces: 1
            })
            setIsLoaded(true)
        }
        loadModel()
    }, [])

    const [debugInfo, setDebugInfo] = useState("")

    useEffect(() => {
        if (isRunning && isLoaded && videoRef.current) {
            requestRef.current = requestAnimationFrame(detect)
        } else {
            distractionFrames.current = 0
            if (requestRef.current) cancelAnimationFrame(requestRef.current)
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current)
        }
    }, [isRunning, isLoaded])

    const detect = () => {
        if (!faceLandmarkerRef.current || !videoRef.current) return

        const video = videoRef.current
        if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime
            const results = faceLandmarkerRef.current.detectForVideo(video, performance.now())

            // Update debug info occasionally to avoid React render thrashing
            if (performance.now() % 500 < 20) {
                setDebugInfo(`Faces: ${results.faceLandmarks?.length || 0} | Shapes: ${results.faceBlendshapes?.[0]?.categories?.length || 0}`)
            }

            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                // Check if Looking AT camera (Distraction)
                // Heuristic: If face is detected, we assume looking at phone for PoC unless we do vector math.
                // Ideally: Calculate Euler angles.
                // For now: Count frames where face is present.

                distractionFrames.current += 1
                if (distractionFrames.current === DISTRACTION_THRESHOLD_FRAMES) {
                    setDistractionCount(prev => prev + 1)
                    onEvent('DISTRACTION', { value: 'Looked at Phone > 1s' })
                }
            } else {
                distractionFrames.current = 0
            }
        }

        requestRef.current = requestAnimationFrame(detect)
    }

    return { distractionCount, isLoaded, debugInfo }
}
