import "./globals.css";
import type { Metadata } from "next";
import AppChrome from "@/components/AppChrome";
import { ShippingLineProvider } from "@/components/ShippingLineContext";
import { ToastProvider } from "@/components/ToastContext";
import { UserProvider } from "@/components/UserContext";

export const metadata: Metadata = {
  title: {
    default: "Tripket PH",
    template: "%s · Tripket PH",
  },
  description: "Operations dashboard for Tripket PH — manage voyages, bookings, routes, and fleet across shipping lines.",
  applicationName: "Tripket PH",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden bg-white text-gray-900">
        <UserProvider>
          <ShippingLineProvider>
            <ToastProvider>
              <AppChrome>{children}</AppChrome>
            </ToastProvider>
          </ShippingLineProvider>
        </UserProvider>
      </body>
    </html>
  );
}
