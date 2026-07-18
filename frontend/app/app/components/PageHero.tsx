import type { ReactNode } from 'react';

interface PageHeroProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
}

/**
 * Full-bleed, photo-backed header strip used at the top of Distributions, Claims,
 * and Faucet -- consistent with the Dashboard's own hero panel treatment, so the
 * "photo background behind page intros" pattern reads the same across every
 * dashboard sub-page rather than being one-off per page.
 */
export function PageHero({ title, subtitle, action }: PageHeroProps) {
  return (
    <div className="kaelis-page-hero">
      <div className="kaelis-page-hero__bg" />
      <div className="kaelis-page-hero__overlay" />
      <div className="kaelis-page-hero__content">
        <div>
          <h1 className="kaelis-page-hero__title">{title}</h1>
          <p className="kaelis-page-hero__subtitle">{subtitle}</p>
        </div>
        {action}
      </div>
    </div>
  );
}
