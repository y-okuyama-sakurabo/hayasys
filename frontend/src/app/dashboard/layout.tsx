import LayoutSidebar from "@/components/LayoutSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutSidebar>{children}</LayoutSidebar>;
}
