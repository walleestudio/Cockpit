import React from 'react'
import { Menu, Bell } from 'lucide-react'

interface HeaderProps {
    onMenuClick: () => void
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
    return (
        <header className="bg-background/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
            <div className="h-16 flex items-center justify-between px-6">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 -ml-2 text-text-muted hover:text-white transition-colors"
                >
                    <Menu size={20} />
                </button>

                <div className="flex items-center gap-4 ml-auto">
                    <button className="p-2 text-text-muted hover:text-white transition-colors relative">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-background"></span>
                    </button>
                    <button className="bg-white text-black hover:bg-gray-200 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors">
                        Export Report
                    </button>
                </div>
            </div>
        </header>
    )
}
