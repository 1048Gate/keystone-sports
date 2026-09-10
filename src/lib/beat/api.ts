import { createServerFn } from "@tanstack/react-start";
import type { BeatItem, PublicBeatItem } from "./types";
import { selectPublicBeatItems } from "./order";
import { readBeatM1Flag } from "./flag";

export type BeatDeskPayload = {
  enabled: boolean;
  generatedAt: string;
  items: PublicBeatItem[];
  /** Full fixture set for admin scaffold only. */
  adminItems?: BeatItem[];
};

export const getBeatDesk = createServerFn({ method: "GET" }).handler(async (): Promise<BeatDeskPayload> => {
  const { runtime } = await import("../publishing/runtime.server");
  const enabled = readBeatM1Flag(runtime() as unknown as Record<string, unknown>);
  if (!enabled) {
    return { enabled: false, generatedAt: new Date().toISOString(), items: [] };
  }
  const { BEAT_POC_FIXTURES } = await import("./fixtures");
  return {
    enabled: true,
    generatedAt: new Date().toISOString(),
    items: selectPublicBeatItems(BEAT_POC_FIXTURES),
  };
});

export const getBeatAdminDesk = createServerFn({ method: "GET" }).handler(async (): Promise<BeatDeskPayload> => {
  const { runtime, identity } = await import("../publishing/runtime.server");
  const user = identity();
  if (!user.admin) {
    return { enabled: false, generatedAt: new Date().toISOString(), items: [] };
  }
  const enabled = readBeatM1Flag(runtime() as unknown as Record<string, unknown>);
  const { BEAT_POC_FIXTURES } = await import("./fixtures");
  return {
    enabled,
    generatedAt: new Date().toISOString(),
    items: selectPublicBeatItems(BEAT_POC_FIXTURES),
    adminItems: BEAT_POC_FIXTURES,
  };
});
