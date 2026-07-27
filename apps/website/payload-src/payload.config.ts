import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import { seoPlugin } from "@payloadcms/plugin-seo";

import { Users } from "./collections/Users";
import { Media } from "./collections/Media";
import { Posts } from "./collections/Posts";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname, ".."),
    },
  },
  collections: [Users, Media, Posts],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "..", "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.PAYLOAD_DATABASE_URI || "",
    },
    schemaName: "payload",
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: {
          generateFileURL: ({ filename, prefix }) => {
            const path = [prefix, filename]
              .filter(Boolean)
              .map((segment) => encodeURIComponent(segment as string))
              .join("/");
            return `${process.env.R2_PUBLIC_URL}/${path}`;
          },
        },
      },
      bucket: process.env.R2_BUCKET || "",
      config: {
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
        },
        forcePathStyle: true,
        // AWS SDK v3 defaults to sending checksum trailers R2 doesn't support,
        // which R2 rejects (surfaces as AccessDenied). Opt back out.
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      },
    }),
    seoPlugin({
      collections: ["posts"],
      uploadsCollection: "media",
      tabbedUI: true,
      interfaceName: "PostMeta",
      generateTitle: ({ doc }: { doc: any }) => (doc?.title ? `${doc.title} | Huntly World` : "Huntly World"),
      generateDescription: ({ doc }: { doc: any }) => doc?.excerpt || "",
      generateImage: ({ doc }: { doc: any }) => doc?.coverImage,
      generateURL: ({ doc }: { doc: any }) => `https://huntly.world/blog/${doc?.slug ?? ""}`,
      fields: ({ defaultFields }) => [
        ...defaultFields,
        {
          name: "keywords",
          type: "text",
          admin: {
            description:
              "Comma-separated keywords. Modern search engines mostly ignore this, but some aggregators/social tools still read it.",
          },
        },
      ],
    }),
  ],
});
