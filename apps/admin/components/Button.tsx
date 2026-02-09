import Link from "next/link";

const base =
  "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50";

const variants = {
  primary:
    "bg-huntly-forest text-white hover:bg-huntly-leaf focus:ring-huntly-sage",
  secondary:
    "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 focus:ring-stone-400",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  ghost:
    "text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus:ring-stone-400",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

type ButtonProps = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
  children: React.ReactNode;
} & (
  | (React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: never })
  | (React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      href: string;
      type?: never;
    })
);

function isLinkProps(
  props: Omit<ButtonProps, "variant" | "size" | "className" | "children">
): props is Omit<ButtonProps, "variant" | "size" | "className" | "children"> & { href: string } {
  return "href" in props && typeof props.href === "string";
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (isLinkProps(props)) {
    const { href, ...rest } = props;
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...rest } = props as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
