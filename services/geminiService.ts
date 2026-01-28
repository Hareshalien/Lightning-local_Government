
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { Report, AnalysisResult, VerificationResult } from "../types";

// The system instruction requires using process.env.API_KEY.
// We ensure this is available in index.tsx via a shim for this environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeReports = async (reports: Report[]): Promise<AnalysisResult | null> => {
  const modelId = "gemini-3-flash-preview";
  
  if (reports.length === 0) {
    return null;
  }

  // Format reports for the prompt
  const reportSummaries = reports.map((r) => {
    return `ID: ${r.id}
    Location: ${r.address}
    Issue: ${r.description}
    Time: ${r.timestampString || r.dateTime}`;
  }).join("\n---\n");

  const prompt = `
    You are "Lightning AI", an intelligent consultant for local government.
    Analyze the following citizen reports and create a prioritized response plan.

    CRITICAL INSTRUCTIONS:
    1. JURISDICTION CHECK:
       Identify reports that are NOT under the jurisdiction of local government (e.g. "My TV is broken", "Neighbor's dog is barking inside their house", "Private driveway repair", "Personal disputes").
       Mark these as irrelevant (isRelevant: false). Valid government issues include roads, drainage, public safety, streetlights, waste, public trees, etc.

    2. PRIORITY CLASSIFICATION RULES:
       - **Critical**: You MUST classify as 'Critical' if the issue involves:
         a) **Life-threatening situations**.
         b) **Traffic jams, road obstructions, or hazards** (like deep potholes or fallen trees) that have a **high potential to cause accidents**.
       - **High**: Major disruptions or significant safety hazards that are not immediately life-threatening.
       - **Medium**: Functional issues or nuisances (e.g. clogged drains, garbage piles).
       - **Low**: Cosmetic or minor maintenance issues.
    
    Reports:
    ${reportSummaries}
  `;

  // Define the schema to force a user-friendly JSON structure
  const schema = {
    type: Type.OBJECT,
    properties: {
      strategicOverview: {
        type: Type.STRING,
        description: "A short, 2-sentence executive summary of the current situation for the mayor.",
      },
      prioritizedReports: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            reportId: { type: Type.STRING, description: "The exact ID of the report being referenced." },
            severity: { type: Type.STRING, enum: ["Critical", "High", "Medium", "Low"] },
            displayTitle: { type: Type.STRING, description: "A short 3-5 word title for the problem (e.g. 'Fallen Tree Blocking Road')" },
            actionPlan: { type: Type.STRING, description: "Specific instruction on what to do. If irrelevant, explain why." },
            recommendedResource: { type: Type.STRING, description: "The specific team to send (e.g. 'Fire Dept', 'TNB', 'Public Works'). If irrelevant, use 'None' or 'Private'." },
            justification: { type: Type.STRING, description: "Why this priority level was chosen." },
            isRelevant: { type: Type.BOOLEAN, description: "Set to FALSE if the issue is a private matter (e.g. broken TV, personal dispute) or outside government jurisdiction. Set to TRUE for public issues." },
          },
          required: ["reportId", "severity", "displayTitle", "actionPlan", "recommendedResource", "justification", "isRelevant"],
        },
      },
    },
    required: ["strategicOverview", "prioritizedReports"],
  };

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    return null;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const createAnalysisChat = (reports: Report[], analysis: AnalysisResult): Chat => {
  const reportSummaries = reports.map((r) => {
    const priority = analysis.prioritizedReports.find(p => p.reportId === r.id);
    return `[ID: ${r.id}] Loc: ${r.address} | Issue: ${r.description} | Severity: ${priority?.severity || 'N/A'} | Relevant: ${priority?.isRelevant}`;
  }).join("\n");

  const systemInstruction = `
    You are Lightning AI, a smart assistant for local government admins.
    You have just performed a strategic analysis of citizen reports.

    Current Situation Overview: "${analysis.strategicOverview}"

    Report Data:
    ${reportSummaries}

    The admin will ask questions about these reports.
    If a report was marked as irrelevant (isRelevant: false), explain that it falls outside municipal jurisdiction (e.g. private property, personal appliances).
    Otherwise, answer concisely about resources and action plans.
  `;

  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: systemInstruction,
    }
  });
};

export const sendChatMessage = async (chat: Chat, message: string): Promise<string> => {
  try {
    const result = await chat.sendMessage({ message });
    return result.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
};

export const verifyReportImage = async (report: Report): Promise<VerificationResult | null> => {
  // Using gemini-3-flash-preview which supports multimodal inputs (text + image)
  const modelId = "gemini-3-flash-preview";

  if (!report.imageBase64 || report.imageBase64.length < 50) {
    throw new Error("No valid image to verify");
  }

  // 1. Detect MIME Type and extract Base64 data
  // Defaults to image/jpeg if not specified
  let mimeType = "image/jpeg";
  let cleanBase64 = report.imageBase64;

  if (report.imageBase64.includes('data:') && report.imageBase64.includes('base64,')) {
    const matches = report.imageBase64.match(/data:(.*?);base64,(.*)/);
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      cleanBase64 = matches[2];
    }
  } else if (report.imageBase64.includes('base64,')) {
    // Fallback if it's just a raw string with prefix but no mime
    cleanBase64 = report.imageBase64.split('base64,')[1];
  }

  const prompt = `
    You are an expert Local Government Consultant and AI Auditor.
    
    Task:
    1. Analyze the image and compare it to the description: "${report.description}".
    2. Determine if the reported issue is visually confirmed by the image.
    3. Determine if this falls under **Local Government Jurisdiction** (e.g. Public Roads, Drains, Streetlights, Public Trees, Waste) or is a **Private/Civil matter** (e.g. Private house interior, personal appliance, neighbor argument, private condo facility).
    
    Output Requirements:
    - findings: A list of 3 extremely concise bullet points (max 10 words each). Simple English. State clearly what is seen.

    Return valid JSON.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      matchesDescription: { type: Type.BOOLEAN },
      isRelevant: { type: Type.BOOLEAN, description: "True for Public/Gov issues, False for Private/Civil issues." },
      findings: { 
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of 3 concise observations (max 10 words each)."
      }
    },
    required: ["matchesDescription", "isRelevant", "findings"]
  };

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: cleanBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as VerificationResult;
    }
    return null;

  } catch (error) {
    console.error("Image Verification Error:", error);
    throw error;
  }
};
