import { useEffect, useState } from 'react';
import { getSubscription, checkBillingStatus } from '@/lib/api';

export interface SubscriptionUsage {
  usedCredits: number;
  totalCredits: number;
  usagePercent: number;
  isLoading: boolean;
  error: Error | null;
}

export function useSubscriptionUsage(): SubscriptionUsage {
  const [state, setState] = useState<Omit<SubscriptionUsage, 'usagePercent'>>({
    usedCredits: 0,
    totalCredits: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        // Get subscription and billing status in parallel
        const [subscription, billingStatus] = await Promise.all([
          getSubscription(),
          checkBillingStatus(),
        ]);

        // Calculate credits based on subscription and billing status
        const totalCredits = Math.round(subscription.minutes_limit || 0);
        const usedCredits = Math.round(subscription.current_usage || 0);

        setState({
          usedCredits,
          totalCredits,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching subscription usage:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error('Failed to load subscription usage'),
        }));
      }
    };

    // Fetch usage data on mount
    fetchUsage();
  }, []);

  return {
    ...state,
    usagePercent: state.totalCredits > 0 
      ? Math.round((state.usedCredits / state.totalCredits) * 100) 
      : 0,
  };
}
