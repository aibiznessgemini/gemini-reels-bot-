import { Composition } from "remotion";
import { StyleScene } from "./test/Scene";
import { STYLE_IDS, THEMES, StyleId } from "./test/themes";
import { DURATION, FPS, H, W } from "./test/timeline";

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
  </>
);
