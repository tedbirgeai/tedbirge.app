/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import { ASKASCIIParser } from "./ask_ascii_parser";
import { AxiomIRTransformer, AxiomIRRepresentation } from "./axiom_ir";

export type SupportedLanguage = 
  | "C" | "CPP" | "RUST" | "ADA" | "ZIG" | "VHDL" | "VERILOG"
  | "JAVA" | "CSHARP" | "KOTLIN" | "SWIFT"
  | "PYTHON" | "TYPESCRIPT" | "JAVASCRIPT" | "BASH"
  | "HASKELL" | "LEAN4" | "COQ"
  | "COBOL" | "FORTRAN"
  | "SOLIDITY" | "WASM" | "ASK_ASCII";

export class OmniLanguageParser {
  private asciiParser = new ASKASCIIParser();
  private irTransformer = new AxiomIRTransformer();

  public detectLanguage(codeSnippet: string): SupportedLanguage {
    const text = codeSnippet.trim();
    if (text.includes("fn main()") || text.includes("#[axiom_verify]")) return "RUST";
    if (text.includes("#include") || text.includes("int main(")) return "C";
    if (text.includes("IDENTIFICATION DIVISION.") || text.includes("PROCEDURE DIVISION.")) return "COBOL";
    if (text.includes("PROGRAM ") || text.includes("IMPLICIT NONE")) return "FORTRAN";
    if (text.includes("pragma solidity") || text.includes("contract ")) return "SOLIDITY";
    if (text.includes("entity ") && text.includes("is port(")) return "VHDL";
    if (text.includes("def ") || text.includes("import ")) return "PYTHON";
    if (text.includes("interface ") || text.includes("export class ")) return "TYPESCRIPT";
    return "ASK_ASCII";
  }

  public parseToIR(codeSnippet: string, overrideLang?: SupportedLanguage): AxiomIRRepresentation {
    const lang = overrideLang || this.detectLanguage(codeSnippet);
    const ast = this.asciiParser.parseToAST(codeSnippet);
    return this.irTransformer.transform(ast, lang);
  }
}
