import Image from "next/image";

interface Props {
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

/**
 * Round avatar with a colored initials fallback.
 * Uses next/image when a remote URL is provided; otherwise renders a
 * deterministic colored circle with the first letter of the display name.
 */
export function Avatar({ url, name, size = 40, className = "" }: Props) {
  const initials = (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

  const colors = [
    "bg-emerald-600",
    "bg-sky-600",
    "bg-violet-600",
    "bg-amber-600",
    "bg-rose-600",
    "bg-indigo-600",
    "bg-teal-600",
  ];
  const seed = (name ?? "x").charCodeAt(0) % colors.length;

  const base = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-white dark:ring-zinc-900 ${className}`;

  if (url) {
    return (
      <span className={base} style={{ width: size, height: size }}>
        {/* unoptimized: avatars are tiny + sometimes external providers (gravatar, googleusercontent) */}
        <Image
          src={url}
          alt={name ?? "Avatar"}
          width={size}
          height={size}
          unoptimized
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`${base} ${colors[seed]} font-semibold text-white`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}
