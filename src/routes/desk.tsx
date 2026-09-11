import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { dateKeyNY } from "@/lib/sports/time";
import { exportDesk, useDesk } from "@/lib/sports/desk-store";

export const Route = createFileRoute("/desk")({
  head: () => ({
    meta: [{ title: "My Notes — Keystone Beat" }],
  }),
  component: DeskPage,
});

function DeskPage() {
  const today = dateKeyNY();
  const fileRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(today);
  const [importError, setImportError] = useState<string | null>(null);
  const notes = useDesk((s) => s.notes);
  const featured = useDesk((s) => s.featured);
  const picks = useDesk((s) => s.picks);
  const events = useDesk((s) => s.events);
  const setNote = useDesk((s) => s.setNote);
  const setFeatured = useDesk((s) => s.setFeatured);
  const addPick = useDesk((s) => s.addPick);
  const removePick = useDesk((s) => s.removePick);
  const addEvent = useDesk((s) => s.addEvent);
  const removeEvent = useDesk((s) => s.removeEvent);
  const importJson = useDesk((s) => s.importJson);

  const [pickTitle, setPickTitle] = useState("");
  const [pickSide, setPickSide] = useState("");
  const [pickNotes, setPickNotes] = useState("");
  const [evTitle, setEvTitle] = useState("");
  const [evTime, setEvTime] = useState("");
  const [evSport, setEvSport] = useState("Football");
  const [evNotes, setEvNotes] = useState("");

  const snapshot = useMemo(
    () => exportDesk({ notes, featured, picks, events }),
    [notes, featured, picks, events],
  );

  function download() {
    const blob = new Blob([snapshot], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keystone-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">My Notes</h1>
        <p className="mt-3 text-muted">
          Private notes, picks, and events saved on this device only. They are not published to other visitors. Export a backup before changing devices.
        </p>

        <label className="mt-8 block text-sm font-medium text-muted" htmlFor="desk-date">
          Working date
        </label>
        <Input id="desk-date" type="date" className="mt-1 max-w-xs" value={date} onChange={(e) => setDate(e.target.value)} />

        <section className="mt-8">
          <h2 className="font-display text-2xl tracking-wide">Standing note</h2>
          <p className="mt-1 text-sm text-muted">Shows only on your Scores page.</p>
          <Textarea
            className="mt-3"
            value={featured}
            onChange={(e) => setFeatured(e.target.value)}
            placeholder="Season frame, injury note, or what you want readers to see first."
          />
        </section>

        <section className="mt-8">
          <h2 className="font-display text-2xl tracking-wide">Daily note</h2>
          <p className="mt-1 text-sm text-muted">Tied to {date}. The recap writer can read this too.</p>
          <Textarea
            className="mt-3"
            value={notes[date] ?? ""}
            onChange={(e) => setNote(date, e.target.value)}
            placeholder="What matters today. Injuries, weather, a take."
          />
        </section>

        <section className="mt-8">
          <h2 className="font-display text-2xl tracking-wide">Picks</h2>
          <form
            className="mt-3 space-y-3 rounded-md bg-surface p-4 shadow-[var(--shadow-border)]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!pickTitle.trim() || !pickSide.trim()) return;
              addPick({ date, title: pickTitle.trim(), pick: pickSide.trim(), notes: pickNotes.trim() });
              setPickTitle("");
              setPickSide("");
              setPickNotes("");
            }}
          >
            <Input value={pickTitle} onChange={(e) => setPickTitle(e.target.value)} placeholder="Game — Eagles vs Commanders" />
            <Input value={pickSide} onChange={(e) => setPickSide(e.target.value)} placeholder="Pick — Eagles -3.5" />
            <Input value={pickNotes} onChange={(e) => setPickNotes(e.target.value)} placeholder="Why, optional" />
            <Button type="submit">Add pick</Button>
          </form>
          <ul className="mt-4 space-y-3">
            {picks
              .filter((p) => p.date === date)
              .map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 rounded-md bg-surface p-3 shadow-[var(--shadow-border)]">
                  <div>
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-sm text-accent">{p.pick}</p>
                    {p.notes ? <p className="text-sm text-muted">{p.notes}</p> : null}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removePick(p.id)}>
                    Remove
                  </Button>
                </li>
              ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-2xl tracking-wide">Custom events</h2>
          <p className="mt-1 text-sm text-muted">High school, watch parties, pressers — anything the feeds miss.</p>
          <form
            className="mt-3 space-y-3 rounded-md bg-surface p-4 shadow-[var(--shadow-border)]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!evTitle.trim()) return;
              addEvent({ date, time: evTime.trim(), title: evTitle.trim(), sport: evSport.trim(), notes: evNotes.trim() });
              setEvTitle("");
              setEvTime("");
              setEvNotes("");
            }}
          >
            <Input value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Title" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={evTime} onChange={(e) => setEvTime(e.target.value)} placeholder="Time — 7:00 PM" />
              <Input value={evSport} onChange={(e) => setEvSport(e.target.value)} placeholder="Sport" />
            </div>
            <Input value={evNotes} onChange={(e) => setEvNotes(e.target.value)} placeholder="Notes" />
            <Button type="submit">Add event</Button>
          </form>
          <ul className="mt-4 space-y-3">
            {events
              .filter((e) => e.date === date)
              .map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 rounded-md bg-surface p-3 shadow-[var(--shadow-border)]">
                  <div>
                    <p className="font-semibold">
                      {e.time ? `${e.time} · ` : ""}
                      {e.title}
                    </p>
                    <p className="text-sm text-muted">
                      {e.sport}
                      {e.notes ? ` — ${e.notes}` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeEvent(e.id)}>
                    Remove
                  </Button>
                </li>
              ))}
          </ul>
        </section>

        <section className="mt-10 rounded-md bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-2xl tracking-wide">Backup</h2>
          <p className="mt-1 text-sm text-muted">Download JSON, or import a file you saved.</p>
          {importError ? <p className="mt-2 text-sm text-danger">{importError}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={download}>
              Download JSON
            </Button>
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  importJson(await file.text());
                  setImportError(null);
                } catch {
                  setImportError("That file was not valid editor JSON.");
                }
                e.target.value = "";
              }}
            />
          </div>
        </section>
      </div>
  );
}
