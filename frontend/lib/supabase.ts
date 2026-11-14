import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host !== "localhost" &&
      !host.includes("your-project") &&
      !host.includes("your-project-id") &&
      host.includes(".")
    );
  } catch {
    return false;
  }
}

/**
 * Realtime is optional. When the Supabase URL/key are missing or still
 * placeholders, the app falls back to a no-op client instead of throwing during
 * render or spamming a broken WebSocket connection.
 */
export const isSupabaseConfigured =
  Boolean(supabaseAnonKey) && isValidHttpUrl(supabaseUrl);

function createMockClient(): SupabaseClient {
  const mockChannel: Record<string, unknown> = {};
  mockChannel.on = () => mockChannel;
  mockChannel.subscribe = (callback?: (status: string) => void) => {
    // Report a closed channel so callers can fall back to polling.
    if (typeof callback === "function") callback("CLOSED");
    return mockChannel;
  };
  mockChannel.unsubscribe = () => Promise.resolve("ok");

  return {
    channel: () => mockChannel,
    removeChannel: () => Promise.resolve("ok"),
    removeAllChannels: () => Promise.resolve([]),
  } as unknown as SupabaseClient;
}

function createConfiguredClient(): SupabaseClient {
  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Supabase] Realtime client could not be created:", error);
    }
    return createMockClient();
  }
}

export const supabase = isSupabaseConfigured
  ? createConfiguredClient()
  : createMockClient();
