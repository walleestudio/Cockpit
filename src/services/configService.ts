import { pool } from '../lib/neon'

export interface GameConfig {
    config_key: string
    config_value: string
    description: string | null
    updated_at: string | null
}

export interface ConfigCategory {
    name: string
    configs: GameConfig[]
}

export class ConfigService {
    static async getConfigurations(): Promise<GameConfig[]> {
        try {
            const query = `
                SELECT * 
                FROM game_configurations 
                ORDER BY config_key
            `
            const { rows } = await pool.query(query)
            return rows
        } catch (error) {
            console.error('Error fetching configurations:', error)
            throw error
        }
    }

    static async updateConfiguration(key: string, value: string): Promise<void> {
        try {
            const query = `
                INSERT INTO game_configurations (config_key, config_value, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (config_key) 
                DO UPDATE SET 
                    config_value = EXCLUDED.config_value,
                    updated_at = NOW()
            `
            await pool.query(query, [key, value])
        } catch (error) {
            console.error('Error updating configuration:', error)
            throw error
        }
    }
}
