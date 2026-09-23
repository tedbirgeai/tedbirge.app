/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

export interface ASTNode {
  type: "ROOT" | "STATEMENT" | "TOKEN" | "OPERATOR" | "INVARIANT_REF" | "IDENTIFIER";
  value: string;
  byteOffset: number;
  byteLength: number;
  children: ASTNode[];
}

export class ASKASCIIParser {
  private encoder = new TextEncoder();

  public parseToBytes(input: string): Uint8Array {
    return this.encoder.encode(input);
  }

  public parseToAST(input: string): ASTNode {
    const bytes = this.parseToBytes(input);
    const rootNode: ASTNode = {
      type: "ROOT",
      value: "ASK_ASCII_1.0_TREE",
      byteOffset: 0,
      byteLength: bytes.length,
      children: []
    };

    const tokens = input.trim().split(/\s+/);
    let currentOffset = 0;

    tokens.forEach((token) => {
      const tokenBytes = this.encoder.encode(token);
      const isOperator = ["=", "+", "-", "*", "/", "<=", ">=", "==", "!="].includes(token);
      const isInvariant = token.startsWith("INV-") || token.startsWith("MTH-") || token.startsWith("ENG-");

      let nodeType: ASTNode["type"] = "TOKEN";
      if (isOperator) nodeType = "OPERATOR";
      if (isInvariant) nodeType = "INVARIANT_REF";

      rootNode.children.push({
        type: nodeType,
        value: token,
        byteOffset: currentOffset,
        byteLength: tokenBytes.length,
        children: []
      });

      currentOffset += tokenBytes.length + 1;
    });

    return rootNode;
  }
}
