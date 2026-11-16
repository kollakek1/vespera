import type { Metadata } from "next";

import "./admin.css";

export const metadata: Metadata = {
  title: {
    default: "Консоль",
    template: "%s — VESPERA Console",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="admin-root bg-bg text-text">{children}</div>;
}
