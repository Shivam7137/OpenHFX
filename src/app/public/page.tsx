import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { HALIFAX_PENINSULA_BBOX } from '@/features/map/mapConfig';
import { fetchPublicIssuesInBounds } from '@/features/map/issueSource';
import { NearbyMap } from '@/features/map/NearbyMap';

// P01 live nearby map (docs/DESIGN_SPEC.md). The opening peninsula view is
// resolved on the server so the issue list is readable before the map loads,
// and when no basemap is available at all.
export default async function PublicNearbyPage() {
  const initial = await fetchPublicIssuesInBounds(HALIFAX_PENINSULA_BBOX);

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main">
        <h1 className="visually-hidden">Nearby issues</h1>
        <NearbyMap initialIssues={initial.items} />
      </main>
      <BottomNav />
    </div>
  );
}
