import { describe, expect, it } from "vitest";
import { findContradiction } from "@/lib/axiom/verify/constraints";

describe("AST çelişki motoru", () => {
  it.each(["1 = 2", "0=1", "false = true", "x > 10 and x < 5", "x > 10 ∧ x < 5", "p ∧ ¬p", "p & !p", "p and not p", "3 < 1"])(
    "%s → çelişki",
    (t) => expect(findContradiction(t)).not.toBeNull(),
  );
  it.each(["E = mc^2", "x > 1 ∧ x < 5", "1 = 1", "p ∧ ¬¬p", "p & !!p", "p | ¬p", "x > 10 | x < 5", "enerji korunur"])(
    "%s → çelişki yok",
    (t) => expect(findContradiction(t)).toBeNull(),
  );
});
