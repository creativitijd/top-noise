import { facebookPublisher } from "@/lib/publishers/facebook";
import { instagramPublisher } from "@/lib/publishers/instagram";
import { linkedinPublisher } from "@/lib/publishers/linkedin";
import { wordpressPublisher } from "@/lib/publishers/wordpress";
import type { Publisher } from "@/lib/publishers/types";
import type { Platform } from "@/lib/platforms";

const publishers: Record<Platform, Publisher> = {
  linkedin: linkedinPublisher,
  facebook: facebookPublisher,
  instagram: instagramPublisher,
  wordpress: wordpressPublisher,
};

export function getPublisher(platform: Platform): Publisher {
  return publishers[platform];
}
