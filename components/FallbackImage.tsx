'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useState } from 'react';

type FallbackImageProps = Omit<ImageProps, 'src'> & {
  src: string;
  fallbackSrc?: string;
};

const DEFAULT_FALLBACK_SRC = '/placeholders/media-placeholder.svg';

export default function FallbackImage({
  src,
  fallbackSrc = DEFAULT_FALLBACK_SRC,
  onError,
  ...props
}: FallbackImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  return (
    <Image
      {...props}
      key={currentSrc}
      src={currentSrc}
      unoptimized
      onError={(event) => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
        onError?.(event);
      }}
    />
  );
}
