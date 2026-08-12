import type { Block } from "payload";

export const QuoteBlock: Block = {
  slug: "quote",
  labels: { singular: "Quote", plural: "Quotes" },
  fields: [
    {
      name: "backgroundImage",
      type: "upload",
      relationTo: "media",
      required: true,
    },
    {
      name: "quote",
      type: "textarea",
      required: true,
    },
    {
      name: "attribution",
      type: "text",
      required: true,
    },
  ],
};
