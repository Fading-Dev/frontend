import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-sunset text-white shadow-lg shadow-violet/20 hover:opacity-90',
  secondary: 'border border-border hover:bg-surface',
  danger: 'border border-red-900/50 text-red-300 hover:bg-red-950/30',
};

/** Size owns the radius too, so callers never need to override `rounded-*`. */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'rounded-md px-3 py-2 text-sm',
  md: 'rounded-md px-4 py-2',
  lg: 'rounded-xl px-4 py-3',
};

export function buttonClassName({
  variant = 'primary',
  size = 'md',
  className = '',
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return [
    'font-medium transition-opacity disabled:opacity-50',
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * The site's standard action button. `loading` disables the button and sets
 * `aria-busy` so assistive tech announces the in-flight state; callers keep
 * control of the label (e.g. "Saving…").
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName({ variant, size, className })}
      {...rest}
    >
      {children}
    </button>
  );
}
