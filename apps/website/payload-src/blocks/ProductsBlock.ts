import type { Block } from "payload";

export const ProductsBlock: Block = {
  slug: "products",
  labels: { singular: "Products", plural: "Products" },
  fields: [
    {
      name: "eyebrow",
      type: "text",
      defaultValue: "What We Make",
    },
    {
      name: "heading",
      type: "text",
      required: true,
    },
    {
      name: "subtext",
      type: "textarea",
    },
    {
      name: "cards",
      type: "array",
      minRows: 2,
      fields: [
        { name: "photo", type: "upload", relationTo: "media", required: true },
        { name: "brandLabel", type: "text", required: true },
        {
          name: "brandColor",
          type: "select",
          required: true,
          options: [
            { label: "Coral (Huntly)", value: "red" },
            { label: "Green (Huntly World)", value: "green" },
          ],
        },
        { name: "title", type: "text", required: true },
        { name: "description", type: "textarea", required: true },
        { name: "linkLabel", type: "text", required: true },
        { name: "linkHref", type: "text", required: true },
      ],
    },
  ],
};
