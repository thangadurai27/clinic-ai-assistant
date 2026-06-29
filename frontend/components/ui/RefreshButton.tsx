'use client';

import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface RefreshButtonProps {
  queryKeys: (string | string[])[]; // Array of query keys to refetch
}

export default function RefreshButton({ queryKeys }: RefreshButtonProps) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const promises = queryKeys.map((key) => 
        queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] })
      );
      await Promise.all(promises);
      toast.success('Data updated successfully');
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [queryKeys, queryClient]);

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      Refresh
    </button>
  );
}
