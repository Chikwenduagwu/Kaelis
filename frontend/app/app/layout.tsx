import type { ReactNode } from 'react';
import { Sidebar } from './components/Sidebar';
import './app-shell.css';
import './forms.css';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="kaelis-app-shell">
      <Sidebar />
      <div className="kaelis-app-shell__content">{children}</div>
    </div>
  );
}
