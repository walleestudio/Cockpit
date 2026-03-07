import { useState } from 'react'
import { DataTable } from './DataTable'
import { ChevronDown, ChevronUp } from 'lucide-react'

const DEFAULT_VISIBLE = 10

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ExpandableTableProps<T extends Record<string, any>> {
    data: T[]
    columns: Parameters<typeof DataTable<T>>[0]['columns']
    defaultVisible?: number
    searchable?: boolean
    searchKeys?: (keyof T)[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ExpandableTable<T extends Record<string, any>>({
    data,
    columns,
    defaultVisible = DEFAULT_VISIBLE,
    searchable,
    searchKeys
}: ExpandableTableProps<T>) {
    const [expanded, setExpanded] = useState(false)
    const visibleData = expanded ? data : data.slice(0, defaultVisible)
    const hasMore = data.length > defaultVisible
    const hiddenCount = data.length - defaultVisible

    return (
        <div>
            <DataTable
                data={visibleData}
                columns={columns}
                pageSize={expanded ? 50 : defaultVisible}
                searchable={searchable}
                searchKeys={searchKeys}
            />
            {hasMore && (
                <button
                    onClick={() => setExpanded(e => !e)}
                    className="mt-3 w-full py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 bg-white/5 text-text-muted hover:text-white hover:bg-white/10"
                >
                    {expanded ? (
                        <>
                            <ChevronUp size={16} />
                            Réduire au top {defaultVisible}
                        </>
                    ) : (
                        <>
                            <ChevronDown size={16} />
                            Voir tout ({hiddenCount} de plus)
                        </>
                    )}
                </button>
            )}
        </div>
    )
}
