import { Navbar } from '@/components/home/sections/navbar';

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="w-full relative dark:bg-[#1F1F1F] bg-white">
      <Navbar />
      {children}
    </div>
  );
}
