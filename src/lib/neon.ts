import { Pool, neonConfig } from '@neondatabase/serverless'

// Suppress browser warnings (we accept the security implications for internal use)
neonConfig.disableWarningInBrowsers = true

export const pool = new Pool({
    connectionString: import.meta.env.VITE_NEON_DATABASE_URL,
    ssl: true
})
