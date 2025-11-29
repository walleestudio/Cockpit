import React, { useState } from 'react'
import { Calendar } from 'lucide-react'

interface DateRangePickerProps {
    startDate: Date
    endDate: Date
    onChange: (start: Date, end: Date) => void
}

const PRESET_RANGES = [
    { label: '7J', days: 7 },
    { label: '30J', days: 30 },
    { label: '90J', days: 90 },
]

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    startDate,
    endDate,
    onChange
}) => {
    const [isOpen, setIsOpen] = useState(false)

    const handlePresetClick = (days: number) => {
        const end = new Date()
        const start = new Date()
        start.setDate(end.getDate() - days)
        onChange(start, end)
        setIsOpen(false)
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-white/5 transition-colors"
            >
                <Calendar size={16} className="text-text-muted" />
                <span>
                    {startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl z-20 p-2 animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-1">
                            {PRESET_RANGES.map((preset) => (
                                <button
                                    key={preset.label}
                                    onClick={() => handlePresetClick(preset.days)}
                                    className="w-full text-left px-3 py-2 text-sm text-text-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    Derniers {preset.days} jours
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
