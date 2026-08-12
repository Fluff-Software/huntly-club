import type { Block } from "payload";

export const FeaturesBlock: Block = {
  slug: "features",
  labels: { singular: "Features", plural: "Features" },
  fields: [
    {
      name: "heading",
      type: "text",
      required: true,
    },
    {
      name: "items",
      type: "array",
      minRows: 3,
      maxRows: 3,
      fields: [
        {
          name: "iconChipColor",
          type: "select",
          required: true,
          options: [
            { label: "Pink", value: "pink" },
            { label: "Teal", value: "teal" },
            { label: "Gold", value: "gold" },
          ],
        },
        { name: "heading", type: "text", required: true },
        { name: "description", type: "textarea", required: true },
      ],
    },
  ],
};
