import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { appClient } from '@/api/client';

export function useSiteContent() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['site-content'],
    queryFn: () => appClient.content.get(),
  });

  useEffect(() => {
    return appClient.content.subscribe((content) => {
      queryClient.setQueryData(['site-content'], content);
    });
  }, [queryClient]);

  return query;
}
