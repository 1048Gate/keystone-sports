import { definePlugin } from "nitro";
import { autoRecapDraft } from "../src/lib/sports/server";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("cloudflare:scheduled", async () => {
    try {
      const result = await autoRecapDraft();
      console.log(`[auto-recap] scheduled run: ${JSON.stringify(result)}`);
    } catch (error) {
      console.error("[auto-recap] scheduled run failed:", error);
    }
  });
});