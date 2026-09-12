import { Bookmark, MapPin, Plus } from 'lucide-react';

// Public navigation from docs/DESIGN_SPEC.md. Report and Following belong to
// packages that are not built yet, so they are shown as unavailable rather than
// linking to routes that do not exist.

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Public navigation">
      <span className="nav-item" aria-current="page">
        <MapPin size={22} aria-hidden />
        Nearby
      </span>
      <button type="button" className="nav-item" disabled aria-disabled title="Reporting arrives with the reporting package">
        <Plus size={22} aria-hidden />
        Report
      </button>
      <button type="button" className="nav-item" disabled aria-disabled title="Following arrives with the following package">
        <Bookmark size={22} aria-hidden />
        Following
      </button>
    </nav>
  );
}
