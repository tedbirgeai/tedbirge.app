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

/**
 * AXIOM Omni-Language Engine Parser
 * Parses multi-lingual code, formal theorems, and logical assertions into AXIOM-IR.
 */
export function parseOmniLanguage(input: string): ParsedLanguageAST {
  const safeInput = input ? input.trim() : "";
  const digest = parseAskAscii(safeInput);
  let language: SupportedLanguage = "Generic_DSL";

  if (safeInput.includes("theorem") || safeInput.includes("def") || safeInput.includes("by")) {
    language = "Lean4";
  } else if (safeInput.includes("check-sat") || safeInput.includes("assert") || safeInput.includes("declare-const")) {
    language = "Z3_SMT";
  } else if (safeInput.includes("#[axiom") || safeInput.includes("fn ") || safeInput.includes("impl ")) {
    language = "Rust";
  } else if (safeInput.includes("#include") || safeInput.includes("int main") || safeInput.includes("void ")) {
    language = "C_CPP";
  } else if (safeInput.includes("procedure") || safeInput.includes("package body") || safeInput.includes("with Spark_Mode")) {
    language = "Ada_SPARK";
  } else if (safeInput.includes("IDENTIFICATION DIVISION") || safeInput.includes("PROCEDURE DIVISION")) {
    language = "COBOL";
  } else if (safeInput.includes("PROGRAM") || safeInput.includes("IMPLICIT NONE") || safeInput.includes("SUBROUTINE")) {
    language = "FORTRAN";
  } else if (safeInput.includes("pragma solidity") || safeInput.includes("contract ")) {
    language = "Solidity";
  } else if (safeInput.includes("entity") || safeInput.includes("architecture") || safeInput.includes("module ")) {
    language = "VHDL_Verilog";
  } else if (safeInput.includes("def ") || safeInput.includes("import ") || safeInput.includes("class ")) {
    language = "Python";
  }

  const mockAST = { 
    tokenCount: digest.chars, 
    detectedLang: language, 
    sourceHead: digest.head 
  };
  
  const irGraph = buildAxiomIR(mockAST);

  return {
    language,
    digest,
    irGraph,
    nodeCount: irGraph.nodes ? irGraph.nodes.size : 0,
  };
}
