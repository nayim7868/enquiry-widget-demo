import EnquiryWidget from "@/components/EnquiryWidget";

export default function ContactPage() {
  return (
    <main className="min-h-screen p-6">
      <EnquiryWidget
        title="Contact us"
        defaultMode="GENERAL"
        defaultType="QUICK_QUESTION"
        showChooser
      />
    </main>
  );
}
