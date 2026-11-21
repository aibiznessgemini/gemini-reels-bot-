import { Composition } from "remotion";
import { StyleScene } from "./test/Scene";
import { STYLE_IDS, THEMES, StyleId } from "./test/themes";
import { DURATION, FPS, H, W } from "./test/timeline";
import { Probe } from "./style3d/Probe";
import { Test3D, TEST3D_FRAMES } from "./style3d/Test3D";
import { calculateFilmMetadata, Film, FilmProps, Thumbnail } from "./engine/Film";
import sample from "../films/sample/film.json";
import { FilmSpec } from "./engine/types";
import { Avatar, Banner, Watermark } from "./engine/Brand";

const SAMPLE = { spec: sample as FilmSpec } satisfies FilmProps;

const StyleTest: React.FC<{ style: StyleId }> = ({ style }) => <StyleScene t={THEMES[style]} />;

export const RemotionRoot: React.FC = () => (
  <>
    {STYLE_IDS.map((id) => (
      <Composition
        key={id}
        id={`Test-${id}`}
        component={StyleTest}
        durationInFrames={DURATION}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ style: id }}
      />
    ))}
    <Composition id="Test3D" component={Test3D} durationInFrames={TEST3D_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="Film" component={Film} durationInFrames={300} fps={30} width={1920} height={1080} defaultProps={SAMPLE} calculateMetadata={calculateFilmMetadata} />
    <Composition id="Thumbnail" component={Thumbnail} durationInFrames={1} fps={30} width={1920} height={1080} defaultProps={SAMPLE} />
    <Composition id="Avatar" component={Avatar} durationInFrames={1} fps={30} width={800} height={800} />
    <Composition id="Banner" component={Banner} durationInFrames={1} fps={30} width={2560} height={1440} />
    <Composition id="Watermark" component={Watermark} durationInFrames={1} fps={30} width={150} height={150} />
    <Composition id="Probe3D" component={Probe} durationInFrames={60} fps={30} width={1920} height={1080} />
  </>
);
