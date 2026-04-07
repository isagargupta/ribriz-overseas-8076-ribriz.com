"use client";

import { useState, useRef } from "react";

const PRESET_AVATARS = [
  { id: "gradient-purple", bg: "from-[#6366f1] to-[#4f46e5]", emoji: "" },
  { id: "gradient-blue", bg: "from-[#3b82f6] to-[#2563eb]", emoji: "" },
  { id: "gradient-cyan", bg: "from-[#06b6d4] to-[#0891b2]", emoji: "" },
  { id: "gradient-green", bg: "from-[#10b981] to-[#059669]", emoji: "" },
  { id: "gradient-amber", bg: "from-[#f59e0b] to-[#d97706]", emoji: "" },
  { id: "gradient-rose", bg: "from-[#f43f5e] to-[#e11d48]", emoji: "" },
  { id: "gradient-pink", bg: "from-[#ec4899] to-[#db2777]", emoji: "" },
  { id: "gradient-slate", bg: "from-[#64748b] to-[#475569]", emoji: "" },
];

const FUN_AVATARS = [
  { id: "av-rocket", emoji: "🚀" },
  { id: "av-star", emoji: "⭐" },
  { id: "av-fire", emoji: "🔥" },
  { id: "av-gem", emoji: "💎" },
  { id: "av-lightning", emoji: "⚡" },
  { id: "av-crown", emoji: "👑" },
  { id: "av-alien", emoji: "👽" },
  { id: "av-ghost", emoji: "👻" },
  { id: "av-unicorn", emoji: "🦄" },
  { id: "av-panda", emoji: "🐼" },
  { id: "av-fox", emoji: "🦊" },
  { id: "av-owl", emoji: "🦉" },
];

export type AvatarData = {
  type: "initials" | "upload" | "preset" | "emoji";
  value: string; // base64 url, gradient id, or emoji id
};

export function getStoredAvatar(): AvatarData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("ribriz-avatar");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeAvatar(data: AvatarData) {
  localStorage.setItem("ribriz-avatar", JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("avatar-change", { detail: data }));
}

export function AvatarDisplay({
  avatar,
  initials,
  size = 38,
  className = "",
}: {
  avatar: AvatarData | null;
  initials: string;
  size?: number;
  className?: string;
}) {
  const sizeClass = `w-[${size}px] h-[${size}px]`;

  if (avatar?.type === "upload" && avatar.value) {
    return (
      <img
        src={avatar.value}
        alt="Profile"
        className={`${className} rounded-full object-cover`}
        style={{ width: size, height: size }}
      />
    );
  }

  if (avatar?.type === "emoji") {
    const fun = FUN_AVATARS.find((a) => a.id === avatar.value);
    return (
      <div
        className={`${className} ${sizeClass} rounded-full bg-gradient-to-br from-[#6366f1] to-[#4f46e5] flex items-center justify-center`}
        style={{ width: size, height: size }}
      >
        <span style={{ fontSize: size * 0.5 }}>{fun?.emoji || "⭐"}</span>
      </div>
    );
  }

  if (avatar?.type === "preset") {
    const preset = PRESET_AVATARS.find((a) => a.id === avatar.value);
    const bg = preset?.bg || "from-[#6366f1] to-[#4f46e5]";
    return (
      <div
        className={`${className} rounded-full bg-gradient-to-br ${bg} flex items-center justify-center text-white font-bold font-headline`}
        style={{ width: size, height: size, fontSize: size * 0.34 }}
      >
        {initials}
      </div>
    );
  }

  // Default: initials
  return (
    <div
      className={`${className} rounded-full bg-gradient-to-br from-[#6366f1] to-[#4f46e5] flex items-center justify-center text-white font-bold font-headline`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials}
    </div>
  );
}

export function AvatarPicker({
  initials,
  currentAvatar,
  onSelect,
  onClose,
}: {
  initials: string;
  currentAvatar: AvatarData | null;
  onSelect: (avatar: AvatarData) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"colors" | "avatars" | "upload">("colors");
  const [preview, setPreview] = useState<AvatarData | null>(currentAvatar);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview({ type: "upload", value: result });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (preview) {
      storeAvatar(preview);
      onSelect(preview);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[380px] max-h-[85vh] bg-[#1c2129] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-[15px] font-semibold text-white">
            Choose your avatar
          </h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Preview */}
        <div className="flex justify-center py-4">
          <div className="relative">
            <AvatarDisplay
              avatar={preview}
              initials={initials}
              size={72}
              className="ring-2 ring-white/15"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#6366f1] flex items-center justify-center
                text-white shadow-lg hover:bg-[#4f46e5] transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">
                photo_camera
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mx-5 mb-3 bg-white/[0.04] rounded-lg p-0.5">
          {(
            [
              { id: "colors", label: "Colors" },
              { id: "avatars", label: "Avatars" },
              { id: "upload", label: "Upload" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-[12px] font-medium rounded-md transition-all duration-150
                ${tab === t.id ? "bg-white/[0.1] text-white" : "text-white/40 hover:text-white/60"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-5 pb-4 min-h-[140px]">
          {tab === "colors" && (
            <div className="grid grid-cols-4 gap-2.5">
              {PRESET_AVATARS.map((preset) => {
                const selected =
                  preview?.type === "preset" && preview.value === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() =>
                      setPreview({ type: "preset", value: preset.id })
                    }
                    className={`relative flex items-center justify-center w-full aspect-square rounded-xl
                      bg-gradient-to-br ${preset.bg} text-white font-bold font-headline text-[15px]
                      transition-all duration-150 hover:scale-105
                      ${selected ? "ring-2 ring-white ring-offset-2 ring-offset-[#1c2129]" : "ring-1 ring-white/10"}`}
                  >
                    {initials}
                  </button>
                );
              })}
            </div>
          )}

          {tab === "avatars" && (
            <div className="grid grid-cols-4 gap-2.5">
              {FUN_AVATARS.map((av) => {
                const selected =
                  preview?.type === "emoji" && preview.value === av.id;
                return (
                  <button
                    key={av.id}
                    onClick={() =>
                      setPreview({ type: "emoji", value: av.id })
                    }
                    className={`flex items-center justify-center w-full aspect-square rounded-xl
                      bg-white/[0.04] text-[24px]
                      transition-all duration-150 hover:bg-white/[0.08] hover:scale-105
                      ${selected ? "ring-2 ring-white ring-offset-2 ring-offset-[#1c2129] bg-white/[0.08]" : ""}`}
                  >
                    {av.emoji}
                  </button>
                );
              })}
            </div>
          )}

          {tab === "upload" && (
            <div className="flex flex-col items-center gap-3 py-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center w-full py-6 rounded-xl border border-dashed border-white/15
                  hover:border-white/30 hover:bg-white/[0.02] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[28px] text-white/30 mb-2">
                  cloud_upload
                </span>
                <span className="text-[13px] text-white/50 font-medium">
                  Click to upload a photo
                </span>
                <span className="text-[11px] text-white/25 mt-1">
                  PNG, JPG or WebP — max 2MB
                </span>
              </button>
              {preview?.type === "upload" && (
                <button
                  onClick={() => setPreview(null)}
                  className="text-[12px] text-white/40 hover:text-white/70 transition-colors"
                >
                  Remove uploaded photo
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={() => {
              setPreview(null);
              storeAvatar({ type: "initials", value: "" });
              onSelect({ type: "initials", value: "" });
              onClose();
            }}
            className="px-3 py-2 rounded-lg text-[12px] font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all"
          >
            Reset to default
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[12px] font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-[#4f46e5] hover:bg-[#4338ca] transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
