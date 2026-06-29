/**
 * Supabase Realtime hooks for live dashboard updates.
 * Subscribes to table changes and calls the provided callback.
 */
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

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

  useEffect(() => {
    const channelName = `rt-${table}-${Math.random().toString(36).slice(2)}`;

    // Build channel
    let channel = supabase.channel(channelName);

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
        onchange(payload);
      }
    );

    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        // subscription active
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, filter, onchange]);
}
