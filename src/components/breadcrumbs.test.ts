import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Breadcrumbs, type Crumb } from './breadcrumbs';

function render(items: Crumb[]): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(createElement(Breadcrumbs, { items }));
  return host.querySelector('nav')!;
}

describe('Breadcrumbs', () => {
  const trail: Crumb[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Acme Live', href: '/dashboard/organizations/org-1' },
    { label: 'Summer Fest' },
  ];

  it('renders a labelled breadcrumb nav with one item per crumb', () => {
    const nav = render(trail);
    expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
    expect(nav.querySelectorAll('li')).toHaveLength(3);
  });

  it('links every ancestor crumb to its page', () => {
    const links = [...render(trail).querySelectorAll('a')];
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Dashboard', '/dashboard'],
      ['Acme Live', '/dashboard/organizations/org-1'],
    ]);
  });

  it('marks the last crumb as the current page and does not link it', () => {
    const nav = render([...trail.slice(0, 2), { label: 'Summer Fest', href: '/x' }]);
    const current = nav.querySelector('[aria-current="page"]');
    expect(current?.textContent).toBe('Summer Fest');
    expect(nav.querySelectorAll('a')).toHaveLength(2);
  });

  it('hides the separators from assistive tech', () => {
    const svgs = render(trail).querySelectorAll('svg');
    expect(svgs).toHaveLength(2);
    svgs.forEach((svg) => expect(svg.getAttribute('aria-hidden')).toBe('true'));
  });
});
