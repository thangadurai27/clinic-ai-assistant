"use client";

import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import NotificationToastProvider from "@/components/providers/NotificationToastProvider";
import ReactQueryProvider from "@/providers/QueryClientProvider";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <AuthProvider>
        <NotificationToastProvider>
          {children}
          <Toaster position="top-right" richColors />
        </NotificationToastProvider>
      </AuthProvider>
    </ReactQueryProvider>
  );
}
