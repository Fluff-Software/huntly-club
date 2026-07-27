import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getPayloadClient } from "../lib/payload";

export const metadata: Metadata = {
  title: "Blog",
  description: "Stories, tips and updates from the Huntly World team.",
  alternates: {
    canonical: "https://huntly.world/blog",
  },
};

export const revalidate = 60;

export default async function BlogIndexPage() {
  const payload = await getPayloadClient();

  const { docs: posts } = await payload.find({
    collection: "posts",
    where: {
      _status: { equals: "published" },
    },
    sort: "-publishedAt",
    depth: 1,
    limit: 50,
  });

  return (
    <>
      <div className="bg-huntly-stone/20 py-10 sm:py-12">
        <div className="section">
          <div className="mx-auto max-w-2xl space-y-3">
            <h1 className="font-display text-2xl font-semibold text-huntly-forest sm:text-3xl">Blog</h1>
            <p className="text-sm leading-relaxed text-huntly-slate sm:text-base">
              Stories, tips and updates from the Huntly World team.
            </p>
          </div>
        </div>
      </div>

      <div className="section py-12 sm:py-16">
        <div className="mx-auto max-w-2xl space-y-6">
          {posts.length === 0 && <p className="text-sm text-huntly-slate">No posts yet — check back soon.</p>}

          {posts.map((post) => {
            const cover = typeof post.coverImage === "object" ? post.coverImage : null;
            return (
              <Link key={post.id} href={`/blog/${post.slug}`} className="card block space-y-3 no-underline">
                {cover?.url && (
                  <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl">
                    <Image
                      src={cover.url}
                      alt={cover.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, 640px"
                      className="object-cover"
                    />
                  </div>
                )}
                <h2 className="text-lg font-semibold text-huntly-forest">{post.title}</h2>
                {post.excerpt && <p className="text-sm text-huntly-slate">{post.excerpt}</p>}
                {post.publishedAt && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-huntly-slate">
                    {new Date(post.publishedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
