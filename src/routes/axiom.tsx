/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import { createFileRoute } from "@tanstack/react-router";
import { AxiomApp } from "@/components/axiom/AxiomApp";

export const Route = createFileRoute("/axiom")({
  component: AxiomRouteComponent,
});

function AxiomRouteComponent() {
  return (
    <div className="flex h-full w-full flex-col bg-[var(--tb-bg)] p-4 md:p-6 font-osmono text-[var(--tb-text)]">
      <AxiomApp />
    </div>
  );
}
