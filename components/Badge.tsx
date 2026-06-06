interface BadgeProps {
  label: string;
  className?: string;
}

export default function Badge({ label, className = "bg-gray-100 text-gray-700" }: BadgeProps) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
