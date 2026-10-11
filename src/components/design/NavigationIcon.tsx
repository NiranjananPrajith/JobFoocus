import type { SVGProps } from 'react';

const shapes = {
  board: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16m6-16v16M6 8v4m6-4v7m6-7v3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  document: <><path d="M14 3H7a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V9z" /><path d="M14 3v6h6M8 13h8m-8 4h6" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="14" rx="3" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a21 21 0 0 0 18 0m-9 0v3" /></>,
  categories: <><path d="M20 13l-7 7a2 2 0 0 1-3 0l-7-7V4a1 1 0 0 1 1-1h9l7 7a2 2 0 0 1 0 3z" /><circle cx="8" cy="8" r="1" /></>,
  download: <><path d="M12 3v12m-4-4 4 4 4-4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></>,
  trash: <><path d="M3 6h18m-13 0V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M5 6l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M10 10v7m4-7v7" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h3" /></>,
  logout: <><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3m6-13 5 5-5 5m-5-5h10" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" /></>,
  moon: <path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4 2l-1.5 1v1M12 17h.01" /></>,
};
export type NavigationIconName = keyof typeof shapes;
export default function NavigationIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: NavigationIconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{shapes[name]}</svg>;
}
