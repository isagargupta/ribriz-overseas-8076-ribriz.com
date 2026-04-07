import { NextResponse } from "next/server";
import { anthropic, SOP_MODEL } from "@/lib/ai/claude";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

const EXTRACTION_PROMPTS: Record<string, string> = {
  transcript: `Extract all academic data from this document. Return ONLY valid JSON:
{
  "university_name": "",
  "degree": "",
  "field": "",
  "graduation_year": 0,
  "gpa": 0,
  "gpa_scale": "scale_10 or scale_4 or scale_100",
  "total_credits": 0,
  "subjects": [{"name": "", "grade": "", "credits": 0}],
  "backlogs": 0
}`,
  marksheet: `Extract academic data from this marksheet. Return ONLY valid JSON:
{
  "institution": "",
  "exam": "",
  "year": 0,
  "percentage": 0,
  "total_marks": 0,
  "max_marks": 0,
  "subjects": [{"name": "", "marks": 0, "max_marks": 0}]
}`,
  ielts_scorecard: `Extract IELTS scores. Return ONLY valid JSON:
{
  "overall": 0,
  "listening": 0,
  "reading": 0,
  "writing": 0,
  "speaking": 0,
  "test_date": "",
  "trf_number": ""
}`,
  toefl_scorecard: `Extract TOEFL scores. Return ONLY valid JSON:
{
  "total": 0,
  "reading": 0,
  "listening": 0,
  "speaking": 0,
  "writing": 0,
  "test_date": ""
}`,
  gre_scorecard: `Extract GRE scores. Return ONLY valid JSON:
{
  "total": 0,
  "verbal": 0,
  "quantitative": 0,
  "analytical_writing": 0,
  "test_date": ""
}`,
  gmat_scorecard: `Extract GMAT scores. Return ONLY valid JSON:
{
  "total": 0,
  "verbal": 0,
  "quantitative": 0,
  "integrated_reasoning": 0,
  "analytical_writing": 0,
  "test_date": ""
}`,
  degree_certificate: `Extract degree info. Return ONLY valid JSON:
{
  "university_name": "",
  "degree": "",
  "field": "",
  "graduation_year": 0,
  "honors": ""
}`,
  resume: `Extract key info from this resume. Return ONLY valid JSON:
{
  "name": "",
  "email": "",
  "phone": "",
  "education": [{"degree": "", "institution": "", "year": 0, "gpa": 0}],
  "work_experience": [{"company": "", "role": "", "duration_months": 0}],
  "skills": [],
  "total_work_months": 0
}`,
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string;
    const documentId = formData.get("documentId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!documentType) {
      return NextResponse.json({ error: "documentType is required" }, { status: 400 });
    }

    // Validate file type and size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 400 });
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, JPG, PNG, or WebP." },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const prompt = EXTRACTION_PROMPTS[documentType] || EXTRACTION_PROMPTS.resume;
    const isPdf = file.type === "application/pdf";

    // Build the content block with correct types for the Anthropic SDK
    const contentBlock = isPdf
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: base64,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
            data: base64,
          },
        };

    // Call Claude Vision API for extraction
    const response = await anthropic.messages.create({
      model: SOP_MODEL,
      max_tokens: 2000,
      system:
        "You are a document data extraction specialist. Extract structured data from the provided document and return ONLY valid JSON. No markdown, no explanations, no code blocks — just the JSON object.",
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            {
              type: "text" as const,
              text: prompt,
            },
          ],
        },
      ],
    });

    const extractedText =
      response.content[0].type === "text" ? response.content[0].text : "{}";

    // Parse the extracted JSON
    let extractedData;
    try {
      const jsonMatch =
        extractedText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, extractedText];
      extractedData = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      extractedData = { raw_text: extractedText, parse_error: true };
    }

    // Build profile update suggestion
    const profileUpdate = buildProfileUpdateSuggestion(documentType, extractedData);

    // If documentId provided, mark the document as processed
    if (documentId) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "uploaded", uploadedAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      documentType,
      extractedData,
      profileUpdateSuggestion: profileUpdate,
    });
  } catch (error) {
    console.error("Document extraction error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Document extraction failed",
      },
      { status: 500 }
    );
  }
}

function buildProfileUpdateSuggestion(
  documentType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || data.parse_error) return null;

  switch (documentType) {
    case "transcript":
    case "degree_certificate":
      return {
        ...(data.degree && { degreeName: data.degree }),
        ...(data.university_name && { collegeName: data.university_name }),
        ...((data.institution) && { collegeName: data.institution }),
        ...(data.gpa && { gpa: data.gpa }),
        ...(data.gpa_scale && { gpaScale: data.gpa_scale }),
        ...(data.graduation_year && { graduationYear: data.graduation_year }),
        ...(data.backlogs !== undefined && { backlogs: data.backlogs }),
      };
    case "marksheet":
      return {
        ...(data.institution && { collegeName: data.institution }),
        ...(data.percentage && { gpa: data.percentage, gpaScale: "scale_100" }),
      };
    case "ielts_scorecard":
      return data.overall ? { ieltsScore: data.overall } : null;
    case "toefl_scorecard":
      return data.total ? { toeflScore: data.total } : null;
    case "gre_scorecard":
      return data.total ? { greScore: data.total } : null;
    case "gmat_scorecard":
      return data.total ? { gmatScore: data.total } : null;
    case "resume":
      return {
        ...(data.name && { name: data.name }),
        ...(data.total_work_months && { workExperienceMonths: data.total_work_months }),
        ...(data.education?.[0]?.degree && { degreeName: data.education[0].degree }),
        ...(data.education?.[0]?.institution && { collegeName: data.education[0].institution }),
      };
    default:
      return null;
  }
}
