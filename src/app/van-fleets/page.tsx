import EnquiryWidget from "@/components/EnquiryWidget";

export default function FleetPage() {
  return (
    <main className="min-h-screen p-6">
      <EnquiryWidget
        title="Van fleets enquiry"
        defaultMode="FLEET"
        defaultType="FLEET_ENQUIRY"
        showChooser={false}
      />
      <p className="mt-4 text-sm text-gray-600">
        Not a fleet enquiry? Use the{" "}
        <a className="underline" href="/contact">
          Contact page
        </a>
        .
      </p>
    </main>
  );
}
