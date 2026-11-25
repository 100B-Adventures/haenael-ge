"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { normalizeProfileImageUrl } from "@/lib/profile-image";

export function ProfileAvatar({
  name,
  imageUrl,
  className,
  sizes,
  testId,
}: {
  name: string;
  imageUrl?: string | null;
  className: string;
  sizes: string;
  testId?: string;
}) {
  const normalizedUrl = normalizeProfileImageUrl(imageUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [normalizedUrl]);

  return (
    <span className={className} data-testid={testId}>
      {normalizedUrl && !failed ? (
        <Image
          src={normalizedUrl}
          alt={`${name} 프로필`}
          fill
          sizes={sizes}
          unoptimized
          onError={() => setFailed(true)}
          data-testid={testId ? `${testId}-image` : undefined}
        />
      ) : (
        <span aria-hidden="true" data-testid={testId ? `${testId}-fallback` : undefined}>
          {Array.from(name)[0]}
        </span>
      )}
    </span>
  );
}
