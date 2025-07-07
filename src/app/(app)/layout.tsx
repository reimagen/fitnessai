
import { BottomNavigationBar } from '@/components/layout/bottom-navigation-bar';
import '../globals.css';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-grow pb-20 pt-4">{children}</main>
      <BottomNavigationBar />
    </div>
  );
}
