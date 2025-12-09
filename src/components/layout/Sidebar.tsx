import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Gamepad2, Users, Download, Settings, LineChart, X, DollarSign, Shield } from 'lucide-react'
import { clsx } from 'clsx'

interface SidebarProps {
    isOpen: boolean
    onClose: () => void
}

const NAV_ITEMS = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Gamepad2, label: 'Games', path: '/games' },
    { icon: Users, label: 'Users', path: '/users' },
    { icon: LineChart, label: 'Insights', path: '/insights' },
    { icon: DollarSign, label: 'Cost & Performance', path: '/cost-metrics' },
    { icon: Shield, label: 'Modération', path: '/moderation' },
    { icon: Download, label: 'Export', path: '/export' },
    { icon: Settings, label: 'Configuration', path: '/config' },
]

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={clsx(
                    "fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar Content */}
            <aside className={clsx(
                "fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border transform transition-transform duration-300 lg:translate-x-0 pt-[env(safe-area-inset-top)] flex flex-col",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
                    <span className="text-xl font-bold bg-gradient-to-r from-white to-text-secondary bg-clip-text text-transparent">
                        Labjoo Analytics
                    </span>
                    <button onClick={onClose} className="lg:hidden text-text-muted hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => window.innerWidth < 1024 && onClose()}
                            className={({ isActive }) => clsx(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-text-muted hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                            AD
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">Admin</span>
                            <span className="text-xs text-text-muted">admin@labjoo.com</span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}
