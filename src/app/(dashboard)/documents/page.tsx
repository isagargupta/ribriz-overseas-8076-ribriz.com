"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/components/ui/toast";

interface Doc {
  id: string;
  name: string;
  category: string;
  isRequired: boolean;
  status: string;
  fileUrl: string | null;
  uploadedAt: string | null;
  notes: string | null;
}

interface ExtractionResult {
  documentId: string;
  documentType: string;
  extractedData: Record<string, unknown>;
  profileUpdateSuggestion: Record<string, unknown> | null;
}

const docTypeMap: Record<string, string> = {
  "10th Marksheet": "marksheet",
  "12th Marksheet": "marksheet",
  "Degree Certificate": "degree_certificate",
  "Semester Transcripts": "transcript",
  "Backlog Certificate": "other",
  "IELTS Score Report": "ielts_scorecard",
  "GRE Score Report": "gre_scorecard",
  "Passport": "other",
  "Bank Statements (6 months)": "other",
  "CV / Resume": "resume",
};

const categoryLabels: Record<string, { label: string; icon: string }> = {
  academic: { label: "Academic Credentials", icon: "history_edu" },
  test_scores: { label: "Test Scores", icon: "quiz" },
  identity: { label: "Identification", icon: "badge" },
  financial: { label: "Financial Records", icon: "payments" },
  application: { label: "Application Materials", icon: "description" },
};

