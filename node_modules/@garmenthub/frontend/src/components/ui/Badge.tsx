interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className = 'bg-gray-100 text-gray-800' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
