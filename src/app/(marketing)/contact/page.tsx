import type { Metadata } from "next";
import ContactClient from "./contact-client";

export const metadata: Metadata = {
  title: "Contact | ReconPro",
  description:
    "Contact ReconPro — questions, enterprise inquiries, or security vulnerability reports. We respond within 24 hours.",
};

export default function ContactPage() {
  return <ContactClient />;
}
