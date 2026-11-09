type AvatarProps = {
  name: string;
  url?: string | null;
  // Tailwind size classes, e.g. "h-12 w-12 text-lg"
  className?: string;
};

/** Profile photo, or the first letter of the name when there is none. */
export function Avatar({ name, url, className = 'h-9 w-9 text-sm' }: AvatarProps) {
  if (url) {
    return (
      // Images are already resized to 512px on upload; a plain <img> avoids
      // configuring next/image for the Supabase host.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className={`${className} shrink-0 rounded-full bg-primary-soft object-cover`} loading="lazy" />
    );
  }

  return (
    <span
      aria-hidden
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-extrabold uppercase text-primary-deep`}
    >
      {name.trim().slice(0, 1) || '?'}
    </span>
  );
}
