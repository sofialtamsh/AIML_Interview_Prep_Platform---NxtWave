import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="dotgrid grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm font-bold text-brand">404</p>
        <h1 className="mt-2 text-3xl">This page took a wrong turn.</h1>
        <p className="mt-3 text-muted">The link may be old, or the page moved.</p>
        <Link to="/" className="mt-6 inline-block font-semibold text-brand hover:underline">
          ← Back home
        </Link>
      </div>
    </div>
  );
}
