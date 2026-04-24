import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      /** Avoid refetching the same lists on every focus — keeps navigation and return-from-background snappy. */
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});
