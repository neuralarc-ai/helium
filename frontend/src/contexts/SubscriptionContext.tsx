'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSubscription as useSubscriptionQuery } from '@/hooks/react-query/subscriptions/use-subscriptions';
import { SubscriptionStatus } from '@/lib/api';

interface SubscriptionContextType {
  subscriptionData: SubscriptionStatus | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { 
    data: subscriptionData, 
    isLoading, 
    error, 
    refetch 
  } = useSubscriptionQuery();

  const value: SubscriptionContextType = {
    subscriptionData: subscriptionData || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  
  return context;
}

// Hook that uses shared context data - only use within SubscriptionProvider
export function useSharedSubscription() {
  const context = useSubscriptionContext();
  
  return {
    data: context.subscriptionData,
    isLoading: context.isLoading,
    error: context.error,
    refetch: context.refetch,
  };
}

// Hook that works both inside and outside the provider - always calls both hooks
export function useSubscriptionData() {
  const context = useContext(SubscriptionContext);
  const directQuery = useSubscriptionQuery();
  
  // If context is available, use it; otherwise use direct query
  return context ? {
    data: context.subscriptionData,
    isLoading: context.isLoading,
    error: context.error,
    refetch: context.refetch,
  } : directQuery;
}