import { GoogleGenAI } from "@google/genai";
import { logger } from "./logger";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type ContentType = "tweet" | "reply" | "idea";

const NIGERIAN_VOICE_GUIDE = `Nigerian internet-native voice, based on these high-level traits:
- Sound like one specific person reacting in real time, not a brand or copywriter.
- Be blunt and opinionated. Start with the reaction or claim instead of warming up.
- Nigerian English should feel natural; use light Nigerian phrasing or Pidgin only when it fits (for example "na", "abeg", "sha", "oga", "wetin", "this country"). Do not force slang into every post.
- Let the rhythm breathe: mix short fragments with one longer run-on thought, and allow casual lowercase, loose punctuation, or a repeated word when it feels human.
- Concrete Nigerian politics, daily life, money stress, religion, internet culture, football, or work references are welcome when genuinely relevant to the topic.
- Dry humor, awkward honesty, dark humor, and an unfiltered personal aside can work better than a neat punchline.
- Abrupt pivots are allowed when they feel like a real timeline thought, but every post still needs one clear central feeling or point.
- Do not sound like polished "African Twitter" caricature, a motivational speaker, or a startup account.
- Do not copy any reference post, phrase, structure, or named example. Keep the attitude and rhythm original.
- Be sharp without using slurs, dehumanizing language, or harassment toward protected groups; criticize public actions, ideas, and institutions instead.`;

