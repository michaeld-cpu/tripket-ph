import "./globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { ShippingLineProvider } from "@/components/ShippingLineContext";
import { ToastProvider } from "@/components/ToastContext";

export const metadata: Metadata = {
  title: "Tripket PH — Admin",
  description: "Operations dashboard for Tripket PH",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden bg-white text-gray-900">
        <ShippingLineProvider>
          <ToastProvider>
            <div className="flex h-screen">
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
              </div>
            </div>
          </ToastProvider>
        </ShippingLineProvider>
      </body>
    </html>
  );
}
