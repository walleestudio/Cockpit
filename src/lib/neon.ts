import { Pool, neonConfig } from '@neondatabase/serverless'

// Suppress browser warnings (we accept the security implications for internal use)
neonConfig.disableWarningInBrowsers = true

const STORAGE_KEY = 'app_env'
export type AppEnv = 'PROD' | 'DEV'

export const getCurrentEnv = (): AppEnv => {
    return (localStorage.getItem(STORAGE_KEY) as AppEnv) || 'PROD'
}

export const switchEnv = (env: AppEnv) => {
    localStorage.setItem(STORAGE_KEY, env)
    window.location.reload()
}

const getConnectionString = () => {
    const env = getCurrentEnv()
    const url = env === 'PROD'
        ? import.meta.env.VITE_NEON_DATABASE_URL
        : import.meta.env.VITE_NEON_DATABASE_URL_DEV

    console.log(`[Neon] Connecting to ${env} environment`)
    if (!url) {
        console.warn(`[Neon] Missing database URL for ${env} environment`)
        // Fallback to avoid crash if variable is missing, but connection will fail
        return import.meta.env.VITE_NEON_DATABASE_URL
    }
    return url
}

export const pool = new Pool({
    connectionString: getConnectionString(),
    ssl: true,
    connectionTimeoutMillis: 5000, // Timeout de connexion plus court
    idleTimeoutMillis: 30000,     // Fermer les connexions inactives
    max: 10                       // Limiter le nombre de connexions
})

// Gestion globale des erreurs du pool pour éviter les crashs non gérés
pool.on('error', (err: Error) => {
    console.error('[Neon] Unexpected error on idle client', err)
    // Ne pas throw ici pour éviter de crasher l'app
})

pool.on('connect', () => {
    console.log('[Neon] New client connected')
})
