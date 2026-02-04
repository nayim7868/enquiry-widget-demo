"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  CreateEnquirySchema,
  type CreateEnquiryInput,
} from "@/lib/validation";

type EnquiryMode = CreateEnquiryInput["mode"];
type EnquiryType = CreateEnquiryInput["type"];

type Props = {
  title: string;
  defaultMode: EnquiryMode;
  defaultType: EnquiryType;
  showChooser?: boolean; // true on Contact page
};

const INTENTS: Array<{
  label: string;
  mode: EnquiryMode;
  type: EnquiryType;
}> = [
  { label: "Quick question", mode: "GENERAL", type: "QUICK_QUESTION" },
  { label: "Get a quote", mode: "GENERAL", type: "QUOTE" },
  { label: "Fleet enquiry", mode: "FLEET", type: "FLEET_ENQUIRY" },
  { label: "Part exchange", mode: "PART_EX", type: "PART_EXCHANGE" },
];

export default function EnquiryWidget({
  title,
  defaultMode,
  defaultType,
  showChooser = false,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const defaultValues = useMemo<CreateEnquiryInput>(
    () => ({
      mode: defaultMode,
      type: defaultType,
      name: "",
      email: "",
      phone: "",
      message: "",
      pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
      device:
        typeof window !== "undefined"
          ? window.innerWidth < 768
            ? "mobile"
            : "desktop"
          : undefined,
      reg: "",
      mileage: undefined,
      companyName: "",
      fleetSizeBand: "",
      timeframe: "",

    }),
    [defaultMode, defaultType]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateEnquiryInput>({
    resolver: zodResolver(CreateEnquirySchema) as any,
    defaultValues,
  });

  const mode = watch("mode");
  const type = watch("type");
  const needsPartEx = mode === "PART_EX" || type === "PART_EXCHANGE";
  const isFleet = mode === "FLEET" || type === "FLEET_ENQUIRY";


  const onSubmit = async (data: CreateEnquiryInput) => {
    setSubmitting(true);
    setServerMsg(null);

    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json?.error ?? "Request failed");
      }

      setIsSuccess(true);
      setServerMsg("Thanks! Your enquiry has been submitted.");
      reset({ ...defaultValues, mode: data.mode, type: data.type });
      
      // Reset success state after 5 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 5000);
    } catch (e: unknown) {
      setIsSuccess(false);
      setServerMsg(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const chooseIntent = (m: EnquiryMode, t: EnquiryType) => {
    setValue("mode", m);
    setValue("type", t);

    // Clear part-ex fields if switching away
    if (!(m === "PART_EX" || t === "PART_EXCHANGE")) {
      setValue("reg", "");
      setValue("mileage", undefined);
    }
  };

  return (
    <section className="max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-600">
          Fill this out and we'll get back to you.
        </p>
      </div>

      {showChooser && (
        <div className="mb-6">
          <p className="mb-3 text-sm font-medium text-gray-700">What can we help you with?</p>
          <div className="flex flex-wrap gap-2">
            {INTENTS.map((i) => {
              const selected = i.mode === mode && i.type === type;
              return (
                <button
                  key={i.label}
                  type="button"
                  onClick={() => chooseIntent(i.mode, i.type)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                    selected
                      ? "border-black bg-black text-white shadow-sm"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  {i.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Hidden fields for mode/type */}
        <input type="hidden" {...register("mode")} />
        <input type="hidden" {...register("type")} />

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.name
                ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:border-black focus:ring-gray-200"
            }`}
            {...register("name")}
            placeholder="Your name"
          />
          {errors.name && (
            <div className="mt-1.5 flex items-start gap-1.5">
              <svg className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-600 font-medium">{errors.name.message}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Email
          </label>
          <input
            type="email"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.email
                ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:border-black focus:ring-gray-200"
            }`}
            {...register("email")}
            placeholder="you@email.com"
          />
          {errors.email && (
            <div className="mt-1.5 flex items-start gap-1.5">
              <svg className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-600 font-medium">{errors.email.message}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Phone
          </label>
          <input
            type="tel"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.phone
                ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:border-black focus:ring-gray-200"
            }`}
            {...register("phone")}
            placeholder="07..."
          />
          {errors.phone && (
            <div className="mt-1.5 flex items-start gap-1.5">
              <svg className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-600 font-medium">{errors.phone.message}</p>
            </div>
          )}
          <p className="mt-1.5 text-xs text-gray-500">
            Provide at least an email or a phone number.
          </p>
        </div>

        {needsPartEx && (
          <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-bold text-gray-900 mb-4">Part exchange details</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Vehicle registration <span className="text-red-500">*</span>
                </label>
                <input
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
                    errors.reg
                      ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-black focus:ring-gray-200"
                  }`}
                  {...register("reg")}
                  placeholder="e.g. AB12 CDE"
                />
                {errors.reg && (
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <svg className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-600 font-medium">{errors.reg.message}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Mileage <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
                    errors.mileage
                      ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-black focus:ring-gray-200"
                  }`}
                  {...register("mileage", { valueAsNumber: true })}
                  placeholder="e.g. 65000"
                />
                {errors.mileage && (
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <svg className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-600 font-medium">
                      {errors.mileage.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 resize-none ${
              errors.message
                ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:border-black focus:ring-gray-200"
            }`}
            rows={5}
            {...register("message")}
            placeholder="How can we help?"
          />
          {errors.message && (
            <div className="mt-1.5 flex items-start gap-1.5">
              <svg className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-600 font-medium">
                {errors.message.message}
              </p>
            </div>
          )}
        </div>

        {isFleet && (
          <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-bold text-gray-900 mb-4">Fleet details (optional)</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Company name
                </label>
                <input
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
                    errors.companyName
                      ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-black focus:ring-gray-200"
                  }`}
                  {...register("companyName")}
                  placeholder="Your company"
                />
                {errors.companyName && (
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <svg className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-600 font-medium">{errors.companyName.message}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Fleet size
                </label>
                <select
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
                    errors.fleetSizeBand
                      ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-black focus:ring-gray-200"
                  }`}
                  {...register("fleetSizeBand")}
                >
                  <option value="">Select (optional)</option>
                  <option value="1-2">1–2</option>
                  <option value="3-10">3–10</option>
                  <option value="11-50">11–50</option>
                  <option value="50+">50+</option>
                </select>
                {errors.fleetSizeBand && (
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <svg className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-600 font-medium">{errors.fleetSizeBand.message}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Timeframe
                </label>
                <select
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
                    errors.timeframe
                      ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-black focus:ring-gray-200"
                  }`}
                  {...register("timeframe")}
                >
                  <option value="">Select (optional)</option>
                  <option value="ASAP">ASAP</option>
                  <option value="1-4 weeks">1–4 weeks</option>
                  <option value="1-3 months">1–3 months</option>
                  <option value="Browsing">Just browsing</option>
                </select>
                {errors.timeframe && (
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <svg className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-600 font-medium">{errors.timeframe.message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {serverMsg && (
          <div
            className={`rounded-lg border-2 p-4 ${
              isSuccess
                ? "border-green-500 bg-green-50"
                : "border-red-500 bg-red-50"
            }`}
          >
            <div className="flex items-start gap-3">
              {isSuccess ? (
                <svg className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <div className="flex-1">
                <p
                  className={`text-sm font-semibold ${
                    isSuccess ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {isSuccess ? "Success!" : "Error"}
                </p>
                <p
                  className={`mt-1 text-sm ${
                    isSuccess ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {serverMsg}
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || isSuccess}
          className="w-full rounded-lg bg-black px-4 py-3 text-white font-semibold transition-all hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </span>
          ) : (
            "Submit enquiry"
          )}
        </button>
      </form>
    </section>
  );
}
