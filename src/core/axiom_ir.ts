/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

export type IRNodeType = "CONSTRAINT" | "ASSERTION" | "INVARIANT" | "ASSIGNMENT" | "UNKNOWN";

export interface AxiomIRNode {
  id: string;
  type: IRNodeType;
  rawSymbol: string;
  expression: string;
  depth: number;
}

export interface AxiomIRGraph {
  rootId: string;
  nodes: Map<string, AxiomIRNode>;
  checksum: string;
}

export function buildAxiomIR(rawAST: Record<string, unknown>): AxiomIRGraph {
  const nodes = new Map<string, AxiomIRNode>();
  const rootId = `ir_node_0`;

  nodes.set(rootId, {
    id: rootId,
    type: "INVARIANT",
    rawSymbol: "ROOT_EVAL",
    expression: JSON.stringify(rawAST),
    depth: 0,
  });

  return {
    rootId,
    nodes,
    checksum: "IR_STABLE_V12",
  };
}
