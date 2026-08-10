import type { ReactNode } from 'react';
import { sounds } from '../sound';

interface FrameProps {
  title?: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}

/** Arwes-style panel with glowing corner brackets. */
export function Frame({ title, subtitle, className, children }: FrameProps) {
  return (
    <section
      className={className ? `frame ${className}` : 'frame'}
      onPointerEnter={() => sounds.hover()}
    >
      <span className="corner" aria-hidden="true" />
      {title && <h2 className="frame-title">{title}</h2>}
      {subtitle && <p className="frame-subtitle">{subtitle}</p>}
      {children}
    </section>
  );
}
