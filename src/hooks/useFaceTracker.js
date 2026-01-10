import { useState, useEffect, useRef } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

export const useFaceTracker = (isRunning, videoRef, onEvent) => {
    const [distractionCount, setDistractionCount] = useState(0)
    const [isLoaded, setIsLoaded] = useState(false)
    const [debugInfo, setDebugInfo] = useState("Loading model...")

    const faceLandmarkerRef = useRef(null)
    const lastVideoTimeRef = useRef(-1)
    const requestRef = useRef(null)

    const distractionFrames = useRef(0)
    const DISTRACTION_THRESHOLD_FRAMES = 45

    // FPS tracking
    const lastFrameTimeRef = useRef(performance.now())
    const fpsRef = useRef(0)

    useEffect(() => {
        const loadModel = async () => {
            try {
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
                setDebugInfo("Model Loaded")
            } catch (e) {
                console.error(e)
                setDebugInfo(`Load Error: ${e.message}`)
            }
        }
        loadModel()
    }, [])

    const detect = () => {
        if (!faceLandmarkerRef.current || !videoRef.current) return

        const video = videoRef.current
        if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime
            const results = faceLandmarkerRef.current.detectForVideo(video, performance.now())

            // Calculate FPS
            const now = performance.now()
            const deltaTime = now - lastFrameTimeRef.current
            if (deltaTime > 0) {
                fpsRef.current = Math.round(1000 / deltaTime)
            }
            lastFrameTimeRef.current = now

            // Update debug info occasionally to avoid React render thrashing
            if (performance.now() % 500 < 20) {
                setDebugInfo(`FPS: ${fpsRef.current} | Faces: ${results.faceLandmarks?.length || 0} | Shapes: ${results.faceBlendshapes?.[0]?.categories?.length || 0}`)
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

    return { distractionCount, isLoaded, debugInfo }
}
