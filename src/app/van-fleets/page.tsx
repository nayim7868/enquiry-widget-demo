import EnquiryWidget from "@/components/EnquiryWidget";

const FLEET_INTENTS = [
  { label: "Fleet enquiry", mode: "FLEET" as const, type: "FLEET_ENQUIRY" as const },
  { label: "Quick question", mode: "GENERAL" as const, type: "QUICK_QUESTION" as const },
];

export default function FleetPage() {
  return (
    <main className="min-h-screen p-6">
      <EnquiryWidget
        title="Van fleets enquiry"
        defaultMode="FLEET"
        defaultType="FLEET_ENQUIRY"
        showChooser={true}
        availableIntents={FLEET_INTENTS}
      />
    </main>
  );
}
