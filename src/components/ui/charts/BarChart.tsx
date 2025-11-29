import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface AnalyticsBarChartProps {
    data: any[]
    dataKey: string
    xKey: string
    color?: string
    name?: string
    layout?: 'vertical' | 'horizontal'
}

export const AnalyticsBarChart: React.FC<AnalyticsBarChartProps> = ({
    data,
    dataKey,
    xKey,
    color = "#3b82f6",
    name,
    layout = 'horizontal'
}) => {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout={layout}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <XAxis
                        type={layout === 'vertical' ? 'number' : 'category'}
                        dataKey={layout === 'vertical' ? undefined : xKey}
                        stroke="#52525b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        hide={layout === 'vertical'}
                    />
                    <YAxis
                        type={layout === 'vertical' ? 'category' : 'number'}
                        dataKey={layout === 'vertical' ? xKey : undefined}
                        stroke="#52525b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={layout === 'vertical' ? 100 : 40}
                    />
                    <Tooltip
                        cursor={{ fill: '#ffffff', opacity: 0.05 }}
                        contentStyle={{
                            backgroundColor: '#18181b',
                            border: '1px solid #27272a',
                            borderRadius: '8px',
                            color: '#fff'
                        }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                    />
                    <Bar
                        dataKey={dataKey}
                        fill={color}
                        radius={layout === 'vertical' ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                        name={name}
                        barSize={layout === 'vertical' ? 20 : 40}
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
