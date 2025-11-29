import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface AnalyticsDonutChartProps {
    data: any[]
    colors?: string[]
    name?: string
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ef4444']

export const AnalyticsDonutChart: React.FC<AnalyticsDonutChartProps> = ({
    data,
    colors = DEFAULT_COLORS
}) => {
    const total = data.reduce((sum, item) => sum + item.value, 0)

    return (
        <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#18181b',
                            border: '1px solid #27272a',
                            borderRadius: '8px',
                            color: '#fff'
                        }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        formatter={(value) => <span className="text-text-secondary text-sm ml-1">{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pb-8">
                <div className="text-3xl font-bold text-white">{total}</div>
                <div className="text-xs text-text-muted uppercase tracking-wider">Total</div>
            </div>
        </div>
    )
}
