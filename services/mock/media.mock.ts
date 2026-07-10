export interface AdminMediaItem {
  id: string;
  url: string;
  altText: string;
  ownerType: string;
  sizeKb: number;
  uploadedAt: string;
}

const SAMPLE_URLS = [
  "https://images.pexels.com/photos/34188582/pexels-photo-34188582.jpeg?w=300",
  "https://images.pexels.com/photos/18346535/pexels-photo-18346535.jpeg?w=300",
  "https://images.pexels.com/photos/17842832/pexels-photo-17842832.jpeg?w=300",
  "https://images.unsplash.com/photo-1531935015902-64b87c1f4da5?w=300",
  "https://images.unsplash.com/photo-1558788353-f76d92427f16?w=300",
  "https://images.unsplash.com/photo-1568571959361-3bffbad07499?w=300",
];

function generateMockMedia(count: number): AdminMediaItem[] {
  const owners = ["REQUEST", "CATEGORY", "HOMEPAGE_HERO", "USER_PROFILE", "ADMIN_UPLOAD"];
  return Array.from({ length: count }, (_, i) => ({
    id: `media-${i + 1}`,
    url: SAMPLE_URLS[i % SAMPLE_URLS.length]!,
    altText: `صورة ${i + 1}`,
    ownerType: owners[i % owners.length]!,
    sizeKb: 80 + (i % 10) * 34,
    uploadedAt: new Date(Date.now() - i * 3_600_000).toISOString(),
  }));
}

export const MOCK_MEDIA = generateMockMedia(24);

export async function listMediaMock(search?: string): Promise<AdminMediaItem[]> {
  if (!search) return MOCK_MEDIA;
  return MOCK_MEDIA.filter((m) => m.altText.includes(search));
}
