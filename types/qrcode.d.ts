/**
 * Minimal ambient types for the `qrcode` package (it ships without typings).
 */
declare module "qrcode" {
  export interface QRCodeRenderersOptions {
    width?: number;
    margin?: number;
    scale?: number;
    errorCorrectionLevel?: "low" | "medium" | "quartile" | "high" | "L" | "M" | "Q" | "H";
    color?: { dark?: string; light?: string };
  }

  export function toDataURL(
    text: string,
    options?: QRCodeRenderersOptions,
  ): Promise<string>;

  export function toString(
    text: string,
    options?: QRCodeRenderersOptions & { type?: "svg" | "utf8" | "terminal" },
  ): Promise<string>;

  const QRCode: {
    toDataURL: typeof toDataURL;
    toString: typeof toString;
  };

  export default QRCode;
}
