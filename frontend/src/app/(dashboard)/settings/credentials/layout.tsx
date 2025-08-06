import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'App Profiles | Helium AI',
  description: 'Manage your connected app integrations',
  openGraph: {
    title: 'App Profiles | Helium AI',
    description: 'Manage your connected app integrations',
    type: 'website',
  },
};

export default async function CredentialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
