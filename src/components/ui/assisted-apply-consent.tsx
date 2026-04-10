"use client";

interface AssistedApplyConsentProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function AssistedApplyConsent({ onAccept, onDecline }: AssistedApplyConsentProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161b22] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/20">
              <span className="material-symbols-outlined text-[20px] text-indigo-400">smart_toy</span>
            </div>
            <h2 className="text-[16px] font-bold text-white/90 font-headline">
              Before we start
            </h2>
          </div>
          <p className="text-[12px] text-white/40 mt-1 ml-12">
            Assisted Application by RIBRIZ
          </p>
        </div>

        {/* Points */}
        <div className="px-6 py-5 space-y-3.5">
          {[
            {
              icon: "language",
              text: "RIBRIZ will navigate to the university's website on your behalf",
              color: "text-indigo-400",
            },
            {
              icon: "edit",
              text: "We will fill form fields using your saved profile data",
              color: "text-indigo-400",
            },
            {
              icon: "block",
              text: "We will NEVER submit your application without your explicit approval",
              color: "text-emerald-400",
              bold: true,
            },
            {
              icon: "pause_circle",
              text: "We stop and ask you to handle: logins, CAPTCHAs, payments, and final submission",
              color: "text-emerald-400",
            },
            {
              icon: "history",
              text: "All actions are logged with timestamps for your records",
              color: "text-white/50",
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.05] shrink-0 mt-0.5">
                <span className={`material-symbols-outlined text-[14px] ${item.color}`}>
                  {item.icon}
                </span>
              </div>
              <p className={`text-[12.5px] ${item.bold ? "text-white/85 font-medium" : "text-white/60"} leading-relaxed`}>
                {item.text}
              </p>
            </div>
          ))}
        </div>

        {/* Legal text */}
        <div className="mx-6 mb-5 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <p className="text-[10.5px] text-white/35 leading-relaxed">
            RIBRIZ is not affiliated with or endorsed by any university unless explicitly stated.
            RIBRIZ does not represent universities and is not a licensed education agent.
            <strong className="text-white/45"> You are responsible for the accuracy of your submitted application.</strong>
            {" "}RIBRIZ acts as an assistant tool only.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-2.5">
          <button
            onClick={onAccept}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
              bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold
              transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            I understand — Start Assisted Application
          </button>
          <button
            onClick={onDecline}
            className="w-full py-2.5 rounded-xl text-white/40 hover:text-white/70
              text-[12px] transition-colors hover:bg-white/[0.04]"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
