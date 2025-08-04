'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';
import { checkAndInstallSunaAgent } from '@/lib/utils/install-suna-agent';

type AuthContextType = {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        console.log('🔵 Initial session check:', { hasSession: !!currentSession, user: !!currentSession?.user });
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.error('❌ Error getting initial session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('🔵 Auth state change:', { 
          event, 
          hasSession: !!newSession, 
          hasUser: !!newSession?.user,
          expiresAt: newSession?.expires_at 
        });
        
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (isLoading) setIsLoading(false);
        switch (event) {
          case 'SIGNED_IN':
            if (newSession?.user) {
              console.log('✅ User signed in');
              await checkAndInstallSunaAgent(newSession.user.id, newSession.user.created_at);
            }
            break;
          case 'SIGNED_OUT':
            console.log('✅ User signed out');
            break;
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token refreshed successfully');
            break;
          case 'MFA_CHALLENGE_VERIFIED':
            console.log('✅ MFA challenge verified');
            break;
          default:
            console.log(`🔵 Auth event: ${event}`);
        }
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]); // Removed isLoading from dependencies to prevent infinite loops

  const signOut = async () => {
    try {
      console.log('🔵 Signing out...');
      await supabase.auth.signOut();
      // State updates will be handled by onAuthStateChange
    } catch (error) {
      console.error('❌ Error signing out:', error);
    }
  };

  const value = {
    supabase,
    session,
    user,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
