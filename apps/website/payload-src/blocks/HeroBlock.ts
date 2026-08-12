import type { Block } from "payload";

export const HeroBlock: Block = {
  slug: "hero",
  labels: { singular: "Hero", plural: "Heroes" },
  fields: [
    {
      name: "eyebrow",
      type: "text",
      defaultValue: "The Huntly Mission",
    },
    {
      name: "headline",
      type: "textarea",
      required: true,
    },
    {
      name: "body",
      type: "textarea",
      required: true,
    },
    {
      name: "primaryCta",
      type: "group",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "href", type: "text", required: true },
      ],
    },
    {
      name: "secondaryCta",
      type: "group",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "href", type: "text", required: true },
      ],
    },
    {
      name: "caption",
      type: "text",
      admin: {
        description: "Small line under the buttons, e.g. social proof.",
      },
    },
    {
      name: "images",
      type: "array",
      minRows: 1,
      maxRows: 3,
      admin: {
        description: "First image is shown large; a 2nd and 3rd overlap it as a photo collage.",
      },
      fields: [
        { name: "image", type: "upload", relationTo: "media", required: true },
        { name: "alt", type: "text", required: true },
      ],
    },
  ],
};
