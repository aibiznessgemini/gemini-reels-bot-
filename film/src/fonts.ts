// All fonts are bundled in public/fonts so renders never depend on the network.
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const font = (family: string, file: string, weight = "400", style = "normal") => {
  loadFont({ family, url: staticFile(`fonts/${file}`), weight, style, format: "woff2" });
  return `"${family}"`;
};

export const FONTS = {
  fredoka: font("Fredoka", "Fredoka-600.woff2", "600"),
  patrick: font("Patrick Hand", "PatrickHand.woff2"),
  fell: font("IM Fell English", "IMFellEnglish.woff2"),
  press: font("Press Start 2P", "PressStart2P.woff2"),
  caveat: font("Caveat", "Caveat-700.woff2", "700"),
  cabin: font("Cabin Sketch", "CabinSketch-700.woff2", "700"),
  cormorant: font("Cormorant Garamond", "CormorantGaramond-700i.woff2", "700", "italic"),
};
