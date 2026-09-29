/** Dock simgesi tıklandığında yapılacak pencere eylemi (saf, test edilebilir). */
export type DockWin = { id: string; minimized: boolean; z: number };
export type DockAction =
  | { kind: "launch" }
  | { kind: "restore"; id: string }
  | { kind: "focus"; id: string }
  | { kind: "minimize"; id: string };

/** `appWins`: uygulamanın pencereleri; `topZ`: ekrandaki en üst görünür pencere z değeri. */
export function dockAction(appWins: DockWin[], topZ: number): DockAction {
  if (!appWins.length) return { kind: "launch" };
  const visible = appWins.filter((w) => !w.minimized).sort((a, b) => b.z - a.z);
  const top = visible[0];
  if (!top) return { kind: "restore", id: [...appWins].sort((a, b) => b.z - a.z)[0]!.id };
  if (top.z >= topZ) return { kind: "minimize", id: top.id };
  return { kind: "focus", id: top.id };
}
