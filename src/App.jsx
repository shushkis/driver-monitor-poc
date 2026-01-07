import { useState, useRef, useEffect } from 'react'
import { Dashboard } from './components/Dashboard'
import { useGeoLocation } from './hooks/useGeoLocation'
import { useMotionSensors } from './hooks/useMotionSensors'
import { useFaceTracker } from './hooks/useFaceTracker'
import { format } from 'date-fns'

function App() {
  const [isRunning, setIsRunning] = useState(false)
  const [events, setEvents] = useState([])
  const videoRef = useRef(null)

  // Central Event Logger
  const handleEvent = (type, data = {}) => {
    if (!isRunning) return

    // Get latest GPS from hook? 
    // Actually, hooks have their own state. We can pass current GPS to them or 
    // better, the hook passes GPS when triggering event.

    const timestamp = new Date().toISOString()
    const newEvent = { timestamp, type, ...data }

    setEvents(prev => [...prev, newEvent])
    console.log("Logged Event:", newEvent)
  }

  // Sensors
  const { speed, coordinates, maxSpeedExceededCount } = useGeoLocation(isRunning, handleEvent)
  const { jerkCount, requestPermission, permissionGranted } = useMotionSensors(isRunning, handleEvent)
  const { distractionCount, isLoaded: messageLoaded } = useFaceTracker(isRunning, videoRef, handleEvent)

  const toggleMonitoring = async () => {
    if (!isRunning) {
      // Start
      // 1. Request Motion Permissions (iOS)
      if (!permissionGranted) {
        await requestPermission()
      }
      // 2. Start Camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 480, height: 640 }
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setIsRunning(true)
        setEvents([]) // Clear logs on start? or keep appending? Let's clear.
      } catch (e) {
        alert("Camera access failed: " + e.message)
        console.error(e)
      }
    } else {
      // Stop
      setIsRunning(false)
      // Stop Camera
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop())
        videoRef.current.srcObject = null
      }

      // Export Data
      downloadLogs()
    }
  }

  const downloadLogs = () => {
    if (events.length === 0) return

    const header = "Timestamp,Type,Speed,Lat,Lng,Value\n"
    const csv = header + events.map(e => {
      return `${e.timestamp},${e.type},${e.speed || ''},${e.lat || ''},${e.lng || ''},${e.value || ''}`
    }).join("\n")

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `driver-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Metrics object to pass to Dashboard
  const metrics = {
    speed,
    maxSpeedExceededCount,
    jerkCount,
    distractionCount
  }

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col font-sans">
      <header className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md z-10 shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-blue-400">DriverMon</h1>
        <div className="flex gap-2 items-center">
          <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs text-gray-400 font-mono uppercase">{isRunning ? 'REC' : 'IDLE'}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <Dashboard metrics={metrics} isRunning={isRunning} />

        {/* Camera Preview */}
        <div className="rounded-xl overflow-hidden bg-black aspect-[3/4] relative border border-zinc-800 shadow-2xl mx-auto w-full max-w-[200px] mt-4">
          <video
            ref={videoRef}
            className="w-full h-full object-cover mirror"
            muted
            playsInline
          />
          {!isRunning && (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">
              Camera Off
            </div>
          )}
        </div>

        {!permissionGranted && (
          <div className="text-center">
            <p className="text-xs text-yellow-500 mb-2">iOS requires permission for sensors</p>
          </div>
        )}

        <div className="text-xs text-zinc-600 font-mono">
          Events Logged: {events.length}
        </div>

      </main>

      <footer className="p-4 bg-zinc-900/80 backdrop-blur border-t border-zinc-800 pb-8 shrink-0">
        <button
          onClick={toggleMonitoring}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-lg ${isRunning
              ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20'
              : 'bg-blue-500 text-white hover:bg-blue-400 shadow-blue-500/20'
            }`}
        >
          {isRunning ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
      </footer>
    </div>
  )
}

export default App
