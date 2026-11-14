/**
 * Supabase Realtime hooks for live dashboard updates.
 * Subscribes to table changes and calls the provided callback.
 *
 * Realtime is best-effort: if Supabase is not configured, unreachable, or the
 * channel errors out, the app keeps working through normal query refetching.
 */
import { useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";
type RealtimeStatus = "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR";

interface UseRealtimeOptions {
  table: string;
  event?: RealtimeEvent;
  filter?: string;           // e.g. "status=eq.open"
  onchange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;      // called on any matching event
}

/**
 * Subscribe to a Supabase table and call `onchange` whenever a matching
 * INSERT / UPDATE / DELETE fires.
 *
 * Usage:
 *   useRealtime({ table: "conversations", onchange: reload });
 */
export function useRealtime({ table, event = "*", filter, onchange }: UseRealtimeOptions) {
  // Keep the latest callback without forcing a resubscription on every render.
  const onchangeRef = useRef(onchange);
  useEffect(() => {
    onchangeRef.current = onchange;
  }, [onchange]);

  useEffect(() => {
    if (!isSupabaseConfigured || typeof window === "undefined") return;

    const channelName = `rt-${table}-${Math.random().toString(36).slice(2)}`;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    try {
      channel = supabase.channel(channelName);

      const pgChanges: Parameters<typeof channel.on>[1] = {
        event,
        schema: "public",
        table,
        ...(filter ? { filter } : {}),
      };

      channel = channel.on(
        "postgres_changes" as Parameters<typeof channel.on>[0],
        pgChanges,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          onchangeRef.current(payload);
        }
      );

      channel.subscribe((status: RealtimeStatus) => {
        if (status === "SUBSCRIBED") return;
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[Realtime] ${table} channel ${status}; using polling fallback.`);
        }
        // The Supabase client handles reconnection. No throw here so a broken
        // Realtime service cannot break the dashboard.
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Realtime] Could not subscribe to ${table}:`, error);
      }
    }

    return () => {
      if (!channel) return;
      try {
        void supabase.removeChannel(channel);
      } catch {
        // Ignore teardown failures during navigation/unmount.
      }
    };
  }, [table, event, filter]);
}
