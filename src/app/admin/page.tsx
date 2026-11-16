import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminBootScreen } from "@/components/admin/admin-boot-screen";
import { AdminConsole } from "@/components/admin/admin-console";

export const metadata: Metadata = {
  title: "Консоль",
  description: "Рабочая консоль студии VESPERA: календарь, брони, ручная запись.",
};

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminBootScreen />}>
      <AdminConsole />
    </Suspense>
  );
}