const statusStyles: Record<string, { label: string; color: string }> = {
  not_started: { label: "Not Started", color: "text-outline bg-surface-container-high" },
  in_progress: { label: "In Progress", color: "text-[#4f55f1] bg-[#4f55f1]/10" },
  uploaded: { label: "Uploaded", color: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
  verified: { label: "Verified", color: "text-green-600 dark:text-green-400 bg-green-500/10" },
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const quickUploadRef = useRef<HTMLInputElement>(null);
  const fileStoreRef = useRef<Map<string, File>>(new Map());
  const { toast } = useToast();

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocs(data.documents || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const updateStatus = async (docId: string, status: string) => {
    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, status }),
      });
      if (res.ok) {
        const { document } = await res.json();
        setDocs((prev) => prev.map((d) => (d.id === docId ? document : d)));
        toast("Document status updated", "success");
      }
    } catch {
      toast("Failed to update status", "error");
    }
  };

  const handleFileSelect = async (docId: string | null, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast("File too large. Maximum 10MB allowed.", "error");
      return;
    }
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      toast("Only PDF, JPG, and PNG files are allowed.", "error");
      return;
    }

    // For now, create a local object URL as placeholder
    // In production, you'd upload to Supabase Storage or S3
    const fileUrl = URL.createObjectURL(file);

    if (docId) {
      // Store the actual file for later extraction
      fileStoreRef.current.set(docId, file);

      // Update existing document
      try {
        const res = await fetch("/api/documents", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: docId, fileUrl, status: "uploaded" }),
        });
        if (res.ok) {
          const { document } = await res.json();
          setDocs((prev) => prev.map((d) => (d.id === docId ? document : d)));
          toast(`${file.name} uploaded successfully`, "success");
        }
      } catch {
        toast("Upload failed", "error");
      }
    } else {
      // Create new document
      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, fileUrl }),
        });
        if (res.ok) {
          const { document } = await res.json();
          setDocs((prev) => [...prev, document]);
          fileStoreRef.current.set(document.id, file);
          toast(`${file.name} added successfully`, "success");
        }
      } catch {
        toast("Upload failed", "error");
      }
    }
  };

  const handleExtractData = async (doc: Doc) => {
    const file = fileStoreRef.current.get(doc.id);
    if (!file) {
      toast("File not available for extraction. Re-upload the document.", "error");
      return;
    }

    const documentType = docTypeMap[doc.name] || "other";
    if (documentType === "other") {
      toast("AI extraction is not available for this document type.", "info");
      return;
    }

    setExtracting(doc.id);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);
      formData.append("documentId", doc.id);

      const res = await fetch("/api/ai/extract-document", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Extraction failed");
      }

      const data = await res.json();
      setExtractionResult({
        documentId: doc.id,
        documentType,
        extractedData: data.extractedData,
        profileUpdateSuggestion: data.profileUpdateSuggestion,
      });
      toast("Data extracted successfully!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Extraction failed", "error");
    } finally {
      setExtracting(null);
    }
  };

  const handleSaveToProfile = async () => {
    if (!extractionResult?.profileUpdateSuggestion) return;

    setSavingProfile(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Save extracted document data to my profile" }],
          confirmAction: {
            toolName: "update_profile",
            toolInput: extractionResult.profileUpdateSuggestion,
            toolUseId: `extract-${extractionResult.documentId}`,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast("Profile updated with extracted data!", "success");
        setExtractionResult(null);
      } else {
        throw new Error(data.error || "Failed to save");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save to profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  // Group docs by category
  const grouped = Object.entries(categoryLabels).map(([key, meta]) => ({
    key,
    ...meta,
    docs: docs.filter((d) => d.category === key),
  })).filter((g) => g.docs.length > 0);

  const totalDocs = docs.length;
  const completedDocs = docs.filter((d) => d.status === "uploaded" || d.status === "verified").length;
  const readiness = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;

  return (
    <div className="p-4 sm:p-8 pb-20 md:pb-8 transition-colors duration-300">
      {/* Header & Readiness Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 items-end">
        <div className="lg:col-span-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">
            Portfolio Management
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-on-surface mb-4">
            Document Curator
          </h1>
          <p className="text-on-surface-variant max-w-xl text-lg leading-relaxed">
            Centrally manage and verify your academic credentials. Your profile
            readiness directly impacts application speed.
          </p>
        </div>

        {/* Readiness Widget */}
        <div className="lg:col-span-5">
          <div className="bg-surface-container-high p-6 rounded-3xl relative overflow-hidden transition-colors">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">
                  Document Readiness
                </span>
                <span className="text-3xl font-black text-on-surface">{readiness}%</span>
              </div>
              <div className="h-16 w-16 relative">
                <svg className="h-full w-full" viewBox="0 0 36 36">
                  <path
                    className="fill-none stroke-surface-container-low"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    strokeWidth="3"
                  />
                  <path
                    className="fill-none stroke-[#4f55f1]"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    strokeDasharray={`${readiness}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-xl">verified</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-outline mt-3">{completedDocs} of {totalDocs} documents ready</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-[#4f55f1] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Groups */}
          <div className="lg:col-span-2 space-y-8">
            {grouped.map((group) => (
              <div key={group.key}>
                <div className="flex items-center justify-between px-2 mb-4">
                  <h3 className="font-semibold flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-primary">{group.icon}</span>
                    {group.label}
                  </h3>
                  <span className="text-xs text-on-surface-variant font-medium">
                    {group.docs.filter((d) => d.status === "uploaded" || d.status === "verified").length}/{group.docs.length} Complete
                  </span>
                </div>

                <div className="space-y-3">
                  {group.docs.map((doc) => {
                    const style = statusStyles[doc.status] || statusStyles.not_started;
                    return (
                      <div
                        key={doc.id}
                        className="group bg-surface-container-low p-5 rounded-xl border border-outline-variant/10 hover:bg-surface-container transition-all duration-300"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                              <span className="material-symbols-outlined text-lg">{group.icon}</span>
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-on-surface truncate">{doc.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${style.color}`}>
                                  {style.label}
                                </span>
                                {doc.uploadedAt && (
                                  <span className="text-[10px] text-outline">
                                    {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </span>
                                )}
                                {doc.isRequired && (
                                  <span className="text-[10px] text-primary font-bold">Required</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {doc.status === "not_started" || doc.status === "in_progress" ? (
                              <label className="px-3 py-1.5 text-xs font-bold bg-[#4f55f1] text-white rounded-lg cursor-pointer hover:brightness-110 transition-all">
                                Upload
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => handleFileSelect(doc.id, e.target.files)}
                                />
                              </label>
                            ) : (
                              <>
                                {/* AI Extract Button */}
                                {(doc.status === "uploaded" || doc.status === "verified") &&
                                  docTypeMap[doc.name] &&
                                  docTypeMap[doc.name] !== "other" && (
                                    <button
                                      onClick={() => handleExtractData(doc)}
                                      disabled={extracting === doc.id}
                                      className="px-3 py-1.5 text-xs font-bold text-[#4f55f1] bg-[#4f55f1]/10 rounded-lg hover:bg-[#4f55f1]/20 transition-all disabled:opacity-50 flex items-center gap-1"
                                    >
                                      <span className="material-symbols-outlined text-sm">
                                        {extracting === doc.id ? "sync" : "auto_awesome"}
                                      </span>
                                      {extracting === doc.id ? "Extracting..." : "AI Extract"}
                                    </button>
                                  )}
                                {doc.status === "uploaded" && (
                                  <button
                                    onClick={() => updateStatus(doc.id, "verified")}
                                    className="px-3 py-1.5 text-xs font-bold text-green-600 dark:text-green-400 bg-green-500/10 rounded-lg hover:bg-green-500/20 transition-all"
                                  >
                                    Verify
                                  </button>
                                )}
                                <label className="px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-high rounded-lg cursor-pointer hover:bg-surface-container-highest transition-all">
                                  Replace
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => handleFileSelect(doc.id, e.target.files)}
                                  />
                                </label>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {docs.length === 0 && !loading && (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-5xl text-outline mb-4">folder_open</span>
                <h3 className="text-lg font-bold text-on-surface mb-2">No Documents Yet</h3>
                <p className="text-sm text-outline">Upload your first document to get started.</p>
              </div>
            )}
          </div>

          {/* Side Column: Quick Upload */}
          <div className="space-y-6">
            <div
              className={`p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center group cursor-pointer transition-all ${
                dragOver
                  ? "border-[#4f55f1] bg-[#4f55f1]/5"
                  : "border-outline-variant/20 bg-surface-container-lowest hover:bg-surface-container-low"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFileSelect(null, e.dataTransfer.files);
              }}
              onClick={() => quickUploadRef.current?.click()}
            >
              <input
                ref={quickUploadRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileSelect(null, e.target.files)}
              />
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-3xl">add_circle</span>
              </div>
              <h4 className="font-bold text-on-surface">Quick Upload</h4>
              <p className="text-xs text-on-surface-variant mt-2 max-w-[180px]">
                Drag &amp; drop any document or click to browse
              </p>
              <div className="mt-4 flex gap-2">
                <span className="text-[10px] font-bold text-outline">PDF</span>
                <span className="text-[10px] font-bold text-outline">JPG</span>
                <span className="text-[10px] font-bold text-outline">PNG</span>
              </div>
            </div>

            {/* Tips Card */}
            <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10">
              <h3 className="text-xs font-bold text-outline uppercase tracking-widest mb-4">Tips</h3>
              <ul className="space-y-3 text-xs text-on-surface-variant">
                <li className="flex gap-2">
                  <span className="material-symbols-outlined text-sm text-primary shrink-0">lightbulb</span>
                  Upload scanned copies in PDF format for best quality.
                </li>
                <li className="flex gap-2">
                  <span className="material-symbols-outlined text-sm text-primary shrink-0">lightbulb</span>
                  Ensure documents are clear and legible before uploading.
                </li>
                <li className="flex gap-2">
                  <span className="material-symbols-outlined text-sm text-primary shrink-0">lightbulb</span>
                  Max file size: 10MB per document.
                </li>
                <li className="flex gap-2">
                  <span className="material-symbols-outlined text-sm text-[#4f55f1] shrink-0">auto_awesome</span>
                  Use AI Extract to auto-fill your profile from uploaded documents.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Extraction Results Modal */}
      {extractionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface-container-high rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-outline-variant/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4f55f1]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#4f55f1]">auto_awesome</span>
                </div>
                <div>
                  <h3 className="font-bold text-on-surface">Extracted Data</h3>
                  <p className="text-xs text-outline capitalize">
                    {extractionResult.documentType.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Extracted Fields */}
              <div className="space-y-2">
                {Object.entries(extractionResult.extractedData).map(([key, value]) => {
                  if (value === null || value === undefined) return null;
                  const displayValue =
                    typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
                  return (
                    <div
                      key={key}
                      className="flex items-start gap-3 py-2 px-3 rounded-lg bg-surface-container-low"
                    >
                      <span className="text-xs font-semibold text-outline min-w-[130px] capitalize">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-on-surface font-medium break-all">
                        {displayValue.length > 200 ? displayValue.slice(0, 200) + "..." : displayValue}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Profile Update Suggestion */}
              {extractionResult.profileUpdateSuggestion && (
                <div className="bg-[#4f55f1]/5 border border-[#4f55f1]/20 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-[#4f55f1] uppercase tracking-wider mb-3">
                    Save to Profile
                  </h4>
                  <div className="space-y-1.5 mb-4">
                    {Object.entries(extractionResult.profileUpdateSuggestion)
                      .filter(([, v]) => v != null)
                      .map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 text-xs">
                          <span className="material-symbols-outlined text-sm text-[#4f55f1]">
                            arrow_forward
                          </span>
                          <span className="text-outline capitalize min-w-[100px]">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <span className="text-on-surface font-medium">{String(value)}</span>
                        </div>
                      ))}
                  </div>
                  <button
                    onClick={handleSaveToProfile}
                    disabled={savingProfile}
                    className="w-full py-2.5 bg-[#4f55f1] text-white text-xs font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {savingProfile ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">save</span>
                        Save to My Profile
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-outline-variant/10 flex justify-end gap-3">
              <button
                onClick={() => setExtractionResult(null)}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface bg-surface-container rounded-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
