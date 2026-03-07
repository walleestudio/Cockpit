import React from 'react'

export const LoadingSpinner: React.FC = () => {
    return (
        <div className="flex items-center justify-center min-h-[200px] p-8" style={{ backgroundColor: 'transparent', color: '#ffffff' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-blue-500" style={{ borderTopColor: '#3b82f6' }}></div>
        </div>
    )
}
