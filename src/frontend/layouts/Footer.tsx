export function Footer() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm font-bold text-plum/60 dark:text-cream/60 sm:flex-row sm:items-center sm:justify-between">
      <span>© {new Date().getFullYear()} Fitness Tracker</span>
      <span>Made with love in Canada 🇨🇦</span>
    </footer>
  );
}
