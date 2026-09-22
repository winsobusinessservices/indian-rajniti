const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || "https://indianrajniti.in").replace(/\/$/, "");

export default function Footer() {
  return (
    <footer className="border-t border-outline-variant/20 bg-surface-container-lowest px-4 py-5 text-center text-xs text-on-surface-variant">
      Indian Rajneeti editorial panel · <a className="text-primary hover:underline" href={PUBLIC_SITE_URL}>Open public website</a>
    </footer>
  );
}
