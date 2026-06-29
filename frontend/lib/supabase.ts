import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a mock Supabase client if environment variables aren't available
function createMockClient() {
    // Type assertion to satisfy TypeScript
    return {
        channel: () => ({
            on: () => ({
                subscribe: () => {},
            }),
        }),
        removeChannel: () => {},
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        realtime: {
            params: {
                eventsPerSecond: 10,
            },
        },
    })
    : createMockClient();

