import type { Metadata } from "next";
import { absoluteUrl, siteUrl } from "@/lib/site";

export type SocialMetadataInput = {
  title: string;
  description: string;
  path: string;
  imagePath: string;
  imageAlt: string;
  type?: "website" | "article";
};

export function socialMetadata({
  title,
  description,
  path,
  imagePath,
  imageAlt,
  type = "website",
}: SocialMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const image = absoluteUrl(imagePath);

  return {
    metadataBase: new URL(siteUrl()),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: "Commit Story",
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, alt: imageAlt }],
    },
  };
}
