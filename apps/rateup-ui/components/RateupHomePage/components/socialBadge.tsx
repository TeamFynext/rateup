interface SocialBadgeProps {
  src: string;
  label: string;
}

export function SocialBadge({ src, label }: SocialBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2.5  bg-shade-of-blue-14/20 rounded-full px-4 py-2">
      <img src={src} alt={label} className="w-6 h-6 shrink-0" />
      <span className="text-sm font-medium text-white">{label}</span>
    </div>
  );
}
