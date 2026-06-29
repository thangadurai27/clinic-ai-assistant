"use client";

import { useRealtime } from "@/hooks/useRealtime";
import { toast } from "sonner";
import { Bell, AlertTriangle, MessageSquare } from "lucide-react";
import React from "react";
import { useRouter } from "next/navigation";

export default function NotificationToastProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    useRealtime({
        table: "notifications",
        event: "INSERT",
        onchange: (payload) => {
            const notif = payload.new as { title: string; body: string; type: string; conversation_id?: string };
            if (!notif || !notif.title) return;

            toast(notif.title, {
                description: notif.body,
                icon: notif.type && notif.type.includes("emergency") ? <AlertTriangle size={18} color="#ef4444" /> : <Bell size={18} color="#6366f1" />,
                action: {
                    label: "View",
                    onClick: () => {
                        if (notif.conversation_id) router.push(`/dashboard/conversations?id=${notif.conversation_id}`);
                        else router.push("/hospital-notifications");
                    }
                }
            });
        }
    });

    useRealtime({
        table: "conversations",
        event: "INSERT",
        onchange: (payload) => {
            const conv = payload.new as { id: string; channel: string };
            if (!conv || !conv.id) return;

            toast("New Conversation", {
                description: `Patient started a new ${conv.channel} chat.`,
                icon: <MessageSquare size={18} color="#10b981" />,
                action: {
                    label: "Open",
                    onClick: () => router.push(`/dashboard/conversations?id=${conv.id}`)
                }
            });
        }
    });

    return <>{children}</>;
}
