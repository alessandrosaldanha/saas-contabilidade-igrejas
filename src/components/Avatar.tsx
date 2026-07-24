const PALETTE = ["#0057ff", "#ff5e40", "#198f51", "#de7d02", "#7c3aed", "#0ea5e9"];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZE_MAP = { xs: "w-6 h-6 text-[10px]", sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" };

interface AvatarProps {
  name: string;
  size?: keyof typeof SIZE_MAP;
}

export default function Avatar({ name, size = "md" }: AvatarProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0 ${SIZE_MAP[size]}`}
      style={{ backgroundColor: colorForName(name) }}
    >
      {initials(name)}
    </span>
  );
}
