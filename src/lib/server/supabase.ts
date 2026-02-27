import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env } from '$env/dynamic/private';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
	if (client) return client;

	const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL;
	const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !supabaseKey) {
		throw new Error('Missing SUPABASE environment variables');
	}

	client = createClient(supabaseUrl, supabaseKey);
	return client;
}
