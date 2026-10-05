declare module "jsqr" {
  interface QRCodeLocationPoint {
    x: number;
    y: number;
  }

  interface QRCodeLocation {
    topRightCorner: QRCodeLocationPoint;
    topLeftCorner: QRCodeLocationPoint;
    bottomRightCorner: QRCodeLocationPoint;
    bottomLeftCorner: QRCodeLocationPoint;
    topRightFinderPattern: QRCodeLocationPoint;
    topLeftFinderPattern: QRCodeLocationPoint;
    bottomLeftFinderPattern: QRCodeLocationPoint;
  }

  interface QRCode {
    binaryData: number[];
    data: string;
    chunks: unknown[];
    version: number;
    location: QRCodeLocation;
  }

  interface Options {
    inversionAttempts?:
      | "dontInvert"
      | "onlyInvert"
      | "attemptBoth";
  }

  function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: Options,
  ): QRCode | null;

  export default jsQR;
}
