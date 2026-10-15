import type { ReactNode } from 'react';
import { SeaBackdrop } from '@/ui/backdrop/SeaBackdrop';
import { BrandMark } from './BrandMark';
import { classNames } from '@/ui/classNames';

interface MenuLayoutProps {
  /** Id of the heading that names the main panel. */
  readonly labelledBy: string;
  readonly children: ReactNode;
  /** Optional side content (e.g. control instructions), placed next to the panel on wide screens. */
  readonly aside?: ReactNode;
  readonly className?: string;
}

/** Shared frame of the menu screens: the animated sea backdrop, the wooden panel and the Jungle Gaming mark. */
export function MenuLayout({ labelledBy, children, aside, className }: MenuLayoutProps) {
  return (
    <main className={classNames('menu-screen', aside !== undefined && 'menu-screen--with-aside')}>
      <SeaBackdrop />
      <section className={classNames('panel menu-panel', className)} aria-labelledby={labelledBy}>
        {children}
      </section>
      {aside}
      <BrandMark />
    </main>
  );
}
