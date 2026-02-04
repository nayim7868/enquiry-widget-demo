import EnquiryWidget from "@/components/EnquiryWidget";

const PART_EX_INTENTS = [
  { label: "Part exchange", mode: "PART_EX" as const, type: "PART_EXCHANGE" as const },
  { label: "Quick question", mode: "GENERAL" as const, type: "QUICK_QUESTION" as const },
];

export default function PartExchangePage() {
  return (
    <main className="min-h-screen p-6">
      <EnquiryWidget
        title="Part exchange enquiry"
        defaultMode="PART_EX"
        defaultType="PART_EXCHANGE"
        showChooser={true}
        availableIntents={PART_EX_INTENTS}
      />
    </main>
  );
}
