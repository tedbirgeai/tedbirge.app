/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import { ASKASCIIParser } from "./ask_ascii_parser";
import { AxiomIRTransformer, AxiomIRRepresentation } from "./axiom_ir";

export type ProgrammingLanguage = 
  | "C" | "CPP" | "RUST" | "ADA" | "ZIG" | "VHDL" | "VERILOG"
  | "JAVA" | "CSHARP" | "KOTLIN" | "SWIFT"
  | "PYTHON" | "TYPESCRIPT" | "JAVASCRIPT" | "BASH"
  | "HASKELL" | "LEAN4" | "COQ"
  | "COBOL" | "FORTRAN"
  | "SOLIDITY" | "WASM" | "ASK_ASCII";

export type NaturalLanguageCode = 
  | "sw-KE" | "tr-TR" | "en-US" | "de-DE" | "fr-FR" | "es-ES" 
  | "zh-CN" | "ar-SA" | "ru-RU" | "hi-IN" | "ja-JP" | "GLOBAL_ISO";

export type SupportedLanguage = ProgrammingLanguage | NaturalLanguageCode | string;

export interface LanguageCandidate {
  language: SupportedLanguage;
  confidence: number;
  category: "PROGRAMMING" | "NATURAL_LOGIC";
  matchedSignatures: string[];
}

export interface CrossQueryResult {
  primaryLanguage: SupportedLanguage;
  secondaryLanguage?: SupportedLanguage;
  isMixedContent: boolean;
  codeSnippetDetected: boolean;
  naturalLogicDetected: boolean;
  rankedCandidates: LanguageCandidate[];
  crossQueryMatrix: Record<string, number>;
}

export interface GlobalLanguageProfile {
  code: NaturalLanguageCode;
  name: string;
  script: "Latin" | "Cyrillic" | "Arabic" | "CJK" | "Devanagari";
  logicKeywords: Set<string>;
  syntaxSignatures: string[];
}

// Global Doğal Dil ve Mantık Edatları Veritabanı
const GLOBAL_LANGUAGE_REGISTRY: GlobalLanguageProfile[] = [
  {
    code: "sw-KE",
    name: "Swahili (Kiswahili)",
    script: "Latin",
    logicKeywords: new Set(["ikiwa", "wanadamu", "wote", "viumbe", "wenye", "busara", "na", "ni", "mwanadamu", "basi", "kiumbe", "mwenye"]),
    syntaxSignatures: ["ikiwa...basi", "wote ni"]
  },
  {
    code: "tr-TR",
    name: "Turkish",
    script: "Latin",
    logicKeywords: new Set(["eğer", "tüm", "bütün", "insanlar", "akıllıdır", "ve", "ise", "oysa", "o halde", "bir"]),
    syntaxSignatures: ["eğer...ise", "bütün...dir"]
  },
  {
    code: "en-US",
    name: "English",
    script: "Latin",
    logicKeywords: new Set(["if", "then", "all", "humans", "are", "rational", "therefore", "given", "assume", "proof"]),
    syntaxSignatures: ["if...then", "all...are"]
  }
];

export class OmniLanguageParser {
  private asciiParser = new ASKASCIIParser();
  private irTransformer = new AxiomIRTransformer();

  /**
   * Standart Dil Tespiti (Geriye Dönük %100 Uyumlu)
   */
  public detectLanguage(codeSnippet: string): SupportedLanguage {
    const crossResult = this.crossQueryLanguage(codeSnippet);
    return crossResult.primaryLanguage;
  }

