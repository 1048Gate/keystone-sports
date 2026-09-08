import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultPendingMs: 1200,
    defaultPendingMinMs: 0,
    defaultStaleTime: 20_000,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    defaultGcTime: 5 * 60_000,
  });
}
