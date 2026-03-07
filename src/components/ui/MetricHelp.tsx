import React, { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

export interface MetricHelpContent {
    title: string
    definition: string
    calculation: string
    utility: string
    interpretation: string
    examples: string
}

interface MetricHelpProps {
    /** Full content (Recommendations page). */
    content?: MetricHelpContent
    /** Legacy: title + definition + usage (CostMetrics, GameInsights, KPICard). */
    title?: string
    definition?: string
    usage?: string
    /** If true, only definition + utility in modal (legacy). */
    compact?: boolean
}

export const MetricHelp: React.FC<MetricHelpProps> = (props) => {
    const { content: contentProp, title: titleProp, definition: definitionProp, usage: usageProp, compact = false } = props
    const [open, setOpen] = useState(false)
    const content: MetricHelpContent = contentProp ?? {
        title: titleProp ?? 'Aide',
        definition: definitionProp ?? '',
        calculation: '-',
        utility: usageProp ?? '',
        interpretation: '-',
        examples: '-'
    }
    const { title, definition, calculation, utility, interpretation, examples } = content
    const showFull = !compact && !!contentProp

    return (
        <>
            <button
                type="button"
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-text-muted hover:text-primary hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                onClick={() => setOpen(true)}
                aria-label={`Aide : ${title}`}
            >
                <HelpCircle size={16} />
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setOpen(false)}>
                    <div
                        className="bg-surface border border-border rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="text-lg font-semibold text-white">{title}</h3>
                            <button
                                type="button"
                                className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-white/10"
                                onClick={() => setOpen(false)}
                                aria-label="Fermer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-4 text-sm">
                            <section>
                                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Définition</h4>
                                <p className="text-text-primary leading-relaxed">{definition}</p>
                            </section>
                            {showFull && (
                                <>
                                    <section>
                                        <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Méthode de calcul</h4>
                                        <p className="text-text-primary leading-relaxed whitespace-pre-wrap">{calculation}</p>
                                    </section>
                                    <section>
                                        <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Utilité</h4>
                                        <p className="text-text-primary leading-relaxed">{utility}</p>
                                    </section>
                                    <section>
                                        <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Interprétation</h4>
                                        <p className="text-text-primary leading-relaxed">{interpretation}</p>
                                    </section>
                                    <section>
                                        <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Exemples</h4>
                                        <p className="text-text-primary leading-relaxed">{examples}</p>
                                    </section>
                                </>
                            )}
                            {(!showFull || compact) && utility && (
                                <section>
                                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Utilité</h4>
                                    <p className="text-text-primary leading-relaxed">{utility}</p>
                                </section>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
