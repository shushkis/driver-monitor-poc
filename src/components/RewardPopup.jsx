import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { X, Coins } from 'lucide-react'

export function RewardPopup({ coins, onClose }) {
    useEffect(() => {
        // Fire confetti
        const duration = 3000
        const end = Date.now() + duration

        const frame = () => {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#34D399', '#60A5FA', '#FBBF24'] // Branding colors
            })
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#34D399', '#60A5FA', '#FBBF24']
            })

            if (Date.now() < end) {
                requestAnimationFrame(frame)
            }
        }

        frame()
    }, [])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full relative shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-zinc-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="w-20 h-20 bg-yellow-400/10 rounded-full flex items-center justify-center mb-4 ring-1 ring-yellow-400/50">
                    <Coins className="w-10 h-10 text-yellow-400" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Great Drive!</h2>
                <p className="text-zinc-400 mb-6">
                    You drove safely and earned rewards for your performance.
                </p>

                <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 w-full mb-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
                    <span className="text-zinc-500 text-xs font-mono uppercase tracking-wider block mb-1">Earned</span>
                    <div className="text-4xl font-bold text-emerald-400 tracking-tighter flex items-center justify-center gap-2">
                        +{coins} <span className="text-lg text-emerald-500/50">GC</span>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-[#34D399] hover:bg-[#2cc18b] text-zinc-950 font-bold py-3 rounded-xl transition-all active:scale-95"
                >
                    Collect Rewards
                </button>
            </div>
        </div>
    )
}
