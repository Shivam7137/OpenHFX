import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page narrow">
      <h1>We could not find that page</h1>
      <p>The issue or page may have moved.</p>
      <Link className="button" href="/public">
        View nearby issues
      </Link>
    </div>
  );
}
