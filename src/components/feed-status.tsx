import { relativeWhen } from '@/lib/sports/time';
export function FeedStatus({ at, warnings = [] }: { at: string; warnings?: string[] }) {
  return <div className="my-3 text-sm text-muted" role="status"><p>Data checked {relativeWhen(at)} · Times Eastern</p>
    {Date.now() - Date.parse(at) > 90_000 || warnings.length ? <p className="mt-1 text-warn">Updates delayed. {warnings.join(' · ')} Empty results may be incomplete.</p> : null}</div>;
}
