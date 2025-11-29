import React from 'react'
import { AlertCircle } from 'lucide-react'

interface ErrorAlertProps {
    message: string
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message }) => {
    return (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3 text-red-400">
            <AlertCircle size={20} />
            <span>{message}</span>
        </div>
    )
}
