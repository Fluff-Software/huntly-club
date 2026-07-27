import type { CollectionConfig } from "payload";
import { lexicalEditor } from "@payloadcms/richtext-lexical";

export const Posts: CollectionConfig = {
  slug: "posts",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "_status", "publishedAt"],
  },
  access: {
    read: ({ req }) => {
      // Logged-in admins can see drafts; the public site only ever sees published posts.
      if (req.user) return true;
      return {
        _status: { equals: "published" },
      };
    },
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        description: "Used in the URL, e.g. /blog/my-post",
      },
    },
    {
      name: "excerpt",
      type: "textarea",
      admin: {
        description: "Short summary shown on the blog listing page",
      },
    },
    {
      name: "coverImage",
      type: "upload",
      relationTo: "media",
      admin: {
        description: "1536×1024 (3:2). Shown at that ratio on listings and the post page, so keep any text clear of the far left/right edges.",
      },
    },
    {
      name: "content",
      type: "richText",
      editor: lexicalEditor(),
      required: true,
    },
    {
      name: "publishedAt",
      type: "date",
      admin: {
        date: { pickerAppearance: "dayAndTime" },
      },
    },
  ],
};
