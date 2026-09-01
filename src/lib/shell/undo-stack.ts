/**
 * SİSTEM GENELİ GERİ ALMA YIĞINI (Nielsen #3 — Kullanıcı Özgürlüğü)
 * ------------------------------------------------------------------
 * Yıkıcı ya da geri alınabilir her işlem buraya bir kayıt bırakır.
 * `Ctrl + Z` en son kaydı geri alır. Yığın sınırlıdır; eski kayıtlar
 * sessizce düşer.
 */

export type UndoEntry = {
  /** Kullanıcıya gösterilecek kısa açıklama: "Pencere kapatıldı". */
  label: string;
  /** İşlemi geri alan fonksiyon. */
  undo: () => void | Promise<void>;
};

const LIMIT = 20;
const stack: UndoEntry[] = [];

export function pushUndo(entry: UndoEntry) {
  stack.push(entry);
  if (stack.length > LIMIT) stack.shift();
}

/** Son işlemi geri alır; yığın boşsa null döner. */
export function popUndo(): UndoEntry | null {
  return stack.pop() ?? null;
}

export function undoDepth(): number {
  return stack.length;
}

export function clearUndo() {
  stack.length = 0;
}