  /**
   * Çapraz Sorgu Motoru (Cross-Query Engine)
   * Kod ve Doğal Dilleri matrisel olarak çapraz eşleştirir, karma içerikleri tespit eder.
   */
  public crossQueryLanguage(input: string): CrossQueryResult {
    const text = input.trim();
    const lowerText = text.toLowerCase();
    const candidates: LanguageCandidate[] = [];
    const matrix: Record<string, number> = {};

    // 1. Yazılım / Donanım Dilleri Çapraz Sorgusu
    const progSignatures: Array<{ lang: ProgrammingLanguage; sigs: string[] }> = [
      { lang: "RUST", sigs: ["fn main()", "#[axiom_verify]", "let mut", "impl"] },
      { lang: "C", sigs: ["#include", "int main(", "void*"] },
      { lang: "TYPESCRIPT", sigs: ["interface ", "export class ", "type ", "async function"] },
      { lang: "PYTHON", sigs: ["def ", "import ", "if __name__ =="] },
      { lang: "SOLIDITY", sigs: ["pragma solidity", "contract "] },
      { lang: "COBOL", sigs: ["IDENTIFICATION DIVISION.", "PROCEDURE DIVISION."] },
      { lang: "FORTRAN", sigs: ["PROGRAM ", "IMPLICIT NONE"] },
      { lang: "VHDL", sigs: ["entity ", "is port("] }
    ];

    let maxProgScore = 0;
    for (const item of progSignatures) {
      const matched = item.sigs.filter(s => text.includes(s));
      if (matched.length > 0) {
        const score = Math.min(0.50 + matched.length * 0.25, 0.99);
        matrix[item.lang] = score;
        candidates.push({
          language: item.lang,
          confidence: score,
          category: "PROGRAMMING",
          matchedSignatures: matched
        });
        if (score > maxProgScore) maxProgScore = score;
      }
    }

    // 2. Doğal Dil Mantık Önermeleri Çapraz Sorgusu
    const tokens = lowerText.match(/\b[\w'-]+\b/gu) || [];
    for (const profile of GLOBAL_LANGUAGE_REGISTRY) {
      const matchedKeywords: string[] = [];
      tokens.forEach(token => {
        if (profile.logicKeywords.has(token)) matchedKeywords.push(token);
      });

      const matchedSyntax = profile.syntaxSignatures.filter(sig => {
        const parts = sig.split("...");
        return parts.every(p => lowerText.includes(p));
      });

      if (matchedKeywords.length > 0 || matchedSyntax.length > 0) {
        const keywordScore = tokens.length > 0 ? (matchedKeywords.length / tokens.length) * 0.5 : 0;
        const syntaxScore = matchedSyntax.length * 0.3;
        const totalScore = Math.min(0.40 + keywordScore + syntaxScore, 0.98);

        matrix[profile.code] = Number(totalScore.toFixed(3));
        candidates.push({
          language: profile.code,
          confidence: Number(totalScore.toFixed(3)),
          category: "NATURAL_LOGIC",
          matchedSignatures: [...matchedKeywords, ...matchedSyntax]
        });
      }
    }

    // 3. Çapraz Matris Sıralaması ve Karma İçerik Analizi
    candidates.sort((a, b) => b.confidence - a.confidence);

    const primary = candidates.length > 0 ? candidates[0].language : "ASK_ASCII";
    const secondary = candidates.length > 1 ? candidates[1].language : undefined;
    
    const isMixed = candidates.length >= 2 && 
      candidates[0].category !== candidates[1].category && 
      candidates[1].confidence > 0.35;

    return {
      primaryLanguage: primary,
      secondaryLanguage: secondary,
      isMixedContent: isMixed,
      codeSnippetDetected: candidates.some(c => c.category === "PROGRAMMING"),
      naturalLogicDetected: candidates.some(c => c.category === "NATURAL_LOGIC"),
      rankedCandidates: candidates,
      crossQueryMatrix: matrix
    };
  }

  /**
   * Metni AST ve IR seviyesine dönüştürür.
   */
  public parseToIR(codeSnippet: string, overrideLang?: SupportedLanguage): AxiomIRRepresentation {
    const lang = overrideLang || this.detectLanguage(codeSnippet);
    const ast = this.asciiParser.parseToAST(codeSnippet);
    return this.irTransformer.transform(ast, lang as any);
  }
}

export default OmniLanguageParser;
