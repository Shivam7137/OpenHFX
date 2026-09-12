import { CircleUser } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="app-header">
      <span className="app-name">OpenHFX</span>
      <button type="button" className="icon-button" disabled aria-disabled title="Accounts arrive with the identity package">
        <CircleUser size={24} aria-hidden />
        <span className="visually-hidden">Account</span>
      </button>
    </header>
  );
}
