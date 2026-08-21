import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div id="maincontent" className="relative z-0 flex-1">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
