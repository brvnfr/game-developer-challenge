import type { ReactNode } from 'react';

interface MenuLayoutProps {
  /** Id of the heading that names the main panel. */
  readonly labelledBy: string;
  readonly children: ReactNode;
  /** Optional side content (e.g. control instructions), placed next to the panel on wide screens. */
  readonly aside?: ReactNode;
  readonly className?: string;
}

/** Shared frame of the menu screens: the island background and the wooden panel. */
export function MenuLayout({ labelledBy, children, aside, className }: MenuLayoutProps) {
  return (
    <main className={aside ? 'menu-screen menu-screen--with-aside' : 'menu-screen'}>
      <section
        className={className ? `panel menu-panel ${className}` : 'panel menu-panel'}
        aria-labelledby={labelledBy}
      >
        {children}
      </section>
      {aside}
    </main>
  );
}
