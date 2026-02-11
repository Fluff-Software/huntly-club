import { ImageSourcePropType } from "react-native";

export type MissionCardData = {
  id: string;
  image: ImageSourcePropType;
  title: string;
  description: string;
};

const LASER_FORTRESS_IMAGE = require("@/assets/images/laser-fortress.jpg");

export const MISSION_CARDS: MissionCardData[] = [
  {
    id: "1",
    image: LASER_FORTRESS_IMAGE,
    title: "Build a Laser Maze",
    description:
      "Create a laser maze using string, wool or tape. Rules are up to you: time limit, penalties, silent mode.",
  },
  {
    id: "2",
    image: LASER_FORTRESS_IMAGE,
    title: "Build a Laser Maze",
    description:
      "Create a laser maze using string, wool or tape. Rules are up to you: time limit, penalties, silent mode.",
  },
  {
    id: "3",
    image: LASER_FORTRESS_IMAGE,
    title: "Build a Laser Maze",
    description:
      "Create a laser maze using string, wool or tape. Rules are up to you: time limit, penalties, silent mode.",
  },
];
