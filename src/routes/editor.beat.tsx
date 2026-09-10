import { createFileRoute, Link } from "@tanstack/react-router";
import { getSiteAccess } from "@/lib/publishing/api";
import { getBeatAdminDesk } from "@/lib/beat/api";
import { BEAT_CATEGORY_LABELS, SOURCE_TIER_LABELS, type BeatEditorAction, type BeatItem } from "@/lib/beat/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/editor/beat")({
  loader: async () => {
    const access = await getSiteAccess();
    const desk = access.admin ? await getBeatAdminDesk() : { enabled: false, generatedAt: "", items: [], adminItems: [] as BeatItem[] };
    return { access, desk };
  },
  staleTime: 0,
  head: () => ({
    meta: [
      { title: "Beat desk — Keystone" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BeatEditorPage,
});

const ACTIONS: Array<{ id: BeatEditorAction; label: string }> = [
  { id: "approve", label: "Approve" },
  { id: "reject", label: "Reject" },
  { id: "edit_context", label: "Edit context" },
  { id: "change_category", label: "Change category" },
  { id: "pin", label: "Pin" },
  { id: "expire", label: "Expire" },
  { id: "open_original", label: "Open original" },
];

function BeatEditorPage() {
  const { access, desk } = Route.useLoaderData();

  if (!access.admin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl">Beat desk (admin)</h1>
        <p className="my-4 text-muted">
          {!access.adminConfigured
            ? "Beat editing is locked until the owner email is configured."
            : "Only the configured Keystone owner can review Beat cards here."}
        </p>
        {!access.signedIn ? (
          <p className="text-sm text-muted">
            Sign in with Cloudflare Access using the owner email (<code>KEYSTONE_ADMIN_EMAIL</code>), then reload.
          </p>
        ) : (
          <p className="text-sm text-muted">You are signed in, but not as the configured owner.</p>
        )}
        <p className="mt-6 text-sm text-muted">
          Public <Link to="/news">/news</Link> keeps working without this panel.
        </p>
      </div>
    );
  }

  const rows = desk.adminItems ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm text-muted">
        <Link to="/editor" className="hover:text-fg">
          ← Publisher
        </Link>
      </p>
      <h1 className="mt-2 font-display text-4xl">Beat desk (M1 stub)</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Fixture inventory for Milestone 1. Controls below are documented placeholders — no live X scraping and no D1
        writes yet. Public Beat strip flag: <code>KEYSTONE_BEAT_M1</code> ({desk.enabled ? "on" : "off"}).
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <Button
            key={action.id}
            type="button"
            variant="outline"
            disabled={action.id !== "open_original"}
            title={action.id === "open_original" ? "Use per-row link" : "Stubbed until M3 D1 CRUD"}
          >
            {action.label}
          </Button>
        ))}
      </div>
      <p className="mt-2 text-xs text-subtle">Approve / Reject / Edit context / Change category / Pin / Expire ship with D1 in M3.</p>

      <ul className="mt-8 space-y-4">
        {rows.map((item) => (
          <li key={item.id} className="rounded-md bg-surface p-4 shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <span>{BEAT_CATEGORY_LABELS[item.category]}</span>
              <span>·</span>
              <span>{item.approvalStatus}</span>
              <span>·</span>
              <span>{item.mediaType}</span>
              <span>·</span>
              <span>{SOURCE_TIER_LABELS[item.sourceTier]}</span>
              {item.pinned ? <span className="rounded-sm bg-accent px-1.5 py-0.5 text-accent-fg">Pinned</span> : null}
            </div>
            <p className="mt-2 font-display text-xl tracking-wide">{item.headline}</p>
            {item.context ? <p className="mt-1 text-sm text-muted">{item.context}</p> : null}
            <p className="mt-2 text-xs text-subtle">
              {item.source} · {item.authorAccount}
              {item.expiresAt ? ` · expires ${item.expiresAt}` : ""}
            </p>
            <a href={item.originalUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">
              Open original
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
