'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { composioApi } from './utils';
import { composioKeys } from './keys';
import { toast } from 'sonner';

export const useDeleteProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profileId: string) => {
      // This would need to be implemented in the backend
      // For now, we'll simulate the deletion
      return await composioApi.deleteProfile(profileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: composioKeys.profiles.all() });
      toast.success('Profile deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete profile');
    },
  });
};

export const useBulkDeleteProfiles = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profileIds: string[]) => {
      // This would need to be implemented in the backend
      // For now, we'll simulate the bulk deletion
      const promises = profileIds.map(id => composioApi.deleteProfile(id));
      return await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: composioKeys.profiles.all() });
      toast.success('Profiles deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete profiles');
    },
  });
};

export const useSetDefaultProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profileId: string) => {
      // This would need to be implemented in the backend
      // For now, we'll simulate setting the default profile
      return await composioApi.setDefaultProfile(profileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: composioKeys.profiles.all() });
      toast.success('Default profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to set default profile');
    },
  });
};
