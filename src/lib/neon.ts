import { Pool } from '@neondatabase/serverless'

export const pool = new Pool({
    connectionString: import.meta.env.VITE_NEON_DATABASE_URL,
    ssl: true
})
