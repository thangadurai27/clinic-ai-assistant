import { format, formatDistanceToNow } from "date-fns";

export function formatDate(date: string | Date): string {
    return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: string | Date): string {
    return format(new Date(date), "MMM d, yyyy · h:mm a");
}

export function formatTime(date: string | Date): string {
    return format(new Date(date), "h:mm a");
}

export function timeAgo(date: string | Date): string {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function intentLabel(intent: string): string {
    const map: Record<string, string> = {
        BOOK_APPOINTMENT: "Book Appointment",
        RESCHEDULE_APPOINTMENT: "Reschedule",
        CANCEL_APPOINTMENT: "Cancel Appointment",
        FAQ: "FAQ",
        REMINDER: "Reminder",
        FOLLOW_UP: "Follow-up",
        SYMPTOM_QUERY: "Symptom Query",
        HUMAN_SUPPORT: "Human Support",
    };
    return map[intent] || intent;
}

export function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}
