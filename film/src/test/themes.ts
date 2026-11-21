import { FONTS } from "../fonts";

const { fredoka, patrick, fell, press, caveat, cabin, cormorant } = FONTS;

export type StyleId = "paper" | "woodcut" | "pixel" | "chalk" | "puppet";

export type Theme = {
  id: StyleId;
  name: string;
  sky: [string, string];
  moon: string;
  moonGlow: string;
  farHill: string;
  nearHill: string;
  tree: string;
  ground: string;
  groundLine: string;
  dog: string;
  dogFar: string;
  dogDetail: string;
  eye: string;
  outline: string | null;
  outlineWidth: number;
  house: string;
  roof: string;
  door: string;
  light: string;
  snow: string;
  text: string;
  accent: string;
  titleBg: string;
  titleColor: string;
  font: string;
  titleFont: string;
  textSize: number;
  titleSize: number;
  /** Frame quantization: 1 = every frame, 2 = "on twos" (stop-motion feel). */
  steps: number;
};

export const THEMES: Record<StyleId, Theme> = {
  paper: {
    id: "paper",
    name: "Paper cut-out",
    sky: ["#14304A", "#2F5D73"],
    moon: "#F4D06F",
    moonGlow: "#F4D06F",
    farHill: "#3B6E78",
    nearHill: "#2A5560",
    tree: "#1F4048",
    ground: "#E9DFC7",
    groundLine: "#CDBF9E",
    dog: "#D9822B",
    dogFar: "#A85F1C",
    dogDetail: "#F2E2C4",
    eye: "#1B1B1B",
    outline: null,
    outlineWidth: 0,
    house: "#B5473A",
    roof: "#5B2E2A",
    door: "#7A3B2E",
    light: "#FFD77A",
    snow: "#FFFFFF",
    text: "#2B2B2B",
    accent: "#F4D06F",
    titleBg: "#14304A",
    titleColor: "#F6EBD2",
    font: patrick,
    titleFont: fredoka,
    textSize: 46,
    titleSize: 230,
    steps: 2,
  },
  woodcut: {
    id: "woodcut",
    name: "Woodcut print",
    sky: ["#EFE5CF", "#EFE5CF"],
    moon: "#EFE5CF",
    moonGlow: "#C23B22",
    farHill: "#1A1714",
    nearHill: "#1A1714",
    tree: "#1A1714",
    ground: "#EFE5CF",
    groundLine: "#1A1714",
    dog: "#C23B22",
    dogFar: "#8E2A17",
    dogDetail: "#EFE5CF",
    eye: "#1A1714",
    outline: "#1A1714",
    outlineWidth: 5,
    house: "#1A1714",
    roof: "#1A1714",
    door: "#1A1714",
    light: "#C23B22",
    snow: "#EFE5CF",
    text: "#1A1714",
    accent: "#C23B22",
    titleBg: "#EFE5CF",
    titleColor: "#1A1714",
    font: fell,
    titleFont: fell,
    textSize: 52,
    titleSize: 250,
    steps: 1,
  },
  pixel: {
    id: "pixel",
    name: "Pixel art",
    sky: ["#1D1B3A", "#3A3266"],
    moon: "#FFEC8A",
    moonGlow: "#FFEC8A",
    farHill: "#45407A",
    nearHill: "#2D6B5A",
    tree: "#1F4A3F",
    ground: "#DDE6F0",
    groundLine: "#A9B8CC",
    dog: "#E8A04A",
    dogFar: "#B36A2A",
    dogDetail: "#FFE3B5",
    eye: "#161616",
    outline: "#161616",
    outlineWidth: 6,
    house: "#B8423C",
    roof: "#5A2433",
    door: "#6B3A2A",
    light: "#FFD45C",
    snow: "#FFFFFF",
    text: "#FFFFFF",
    accent: "#FFD45C",
    titleBg: "#0F0E1F",
    titleColor: "#FFFFFF",
    font: press,
    titleFont: press,
    textSize: 30,
    titleSize: 170,
    steps: 2,
  },
  chalk: {
    id: "chalk",
    name: "Chalk on blackboard",
    sky: ["#1E2B26", "#24342E"],
    moon: "#F8E6A0",
    moonGlow: "#F8E6A0",
    farHill: "#9FC7B8",
    nearHill: "#CFE3DA",
    tree: "#9FC7B8",
    ground: "#24342E",
    groundLine: "#F2F2EE",
    dog: "#F5B78A",
    dogFar: "#D99A70",
    dogDetail: "#F2F2EE",
    eye: "#F2F2EE",
    outline: "#F2F2EE",
    outlineWidth: 6,
    house: "#E58C8A",
    roof: "#F2F2EE",
    door: "#F2F2EE",
    light: "#F8E6A0",
    snow: "#F2F2EE",
    text: "#F2F2EE",
    accent: "#F8E6A0",
    titleBg: "#1E2B26",
    titleColor: "#F2F2EE",
    font: caveat,
    titleFont: cabin,
    textSize: 64,
    titleSize: 250,
    steps: 1,
  },
  puppet: {
    id: "puppet",
    name: "Shadow puppet",
    sky: ["#FFD995", "#4A1A06"],
    moon: "#FFF4D6",
    moonGlow: "#FFF0C2",
    farHill: "#C9783A",
    nearHill: "#A3561F",
    tree: "#140903",
    ground: "#140903",
    groundLine: "#140903",
    dog: "#140903",
    dogFar: "#140903",
    dogDetail: "#140903",
    eye: "#FFE6A6",
    outline: null,
    outlineWidth: 0,
    house: "#140903",
    roof: "#140903",
    door: "#140903",
    light: "#FFE6A6",
    snow: "#2B1408",
    text: "#2B1205",
    accent: "#FFE6A6",
    titleBg: "#E9883A",
    titleColor: "#140903",
    font: cormorant,
    titleFont: cormorant,
    textSize: 64,
    titleSize: 260,
    steps: 1,
  },
};

export const STYLE_IDS = Object.keys(THEMES) as StyleId[];
