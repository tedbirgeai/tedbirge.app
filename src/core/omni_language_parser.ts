/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import { parseAskAscii, type ByteDigest } from "./ask_ascii_parser";
import { buildAxiomIR, type AxiomIRGraph } from "./axiom_ir";

export type SupportedLanguage =
  | "Lean4"
  | "Z3_SMT"
  | "Rust"
  | "C_CPP"
  | "Ada_SPARK"
  | "COBOL"
  | "FORTRAN"
  | "Solidity"
  | "VHDL_Verilog"
  | "Python"
  | "Generic_DSL";

export interface ParsedLanguageAST {
  language: SupportedLanguage;
  digest: ByteDigest;
  irGraph: AxiomIRGraph;
  nodeCount: number;
}

export function parseOmniLanguage(input: string): ParsedLanguageAST {
  const digest = parseAskAscii(input);
  let language: SupportedLanguage = "Generic_DSL";

  const src = input.trim();

  if (src.includes("theorem") || src.includes("def") || src.includes("by")) {
    language = "Lean4";
  } else if (src.includes("check-sat") || src.includes("assert") || src.includes("declare-const")) {
    language = "Z3_SMT";
  } else if (src.includes("#[axiom") || src.includes("fn ") || src.includes("impl ")) {
    language = "Rust";
  } else if (src.includes("#include") || src.includes("int main") || src.includes("void ")) {
    language = "C_CPP";
  } else if (src.includes("procedure") || src.includes("package body") || src.includes("with Spark_Mode")) {
    language = "Ada_SPARK";
  } else if (src.includes("IDENTIFICATION DIVISION") || src.includes("PROCEDURE DIVISION")) {
    language = "COBOL";
  } else if (src.includes("PROGRAM") || src.includes("IMPLICIT NONE") || src.includes("SUBROUTINE")) {
    language = "FORTRAN";
  } else if (src.includes("pragma solidity") || src.includes("contract ")) {
    language = "Solidity";
  } else if (src.includes("entity") || src.includes("architecture") || src.includes("module ")) {
    language = "VHDL_Verilog";
  } else if (src.includes("def ") || src.includes("import ") || src.includes("class ")) {
    language = "Python";
  }

  const mockAST = { tokenCount: digest.chars, detectedLang: language, sourceHead: digest.head };
  const irGraph = buildAxiomIR(mockAST);

  return {
    language,
    digest,
    irGraph,
    nodeCount: irGraph.nodes.size,
  };
}
