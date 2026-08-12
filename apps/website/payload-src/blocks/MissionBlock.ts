import type { Block } from "payload";

export const MissionBlock: Block = {
  slug: "mission",
  labels: { singular: "Mission", plural: "Mission" },
  fields: [
    {
      name: "eyebrow",
      type: "text",
      defaultValue: "Why We Exist",
    },
    {
      name: "headlinePrefix",
      type: "text",
      admin: { description: "Text before the highlighted word." },
    },
    {
      name: "headlineHighlight",
      type: "text",
      required: true,
      admin: { description: "The single word/phrase rendered in gold." },
    },
    {
      name: "headlineSuffix",
      type: "text",
      admin: { description: "Text after the highlighted word." },
    },
    {
      name: "body",
      type: "textarea",
      required: true,
    },
    {
      name: "features",
      type: "array",
      minRows: 3,
      maxRows: 3,
      fields: [
        { name: "heading", type: "text", required: true },
        { name: "description", type: "textarea", required: true },
      ],
    },
  ],
};
