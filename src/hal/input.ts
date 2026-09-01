/**
 * HAL — GİRDİ SOYUTLAMASI (FAZ 11)
 * ------------------------------------------------------------------
 * Tek olay kanalı: fare, dokunmatik, kalem, klavye ve (native kolda)
 * evdev/gpio/sensör olayları aynı biçime indirgenir. Kabuk ve
 * uygulamalar girdinin nereden geldiğini bilmez.
 *
 * Rust karşılığı: `crates/tedbirge-hal-linux/src/input.rs`
 * (`InputEvent::Pointer | Press | Key` ile birebir aynı sözleşme).
 */

export type InputEvent =
  | { type: "pointer"; x: number; y: number }
  | { type: "press"; down: boolean }
  | { type: "key"; code: string; down: boolean };

export type InputListener = (event: InputEvent) => void;

export interface InputHal {
  /** Olay kanalına abone olur; abonelikten çıkma işlevini döner. */
  subscribe: (fn: InputListener) => () => void;
  /** Native/sensör kaynaklarının olay basması için giriş noktası. */
  emit: (event: InputEvent) => void;
  /** Son bilinen işaretçi konumu. */
  pointer: () => { x: number; y: number };
}

const listeners = new Set<InputListener>();
let last = { x: 0, y: 0 };
let bound = false;

function dispatch(event: InputEvent) {
  if (event.type === "pointer") last = { x: event.x, y: event.y };
  for (const fn of listeners) fn(event);
}

/** Tarayıcı olaylarını tek kanala bağlar (yalnız bir kez). */
function bindBrowser() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  window.addEventListener(
    "pointermove",
    (e) => dispatch({ type: "pointer", x: e.clientX, y: e.clientY }),
    { passive: true },
  );
  window.addEventListener("pointerdown", () => dispatch({ type: "press", down: true }), {
    passive: true,
  });
  window.addEventListener("pointerup", () => dispatch({ type: "press", down: false }), {
    passive: true,
  });
  window.addEventListener("keydown", (e) => dispatch({ type: "key", code: e.code, down: true }));
  window.addEventListener("keyup", (e) => dispatch({ type: "key", code: e.code, down: false }));
}

/** Tarayıcı uygulaması — pointer/klavye olaylarını tek kanala indirger. */
export const webInputHal: InputHal = {
  subscribe: (fn) => {
    bindBrowser();
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  emit: (event) => dispatch(event),
  pointer: () => last,
};
