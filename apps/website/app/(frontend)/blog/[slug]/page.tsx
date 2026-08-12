import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { getPayloadClient } from "../../lib/payload";

export const revalidate = 60;

type Args = {
  params: Promise<{ slug: string }>;
};

async function getPost(slug: string) {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "posts",
    where: {
      slug: { equals: slug },
      _status: { equals: "published" },
    },
    depth: 1,
    limit: 1,
  });
  return docs[0] ?? null;
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const metaImage = typeof post.meta?.image === "object" ? post.meta.image : null;
  const fallbackImage = typeof post.coverImage === "object" ? post.coverImage : null;
  const ogImage = metaImage ?? fallbackImage;

  const title = post.meta?.title || post.title;
  const description = post.meta?.description || post.excerpt || undefined;
  const keywords = post.meta?.keywords
    ? post.meta.keywords
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    : undefined;
  const url = `https://huntly.world/blog/${post.slug}`;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url,
      images: ogImage?.url ? [{ url: ogImage.url, alt: ogImage.alt }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage?.url ? [ogImage.url] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Args) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const cover = typeof post.coverImage === "object" ? post.coverImage : null;
  const url = `https://huntly.world/blog/${post.slug}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || undefined,
    image: cover?.url ? [cover.url] : undefined,
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt || post.publishedAt || undefined,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: "Huntly" },
    publisher: {
      "@type": "Organization",
      name: "Huntly",
      logo: { "@type": "ImageObject", url: "https://huntly.world/logo.webp" },
    },
  };

  return (
    <div className="section py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <article className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-3">
          <h1 className="font-display text-2xl font-semibold text-huntly-forest sm:text-3xl">{post.title}</h1>
          {post.publishedAt && (
            <p className="text-xs font-semibold uppercase tracking-wide text-huntly-slate">
              {new Date(post.publishedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </header>

        {cover?.url && (
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl">
            <Image src={cover.url} alt={cover.alt} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
          </div>
        )}

        <div className="richtext">
          <RichText data={post.content} />
        </div>
      </article>
    </div>
  );
}
