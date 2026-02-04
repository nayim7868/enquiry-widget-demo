export default function HomePage() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold">Enquiry Widget Demo</h1>
      <p className="mt-2 text-gray-600">
        Demo pages showing one reusable widget in different contexts.
      </p>

      <ul className="mt-6 list-disc pl-6 space-y-2">
        <li><a className="underline" href="/contact">/contact</a></li>
        <li><a className="underline" href="/van-fleets">/van-fleets</a></li>
        <li><a className="underline" href="/part-exchange">/part-exchange</a></li>
      </ul>
    </main>
  );
}

