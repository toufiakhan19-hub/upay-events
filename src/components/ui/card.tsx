type CardProps = {
  children: React.ReactNode;
  className?: string;
  as?: "article" | "section" | "div" | "li";
};

export function Card({ children, className = "", as: Tag = "div" }: CardProps) {
  return <Tag className={`rounded-card bg-white shadow-card ${className}`}>{children}</Tag>;
}
