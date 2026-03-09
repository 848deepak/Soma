/**
 * hooks/useProfile.ts
 * Fetches the authenticated user's profile row from Supabase.
 * The row is auto-created by the handle_new_user DB trigger on sign-up,
 * so it always exists after ensureAnonymousSession() completes.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { ProfileRow, ProfileUpdate } from '@/types/database';

export const PROFILE_QUERY_KEY = ['profile'] as const;

export function useProfile() {
  return useQuery<ProfileRow | null>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as unknown as ProfileRow;
    },
    // Profile rarely changes – 5 minute stale time
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation to update the user's profile (first name, permissions, etc.)
 * Applies an optimistic update so the UI reflects the change immediately.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: ProfileUpdate) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(update)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ProfileRow;
    },

    onMutate: async (update) => {
      await queryClient.cancelQueries({ queryKey: PROFILE_QUERY_KEY });
      const previous = queryClient.getQueryData<ProfileRow>(PROFILE_QUERY_KEY);
      queryClient.setQueryData<ProfileRow | null>(PROFILE_QUERY_KEY, (old) =>
        old ? { ...old, ...update } : old,
      );
      return { previous };
    },

    onError: (_error, _update, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(PROFILE_QUERY_KEY, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
