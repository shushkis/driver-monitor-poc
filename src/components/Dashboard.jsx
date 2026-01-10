import { Gauge, Activity, EyeOff, AlertTriangle, RotateCw } from 'lucide-react'
import { cn } from '../lib/utils'

function MetricCard({ title, value, unit, icon: Icon, alert, color }) {
    return (
        <div className={cn(
            "p-2.5 rounded-lg border bg-card text-card-foreground shadow-sm flex flex-col",
            alert ? "border-red-500/50 bg-red-500/10" : "border-zinc-800 bg-zinc-900"
        )}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-zinc-400 text-xs font-medium">{title}</span>
                <Icon className={cn("w-3.5 h-3.5", color)} />
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tighter">{value}</span>
                {unit && <span className="text-zinc-500 text-xs">{unit}</span>}
            </div>
        </div>
    )
}

export function Dashboard({ metrics, isRunning }) {
    return (
        <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className="col-span-2">
                <MetricCard
                    title="Current Speed"
                    value={Math.round(metrics.speed)}
                    unit="km/h"
                    icon={Gauge}
                    color="text-blue-400"
                    alert={metrics.speed > 50}
                />
            </div>

            <MetricCard
                title="Max Speed Events"
                value={metrics.maxSpeedExceededCount}
                icon={AlertTriangle}
                color="text-orange-400"
            />

            <MetricCard
                title="Harsh Accel/Brake"
                value={metrics.jerkCount}
                icon={Activity}
                color="text-yellow-400"
            />

            <MetricCard
                title="Sharp Turns"
                value={metrics.turnCount}
                icon={RotateCw}
                color="text-indigo-400"
            />

            <MetricCard
                title="Potholes/Speed bumps"
                value={metrics.bumpCount || 0}
                icon={Activity}
                color="text-red-400"
            />

            <div className="col-span-2">
                <MetricCard
                    title="Driver Distractions"
                    value={metrics.distractionCount}
                    icon={EyeOff}
                    color="text-purple-400"
                />
            </div>
        </div>
    )
}
