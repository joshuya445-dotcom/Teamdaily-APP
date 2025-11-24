import { GoogleGenAI } from "@google/genai";
import { DailyReport } from "../types";

// Initialize Gemini Client
// Note: In a real environment, never expose API keys on the client side.
// This assumes process.env.API_KEY is available via a secure build process or proxy.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateTeamSummary = async (reports: DailyReport[]): Promise<string> => {
  if (reports.length === 0) return "No reports available to summarize.";

  const reportsText = reports.map(r => 
    `User: ${r.userName} (Group: ${r.groupName || 'General'}, Mood: ${r.mood || 'Neutral'})
     Task: ${r.workItems ? r.workItems.map(w => `${w.text} (${w.progress}%)`).join(', ') : r.todayWork}
     Issues: ${r.problems}
     Plan: ${r.tomorrowPlan}`
  ).join('\n---\n');

  const prompt = `
    You are an expert operations manager. Here are the daily reports from the team:
    
    ${reportsText}
    
    Please generate a structured daily summary in Markdown format (use Chinese for content). 
    Strictly follow this structure:
    
    ## 📊 团队日报总结 (Team Summary)
    [Brief summary of overall progress. Mention the general team morale/mood.]
    
    ## ⚠️ 风险与阻碍 (Key Risks)
    [List any blockers or delays mentioned. If none, say "None detected".]
    
    ## 💡 改进建议 (Recommendations)
    [Actionable advice based on the reports]
    
    ## 🏷️ 关键词云 (Keywords Cloud)
    [Comma separated list of 5-10 technical or project keywords]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "无法生成总结，请稍后再试。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 服务暂时不可用，请稍后再试。";
  }
};
