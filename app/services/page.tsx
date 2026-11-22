import type { Metadata } from "next";
import ServicesClient from "@/app/components/services/ServicesClient";
import PageHeader from "@/app/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Automotive Services — Progressive AutoHub",
  description:
    "Request car servicing, repairs, detailing, tyres, battery, AC and roadside help from providers listed on Progressive AutoHub, and track your booking.",
};

export default function ServicesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--color-bg))] font-sans text-[hsl(var(--color-content))]">
      <PageHeader
        eyebrow="Car care"
        title="Automotive Services"
        description="Request a service from the workshops and service centres on our platform. We list a service only where a provider actually offers it, and you can follow your request from first contact to completion."
      />
      <div className="page-container flex-1 py-10">
        <ServicesClient />
      </div>
    </div>
  );
}
