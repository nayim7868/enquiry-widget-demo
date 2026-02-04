import EnquiryWidget from "@/components/EnquiryWidget";

export default function PartExchangePage() {
  return (
    <main className="min-h-screen p-6">
      <EnquiryWidget
        title="Part exchange enquiry"
        defaultMode="PART_EX"
        defaultType="PART_EXCHANGE"
        showChooser={false}
      />
      <p className="mt-4 text-sm text-gray-600">
        Just a quick question? Use the{" "}
        <a className="underline" href="/contact">
          Contact page
        </a>
        .
      </p>
    </main>
  );
}
