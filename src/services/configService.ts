import { supabase } from '../lib/supabase'

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
            const { data, error } = await supabase
                .from('game_configurations')
                .select('*')
                .order('config_key')

            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error fetching configurations:', error)
            throw error
        }
    }

    static async updateConfiguration(key: string, value: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('game_configurations')
                .upsert({
                    config_key: key,
                    config_value: value,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'config_key'
                })

            if (error) throw error
        } catch (error) {
            console.error('Error updating configuration:', error)
            throw error
        }
    }
}
