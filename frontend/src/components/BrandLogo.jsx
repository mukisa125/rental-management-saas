import { Home, Link2 } from 'lucide-react';
import { PLATFORM_NAME } from '../constants/brand';

const sizeClasses = {
  sm: {
    mark: 'h-9 w-9 rounded-lg',
    home: 'h-5 w-5',
    badge: 'h-5 w-5 -bottom-1 -right-1 rounded-md',
    link: 'h-3 w-3',
    text: 'text-xl'
  },
  md: {
    mark: 'h-10 w-10 rounded-xl',
    home: 'h-5 w-5',
    badge: 'h-5 w-5 -bottom-1 -right-1 rounded-md',
    link: 'h-3 w-3',
    text: 'text-xl'
  },
  lg: {
    mark: 'h-11 w-11 rounded-xl',
    home: 'h-6 w-6',
    badge: 'h-6 w-6 -bottom-1.5 -right-1.5 rounded-lg',
    link: 'h-3.5 w-3.5',
    text: 'text-2xl'
  }
};

const toneClasses = {
  light: {
    mark: 'border-blue-100 bg-blue-50 text-blue-700',
    badge: 'bg-emerald-500 text-white ring-white'
  },
  solid: {
    mark: 'border-transparent bg-blue-600 text-white shadow-lg shadow-blue-200',
    badge: 'bg-emerald-400 text-white ring-white'
  },
  onDark: {
    mark: 'border-white/20 bg-white/15 text-white backdrop-blur-sm',
    badge: 'bg-white text-blue-700 ring-blue-700/20'
  }
};

export default function BrandLogo({
  showText = false,
  label = PLATFORM_NAME,
  size = 'md',
  tone = 'light',
  className = '',
  textClassName = ''
}) {
  const dimensions = sizeClasses[size] || sizeClasses.md;
  const colors = toneClasses[tone] || toneClasses.light;

  return (
    <span
      className={`inline-flex min-w-0 items-center gap-2.5 ${className}`}
      aria-label={showText ? undefined : label}
      role={showText ? undefined : 'img'}
    >
      <span className={`relative grid shrink-0 place-items-center border ${dimensions.mark} ${colors.mark}`}>
        <Home className={dimensions.home} />
        <span className={`absolute grid place-items-center ring-2 ${dimensions.badge} ${colors.badge}`}>
          <Link2 className={dimensions.link} />
        </span>
      </span>
      {showText ? (
        <span className={`truncate font-black leading-tight tracking-normal ${dimensions.text} ${textClassName}`}>
          {label}
        </span>
      ) : null}
    </span>
  );
}
