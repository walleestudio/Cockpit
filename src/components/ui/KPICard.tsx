import React from 'react'
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { MetricHelp } from './MetricHelp'

interface KPICardProps {
    title: string
    value: string | number
    trend?: number
    trendLabel?: string
    icon?: LucideIcon
    color?: string
    help?: {
        definition: string
        usage: string
    }
}

export const KPICard: React.FC<KPICardProps> = ({
    title,
    value,
    trend,
    trendLabel,
    icon: Icon,
    help
}) => {
    const isPositive = trend && trend > 0
    const isNeutral = !trend || trend === 0

    return (
        <div className="bg-surface border border-border rounded-xl p-6 hover:border-white/10 transition-colors duration-300 group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">{title}</h3>
                    {help && <MetricHelp title={title} definition={help.definition} usage={help.usage} />}
                </div>
                {Icon && (
                    <div className="p-2 bg-white/5 rounded-lg text-text-muted group-hover:text-white transition-colors">
                        <Icon size={16} />
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <div className="text-3xl font-bold text-white tracking-tight">
                    {value}
                </div>

                {(trend !== undefined || trendLabel) && (
                    <div className="flex items-center gap-2 text-sm">
                        {trend !== undefined && (
                            <span className={clsx(
                                "flex items-center font-medium",
                                isPositive ? "text-success" : isNeutral ? "text-text-muted" : "text-red-500"
                            )}>
                                {isPositive ? <ArrowUpRight size={16} /> : !isNeutral && <ArrowDownRight size={16} />}
                                {Math.abs(trend)}%
                            </span>
                        )}
                        {trendLabel && (
                            <span className="text-text-muted text-xs">
                                {trendLabel}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
