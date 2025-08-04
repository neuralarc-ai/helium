'use client';

import { useEffect, useState } from 'react';
import { SidebarLeft } from '@/components/sidebar/sidebar-left';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
// import { PricingAlert } from "@/components/billing/pricing-alert"
import { MaintenanceAlert } from '@/components/maintenance-alert';
import { useAccounts } from '@/hooks/use-accounts';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useApiHealth } from '@/hooks/react-query';
import { MaintenancePage } from '@/components/maintenance/maintenance-page';
import { DeleteOperationProvider } from '@/contexts/DeleteOperationContext';
import { StatusOverlay } from '@/components/ui/status-overlay';
import type { IMaintenanceNotice } from '@/lib/edge-flags';
import { MaintenanceNotice } from './maintenance-notice';
import { MaintenanceBanner } from './maintenance-banner';

interface DashboardLayoutContentProps {
  children: React.ReactNode;
  maintenanceNotice: IMaintenanceNotice;
}

export default function DashboardLayoutContent({
  children,
  maintenanceNotice,
}: DashboardLayoutContentProps) {
  // const [showPricingAlert, setShowPricingAlert] = useState(false)
  const [showMaintenanceAlert, setShowMaintenanceAlert] = useState(false);
  const { data: accounts } = useAccounts();
  const personalAccount = accounts?.find((account) => account.personal_account);
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { data: healthData, isLoading: isCheckingHealth, error: healthError } = useApiHealth();

  useEffect(() => {
    // setShowPricingAlert(false)
    setShowMaintenanceAlert(false);
  }, []);

  // API health is now managed by useApiHealth hook
  const isApiHealthy = healthData?.status === 'ok' && !healthError;

  // Check authentication status
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  if (maintenanceNotice.enabled) {
    const now = new Date();
    const startTime = maintenanceNotice.startTime;
    const endTime = maintenanceNotice.endTime;

    if (now > startTime) {
      return (
        <div className="w-screen h-screen flex items-center justify-center">
          <div className="max-w-xl">
            <MaintenanceNotice endTime={endTime.toISOString()} />
          </div>
        </div>
      );
    }
  }

  let mantenanceBanner: React.ReactNode | null = null;
  if (maintenanceNotice.enabled) {
    mantenanceBanner = (
      <MaintenanceBanner
        startTime={maintenanceNotice.startTime.toISOString()}
        endTime={maintenanceNotice.endTime.toISOString()}
      />
    );
  }

  // Show loading state while checking auth or health
  if (isLoading || isCheckingHealth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (!user) {
    return null;
  }

  // Show maintenance page if API is not healthy (but not during initial loading)
  if (!isCheckingHealth && !isApiHealthy) {
    return <MaintenancePage />;
  }

  return (
    <DeleteOperationProvider>
      <SidebarProvider>
        <SidebarLeft />
        <SidebarInset>
          {mantenanceBanner}
          <div className="bg-background">{children}</div>
        </SidebarInset>

        {/* <PricingAlert 
        open={showPricingAlert} 
        onOpenChange={setShowPricingAlert}
        closeable={false}
        accountId={personalAccount?.account_id}
        /> */}

        <MaintenanceAlert
          open={showMaintenanceAlert}
          onOpenChange={setShowMaintenanceAlert}
          closeable={true}
        />

        {/* Status overlay for deletion operations */}
        <StatusOverlay />
      </SidebarProvider>
    </DeleteOperationProvider>
  );
}
