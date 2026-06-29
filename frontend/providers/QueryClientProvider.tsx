'use client';

import { QueryClient, QueryClientProvider as TanStackQueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { get, set, del } from 'idb-keyval';
import { useState } from 'react';

// Create a custom IDB persister using idb-keyval
function createIDBPersister(dbName: string = 'clinic-ai-query-cache', key: string = 'react-query-cache') {
  return {
    persistClient: async (client: any) => {
      await set(key, client);
    },
    restoreClient: async () => {
      return await get(key);
    },
    removeClient: async () => {
      await del(key);
    },
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (was cacheTime in v4)
      retry: 1,
    },
  },
});

export default function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [persister] = useState(() => createIDBPersister());

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
