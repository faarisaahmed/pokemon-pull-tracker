import { NavLink } from "react-router";

const ITEMS: { to: string; label: string; end?: boolean; icon: React.ReactNode }[] = [
  {
    to: "/",
    label: "Sets",
    end: true,
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  {
    to: "/cards",
    label: "Cards",
    icon: (
      <>
        <rect x="4" y="3" width="11" height="15" rx="1.5" />
        <path d="M18 6.5 20 7v13.5a1 1 0 0 1-1.2 1L8 19.5" />
      </>
    ),
  },
  {
    to: "/chase",
    label: "What to open",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
  },
  {
    to: "/master",
    label: "Master sets",
    icon: <path d="M12 3.5 14.6 9l6 .6-4.5 4 1.3 5.9L12 16.5l-5.4 3 1.3-5.9-4.5-4 6-.6z" />,
  },
  {
    to: "/about",
    label: "Sources",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 11v5.5M12 7.5v.5" />
      </>
    ),
  },
];

/** Phones get a thumb-reachable tab bar in place of the top links. */
export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ink-800 bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {ITEMS.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          end={i.end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10px] font-medium ${isActive ? "text-accent" : "text-ink-400"}`
          }
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {i.icon}
          </svg>
          {i.label}
        </NavLink>
      ))}
    </nav>
  );
}
