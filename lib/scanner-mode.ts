/** Shared client-side state for the hardware/scanner attendance mode. */

export const SCANNER_MODE_KEY = "selc_scanner_mode";
export const SCANNER_MODE_EVENT = "selc:scanner-mode";

export function readScannerMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SCANNER_MODE_KEY) === "1";
}

export function writeScannerMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SCANNER_MODE_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent<boolean>(SCANNER_MODE_EVENT, { detail: enabled }));
}

/** Subscribe to scanner-mode changes (for useSyncExternalStore). */
export function subscribeScannerMode(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SCANNER_MODE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(SCANNER_MODE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function getScannerModeSnapshot(): boolean {
  return readScannerMode();
}

export function getScannerModeServerSnapshot(): boolean {
  return false;
}
