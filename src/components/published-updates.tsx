import { useEffect, useState } from 'react';
import { getPublishedPosts } from '@/lib/publishing/api';
import type { Post } from '@/lib/publishing/types';
export function PublishedUpdates({ date }: { date?: string }) {
  const [posts, setPosts] = useState<Post[]>([]); const [error, setError] = useState(false);
  useEffect(() => { let active = true; setPosts([]);
    void getPublishedPosts({ data: { date } }).then(p => { if (active) { setPosts(p); setError(false); } }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [date]);
  if (error) return <p className="my-3 text-sm text-muted">Publisher updates are temporarily unavailable.</p>;
  if (!posts.length) return null;
  return <section className="my-6 space-y-4" aria-label="Keystone updates"><h2 className="font-display text-2xl">From Keystone</h2>
    {posts.map(p => <article key={p.id} className="rounded-md border border-border bg-surface p-4"><p className="text-sm text-muted">{p.date}{p.eventTime ? ` · ${p.eventTime} ET` : ''} · {p.kind}</p><h3 className="mt-1 font-display text-xl">{p.title}</h3><p className="mt-2 whitespace-pre-wrap leading-relaxed">{p.body}</p></article>)}</section>;
}
