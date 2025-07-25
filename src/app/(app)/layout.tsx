import { BottomNavigationBar } from '@/components/layout/bottom-navigation-bar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="flex-grow pb-20 pt-4">{children}</main>
      <BottomNavigationBar />
    </>
  );
}
