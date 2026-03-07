import React, { useState } from 'react'
import { Download, FileSpreadsheet, FileJson, Calendar } from 'lucide-react'
import { AnalyticsService } from '../services/analyticsService'
import { DateRangePicker } from '../components/ui/DateRangePicker'
import { MetricHelp } from '../components/ui/MetricHelp'
import { APP_HELP } from '../help/appHelp'

export const Export: React.FC = () => {
    const [isExporting, setIsExporting] = useState(false)
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)),
        end: new Date()
    })

    const handleExport = async (format: 'csv' | 'json') => {
        setIsExporting(true)
        try {
            const days = Math.max(
                1,
                Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
            )
            const data = await AnalyticsService.getDailyMetrics(days)
            const filenameRange = `${dateRange.start.toISOString().split('T')[0]}_${dateRange.end.toISOString().split('T')[0]}`

            let blob: Blob
            if (format === 'csv') {
                const headers = [
                    'date',
                    'unique_players',
                    'total_play_time_hours',
                    'total_sessions',
                    'avg_session_duration_minutes',
                    'total_purchase_attempts',
                    'total_purchase_successes'
                ]
                const rows = data.map(row => [
                    row.date,
                    row.unique_players,
                    row.total_play_time_hours,
                    row.total_sessions,
                    row.avg_session_duration_minutes,
                    row.total_purchase_attempts,
                    row.total_purchase_successes
                ])
                const csvContent = [
                    headers.join(','),
                    ...rows.map(values => values.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
                ].join('\n')
                blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            } else {
                blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            }

            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `analytics_export_${filenameRange}.${format}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Export failed:', error)
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Export Données</h1>
                    <p className="text-text-muted mt-1">Télécharger les rapports d'analyse</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Calendar size={20} className="text-primary" />
                        Période d'export
                        <MetricHelp content={APP_HELP['export-periode']} />
                    </h3>
                    <div className="space-y-4">
                        <p className="text-text-muted text-sm">
                            Sélectionnez la plage de dates pour laquelle vous souhaitez exporter les données.
                        </p>
                        <div className="flex justify-start">
                            <DateRangePicker
                                startDate={dateRange.start}
                                endDate={dateRange.end}
                                onChange={(start, end) => setDateRange({ start, end })}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Download size={20} className="text-success" />
                        Format de téléchargement
                        <MetricHelp content={APP_HELP['export-action']} />
                    </h3>
                    <div className="space-y-4">
                        <button
                            onClick={() => handleExport('csv')}
                            disabled={isExporting}
                            className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-border rounded-lg transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/20 rounded-lg text-green-500 group-hover:text-green-400 transition-colors">
                                    <FileSpreadsheet size={24} />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium text-white">Format CSV</div>
                                    <div className="text-sm text-text-muted">Compatible Excel, Sheets</div>
                                </div>
                            </div>
                            <Download size={20} className="text-text-muted group-hover:text-white transition-colors" />
                        </button>

                        <button
                            onClick={() => handleExport('json')}
                            disabled={isExporting}
                            className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-border rounded-lg transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-500 group-hover:text-yellow-400 transition-colors">
                                    <FileJson size={24} />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium text-white">Format JSON</div>
                                    <div className="text-sm text-text-muted">Données brutes structurées</div>
                                </div>
                            </div>
                            <Download size={20} className="text-text-muted group-hover:text-white transition-colors" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
