import { beforeEach, describe, expect, it } from "vitest";

import {
  __resetGeneratedApps,
  generatedApp,
  generatedApps,
  removeGeneratedApp,
  saveGeneratedApp,
} from "@/lib/studio/generated-apps";
import { generateApp } from "@/lib/studio/generator";
import { catalogApp } from "@/shell/installed";

const app = () => ({ spec: generateApp("eş durumu panosu"), module: "data:application/wasm;base64,AA" });

describe("üretilen uygulama kayıt defteri", () => {
  beforeEach(() => __resetGeneratedApps());

  it("kaydeder, okur ve kaldırır", () => {
    const a = app();
    saveGeneratedApp(a);
    expect(generatedApps()).toHaveLength(1);
    expect(generatedApp(a.spec.id)?.spec.name).toBe(a.spec.name);
    removeGeneratedApp(a.spec.id);
    expect(generatedApp(a.spec.id)).toBeUndefined();
  });

  it("aynı kimliği çoğaltmaz", () => {
    saveGeneratedApp(app());
    saveGeneratedApp(app());
    expect(generatedApps()).toHaveLength(1);
  });

  it("masaüstü kataloğunda görünür ve yerleşik sayılmaz", () => {
    const a = app();
    saveGeneratedApp(a);
    const entry = catalogApp(a.spec.id);
    expect(entry?.label).toBe(a.spec.name);
    expect(entry?.builtin).toBe(false);
  });
});
