import { useState, useRef, useEffect } from 'react'
import { Dashboard } from './components/Dashboard'
import { RewardPopup } from './components/RewardPopup'
import { useGeoLocation } from './hooks/useGeoLocation'
import { useMotionSensors } from './hooks/useMotionSensors'
import { useFaceTracker } from './hooks/useFaceTracker'
import { format } from 'date-fns'
import logo from './assets/logo.png'

function App() {
  const [isRunning, setIsRunning] = useState(false)
  const [events, setEvents] = useState([])
  const [reward, setReward] = useState(null)
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
  const { jerkCount, turnCount, bumpCount, requestPermission, permissionGranted } = useMotionSensors(isRunning, handleEvent)
  const { distractionCount, isLoaded: messageLoaded, debugInfo } = useFaceTracker(isRunning, videoRef, handleEvent)

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
        setReward(null)
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

      // Generate Rewards
      const earnedCoins = Math.floor(Math.random() * 90) + 10 // 10 to 100 coins
      setReward({ coins: earnedCoins })

      // Export Data
      downloadLogs()
    }
  }

  const downloadLogs = () => {
    return
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
    turnCount,
    bumpCount,
    distractionCount
  }

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col font-sans" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="px-3 py-2 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md z-10 shrink-0">
        <img src={logo} alt="GoodWheel.world" className="h-7 object-contain" />
        <div className="flex gap-2 items-center">
          <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs text-gray-400 font-mono uppercase">{isRunning ? 'REC' : 'IDLE'}</span>
        </div>
      </header>

      <main className="flex-1 overflow-hidden px-3 py-2 flex flex-col">
        <Dashboard metrics={metrics} isRunning={isRunning} />

        {/* Camera Preview */}
        <div className="rounded-xl overflow-hidden bg-black aspect-[3/4] relative border border-zinc-800 shadow-2xl mx-auto w-full max-w-[160px] mt-2 shrink-0">
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
          <div className="text-center mt-2">
            <p className="text-xs text-yellow-500">iOS requires permission for sensors</p>
          </div>
        )}

        <div className="text-xs text-zinc-600 font-mono mt-2">
          Events: {events.length}
        </div>

        {isRunning && (
          <div className="text-[10px] text-zinc-700 font-mono">
            {debugInfo || "Loading model..."}
          </div>
        )}

      </main>

      <footer className="px-3 py-3 bg-zinc-900/80 backdrop-blur border-t border-zinc-800 shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <button
          onClick={toggleMonitoring}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-lg ${isRunning
            ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20'
            : 'bg-[#34D399] text-zinc-950 hover:bg-[#2cc18b] shadow-[#34D399]/20'
            }`}
        >
          {isRunning ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
      </footer>

      {reward && (
        <RewardPopup
          coins={reward.coins}
          onClose={() => setReward(null)}
        />
      )}
    </div>
  )
}

export default App