export async function generateContentWithGemini(
  type: ContentType,
  topic: string,
  clientName: string | null,
  clientNiche: string | null,
  clientTone: string | null,
  count: number = 3
): Promise<string[]> {
  const toneDesc = clientTone ?? "professional and engaging";
  const nicheDesc = clientNiche ?? "general";
  const nameDesc = clientName ?? "the client";

  let prompt = "";

  if (type === "tweet") {
     prompt = `You are a social media manager for ${nameDesc}, who operates in the ${nicheDesc} niche.
Generate ${count} original tweet(s) about "${topic}".
Voice guide: ${toneDesc}

${NIGERIAN_VOICE_GUIDE}

Write like one sharp, real person posting from their phone after actually thinking about the topic. The post can be messy in a believable way; it should not read like a finished ad.
Rules:
- Make a specific observation, opinion, tension, lesson, or question. Do not write generic advice.
- Prefer concrete details and natural Nigerian context when relevant instead of explaining the obvious.
- Use contractions and varied sentence lengths. A short sentence or natural fragment is fine.
- Do not force a tidy conclusion. A strong reaction, uncomfortable question, or unfinished thought can be the ending.
- Avoid excessive slang, fake typos, and random emojis; imperfect does not mean incoherent.
- Every tweet must earn attention with an idea, not with exaggerated hype.
- Each tweet must be under 280 characters.
- Use no more than 2 hashtags, and only when they genuinely help discovery.
- Use no emojis unless they are genuinely natural for that exact sentence.
- Never mention being an AI or describe the writing process.
- Never use: "in today's fast-paced world", "game-changer", "unlock", "leverage", "seamless", "revolutionize", "delve", "it's important to note", "here's the thing", "not just X but Y", or empty motivational language.
- Avoid corporate filler, perfect three-part lists, repetitive hooks, fake curiosity, and unnecessary em dashes.
- Return ONLY the tweet texts, one per line, with no numbering, labels, quotation marks, or explanation.`;
  } else if (type === "reply") {
     prompt = `You are a social media manager for ${nameDesc} in the ${nicheDesc} niche.
Draft ${count} engaging reply(ies) to conversations about "${topic}".
Voice guide: ${toneDesc}

${NIGERIAN_VOICE_GUIDE}

Write like a real person joining a conversation—not a brand account trying to sound friendly.
Rules:
- Respond to an actual idea about the topic with a useful angle, disagreement, example, or follow-up question.
- Do not begin every reply with "Great point", "Totally agree", or another stock phrase.
- Each reply must be under 280 characters.
- Use natural contractions, varied rhythm, and plain language.
- Be direct and human without sounding eager, salesy, or overly agreeable. A little dry humor or "you people..." energy is okay when it is not abusive.
- Nigerian context or phrasing should appear only when it adds meaning.
- No emojis unless genuinely natural; no hashtag spam.
- Never mention being an AI or describe the writing process.
- Avoid generic praise, corporate filler, fake enthusiasm, motivational clichés, and polished press-release language.
- Return ONLY the reply texts, one per line, with no numbering, labels, quotation marks, or explanation.`;
  } else {
     prompt = `You are a social media content strategist for ${nameDesc} in the ${nicheDesc} niche.
Generate ${count} content idea(s) for X (Twitter) based on the topic "${topic}".
Voice guide: ${toneDesc}

${NIGERIAN_VOICE_GUIDE}

Create ideas that a real person could turn into an interesting post today, with enough attitude that the eventual tweet will not sound like a content calendar.
Rules:
- Each idea must have a clear point of view, concrete angle, or lived observation—not a vague content prompt.
- Make the idea relevant to ${nicheDesc} and the topic.
- Under 280 characters each.
- Use natural, plain language and varied phrasing; Nigerian context is preferred when the topic supports it.
- Avoid generic self-improvement advice, corporate filler, trend-chasing language, and obvious AI phrasing.
- No emojis unless natural and no unnecessary hashtags.
- Return ONLY the idea texts, one per line, with no numbering, labels, quotation marks, or explanation.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192, temperature: 0.9 },
    });

    const text = response.text ?? "";
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .slice(0, count);

    return lines;
  } catch (err) {
    logger.error({ err }, "Gemini content generation failed");
    throw err;
  }
}

export async function generateTrendingTweets(
  clientName: string | null,
  clientNiche: string | null,
  clientTone: string | null,
  count: number = 3
): Promise<{ topic: string; content: string }[]> {
  const niche = clientNiche ?? "general business";
  const name = clientName ?? "the client";
  const tone = clientTone ?? "professional and engaging";

   const prompt = `You are a social media manager for ${name} in the ${niche} niche.
Search the web right now and find ${count} topics that are currently trending or generating high engagement on X/Twitter, specifically relevant to the ${niche} niche.
For each trending topic, generate ONE original tweet that authentically engages with that trend.

${NIGERIAN_VOICE_GUIDE}

Rules:
- Each tweet must be under 280 characters
- Sound like a Nigerian person reacting to the actual trend, not a generic account adding a brand comment
- Write like a real person with a point of view, not a content template
- Use specific details, natural contractions, varied rhythm, occasional short sentences, and light Nigerian phrasing where it fits
- Make the connection to the trend feel earned; do not force the trend into a generic brand message
- Max 2 hashtags per tweet
- Tone: ${tone}
- Never use generic AI/corporate phrases such as "game-changer", "unlock", "in today's fast-paced world", "leverage", or "here's the thing"
- Do not use fake curiosity, empty motivational language, repetitive hooks, or unnecessary emojis
- IMPORTANT: Return your response ONLY as lines in this exact format (nothing else):
TOPIC: [trending topic name] | TWEET: [tweet text]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        maxOutputTokens: 8192,
        temperature: 0.9,
      },
    });

    const text = response.text ?? "";
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.includes("TOPIC:") && l.includes("TWEET:"));

    return lines.slice(0, count).map((line) => {
      const topicMatch = line.match(/TOPIC:\s*(.+?)\s*\|/);
      const tweetMatch = line.match(/TWEET:\s*(.+)$/);
      return {
        topic: topicMatch?.[1]?.trim() ?? "Trending",
        content: tweetMatch?.[1]?.trim() ?? "",
      };
    }).filter((item) => item.content.length > 0);
  } catch (err) {
    logger.error({ err }, "Gemini trending generation failed");
    throw err;
  }
}
