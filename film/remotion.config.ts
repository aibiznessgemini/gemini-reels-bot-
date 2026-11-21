/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */
import fs from "node:fs";
import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);

// Cloud sessions cannot download Remotion's browser (remotion.media is blocked),
// so use the pre-installed headless shell when it exists.
const LOCAL_SHELL = process.env.REMOTION_BROWSER ?? "/opt/pw-browsers/chromium_headless_shell";
if (fs.existsSync(LOCAL_SHELL)) {
  Config.setBrowserExecutable(LOCAL_SHELL);
}

// No GPU in the cloud container: render WebGL with SwiftShader through ANGLE.
Config.setChromiumOpenGlRenderer("swangle");
