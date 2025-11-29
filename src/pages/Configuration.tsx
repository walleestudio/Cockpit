import React, { useEffect, useState, useMemo } from 'react'
import { Save, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { ConfigService, type GameConfig, type ConfigCategory } from '../services/configService'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'

export const Configuration: React.FC = () => {
    const [configs, setConfigs] = useState<GameConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState<string | null>(null)
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)

    const loadConfigurations = async () => {
        try {
            setLoading(true)
            const data = await ConfigService.getConfigurations()
            setConfigs(data)
            setError(null)
        } catch (err) {
            setError('Erreur lors du chargement des configurations')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadConfigurations()
    }, [])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const handleSave = async (key: string, value: string) => {
        setSaving(key)
        try {
            await ConfigService.updateConfiguration(key, value)
            setToast({ type: 'success', message: 'Configuration sauvegardée' })
            await loadConfigurations()
        } catch (err) {
            setToast({ type: 'error', message: `Erreur: ${(err as Error).message}` })
        } finally {
            setSaving(null)
        }
    }

    const categorizedConfigs = useMemo(() => {
        const categories: ConfigCategory[] = [
            { name: 'Limites de Temps', configs: [] },
            { name: 'Kill Switches', configs: [] },
            { name: 'Offres Premium', configs: [] },
            { name: 'Système', configs: [] },
            { name: 'Debug', configs: [] }
        ]

        configs.forEach(config => {
            if (config.config_key.includes('limit')) {
                categories[0].configs.push(config)
            } else if (config.config_key.includes('kill_switch')) {
                categories[1].configs.push(config)
            } else if (config.config_key.includes('premium') || config.config_key.includes('ad_frequency')) {
                categories[2].configs.push(config)
            } else if (config.config_key.includes('analytics') || config.config_key.includes('refresh') || config.config_key.includes('format')) {
                categories[3].configs.push(config)
            } else {
                categories[4].configs.push(config)
            }
        })

        return categories.filter(cat => cat.configs.length > 0)
    }, [configs])

    if (loading && configs.length === 0) return <LoadingSpinner />
    if (error) return <ErrorAlert message={error} />

    return (
        <div className="space-y-8 relative">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2 duration-200 ${toast.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Configuration</h1>
                    <p className="text-text-muted mt-1">Gérer les paramètres de l'application</p>
                </div>
                <button
                    onClick={loadConfigurations}
                    className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium text-text-muted hover:text-white hover:bg-white/5 transition-colors"
                >
                    <RefreshCw size={16} />
                    Actualiser
                </button>
            </div>

            <div className="grid gap-8">
                {categorizedConfigs.map(category => (
                    <div key={category.name} className="space-y-4">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <div className="w-1 h-6 bg-primary rounded-full" />
                            {category.name}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {category.configs.map(config => (
                                <ConfigCard
                                    key={config.config_key}
                                    config={config}
                                    onSave={handleSave}
                                    isSaving={saving === config.config_key}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

interface ConfigCardProps {
    config: GameConfig
    onSave: (key: string, value: string) => Promise<void>
    isSaving: boolean
}

const ConfigCard: React.FC<ConfigCardProps> = ({ config, onSave, isSaving }) => {
    const [value, setValue] = useState(config.config_value)
    const [isDirty, setIsDirty] = useState(false)

    // Reset local state when prop changes (e.g. after refresh)
    useEffect(() => {
        setValue(config.config_value)
        setIsDirty(false)
    }, [config.config_value])

    const handleValueChange = (newValue: string) => {
        setValue(newValue)
        setIsDirty(newValue !== config.config_value)
    }

    const handleSaveClick = () => {
        if (isDirty) {
            onSave(config.config_key, value)
        }
    }

    const isBoolean = config.config_value === 'true' || config.config_value === 'false'
    const isNumber = !isNaN(Number(config.config_value)) && !isBoolean && config.config_key !== 'time_limit_display_format'

    return (
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4 hover:border-primary/30 transition-colors group">
            <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-medium text-white break-all font-mono text-sm">{config.config_key}</h3>
                    {isDirty && (
                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" title="Modifications non enregistrées" />
                    )}
                </div>
                <p className="text-sm text-text-muted line-clamp-2 min-h-[2.5em]">{config.description || 'Aucune description'}</p>
            </div>

            <div className="mt-auto space-y-3">
                {isBoolean ? (
                    <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg border border-white/5">
                        <span className={`text-sm font-medium ${value === 'true' ? 'text-green-400' : 'text-red-400'}`}>
                            {value === 'true' ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                        </span>
                        <button
                            onClick={() => handleValueChange(value === 'true' ? 'false' : 'true')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface ${value === 'true' ? 'bg-primary' : 'bg-white/10'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value === 'true' ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <input
                            type={isNumber ? "number" : "text"}
                            value={value}
                            onChange={(e) => handleValueChange(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors font-mono"
                        />
                    </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-xs text-text-muted">
                        Maj: {new Date(config.updated_at || '').toLocaleDateString('fr-FR')}
                    </span>
                    <button
                        onClick={handleSaveClick}
                        disabled={!isDirty || isSaving}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isDirty
                            ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                            : 'bg-white/5 text-text-muted cursor-not-allowed'
                            }`}
                    >
                        {isSaving ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={14} />
                        )}
                        {isSaving ? '...' : 'Sauvegarder'}
                    </button>
                </div>
            </div>
        </div>
    )
}
