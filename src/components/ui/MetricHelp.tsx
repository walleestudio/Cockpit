import React, { useState } from 'react'
import { HelpCircle } from 'lucide-react'

interface MetricHelpProps {
    title: string
    definition: string
    usage: string
}

export const MetricHelp: React.FC<MetricHelpProps> = ({ title, definition, usage }) => {
    const [isVisible, setIsVisible] = useState(false)

    return (
        <div className="relative inline-flex items-center ml-2">
            <button
                type="button"
                className="text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                onClick={() => setIsVisible(!isVisible)}
                aria-label={`Help for ${title}`}
            >
                <HelpCircle size={16} />
            </button>

            {isVisible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 text-left">
                    <div className="text-sm font-semibold text-white mb-2">{title}</div>
                    <div className="space-y-3">
                        <div>
                            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Définition</div>
                            <p className="text-xs text-slate-300 leading-relaxed">{definition}</p>
                        </div>
                        <div>
                            <div className="text-xs font-medium text-green-400 uppercase tracking-wider mb-1">Utilité</div>
                            <p className="text-xs text-slate-300 leading-relaxed">{usage}</p>
                        </div>
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-slate-700" />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[2px] border-8 border-transparent border-t-slate-900" />
                </div>
            )}
        </div>
    )
}
