import { Request, Response } from "express";
import Thumbnail from "../models/Thumbnail.js";
import {
  GenerateContentConfig,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/genai";
import ai from "../configs/ai.js";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

// ------------------ STYLE CONFIG ------------------
const stylePrompts = {
  "Bold & Graphic":
    "eye-catching thumbnail, bold typography, vibrant colors, expressive facial reaction, dramatic lighting, high contrast",
  "Tech/Futuristic":
    "futuristic thumbnail, sleek modern design, glowing accents, cyber-tech aesthetic",
  Minimalist:
    "minimalist thumbnail, clean layout, simple shapes, negative space",
  Photorealistic:
    "photorealistic thumbnail, natural lighting, DSLR-style photography",
  Illustrated:
    "illustrated thumbnail, stylized characters, vibrant vector art",
};

const colorSchemeDescriptions = {
  vibrant: "vibrant, high saturation, bold contrast",
  sunset: "warm orange pink tones, cinematic glow",
  forest: "natural green earthy tones",
  neon: "neon blue pink cyberpunk glow",
  purple: "magenta violet tones",
  monochrome: "black and white contrast",
  ocean: "blue teal tones",
  pastel: "soft pastel colors",
};

// ------------------ MAIN CONTROLLER ------------------
export const generateThumbnail = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const {
      title,
      prompt: user_prompt,
      style,
      aspect_ratio,
      color_scheme,
      text_overlay,
    } = req.body;

    // ✅ VALIDATION
    if (!title || !style) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ CREATE DB ENTRY
    const thumbnail = await Thumbnail.create({
      userId,
      title,
      prompt_used: user_prompt,
      user_prompt,
      style,
      aspect_ratio,
      color_scheme,
      text_overlay,
      isGenerating: true,
    });

    // ------------------ AI CONFIG ------------------
    const model = "gemini-1.5-flash";

    const generationConfig: GenerateContentConfig = {
      maxOutputTokens: 8192,
      temperature: 1,
      topP: 0.95,
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: aspect_ratio || "16:9",
        imageSize: "1k",
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.OFF,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.OFF,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.OFF,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.OFF,
        },
      ],
    };

    // ------------------ PROMPT BUILD ------------------
    let prompt = `Create a ${
      stylePrompts[style as keyof typeof stylePrompts]
    } for: "${title}". `;

    if (color_scheme) {
      prompt += `Use ${
        colorSchemeDescriptions[
          color_scheme as keyof typeof colorSchemeDescriptions
        ]
      }. `;
    }

    if (user_prompt) {
      prompt += `Additional details: ${user_prompt}. `;
    }

    prompt += `Make it visually stunning, professional, and highly clickable.`;

    // ------------------ AI CALL ------------------
    const response: any = await ai.models.generateContent({
      model,
      contents: [
            {
                role: "user",
                parts: [{ text: prompt }],
            },
        ],
      config: generationConfig,
    });

    // ✅ RESPONSE VALIDATION
    if (!response?.candidates?.[0]?.content?.parts) {
      throw new Error("Invalid AI response structure");
    }

    const parts = response.candidates[0].content.parts;

    let finalBuffer: Buffer | null = null;

    for (const part of parts) {
      if (part.inlineData?.data) {
        finalBuffer = Buffer.from(part.inlineData.data, "base64");
      }
    }

    if (!finalBuffer) {
      throw new Error("Image generation failed (no buffer)");
    }

    // ------------------ FILE SAVE ------------------
    const filename = `thumbnail-${Date.now()}.png`;

    // ✅ FIXED FOLDER NAME
    const dir = "images";
    const filePath = path.join(dir, filename);

    // ensure folder exists
    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(filePath, finalBuffer);

    // ------------------ CLOUDINARY UPLOAD ------------------
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      resource_type: "image",
    });

    // ------------------ DB UPDATE ------------------
    thumbnail.image_url = uploadResult.secure_url;
    thumbnail.isGenerating = false;
    await thumbnail.save();

    // ------------------ CLEANUP ------------------
    fs.unlinkSync(filePath);

    // ------------------ RESPONSE ------------------
    res.json({
      message: "Thumbnail Generated",
      thumbnail,
    });
  } catch (error: any) {
    console.error("🔥 ERROR:", error);

    res.status(500).json({
      message: error.message || "Internal Server Error",
    });
  }
};

// ------------------ DELETE CONTROLLER ------------------
export const deleteThumbnail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.session as any)?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await Thumbnail.findOneAndDelete({ _id: id, userId });

    res.json({ message: "Thumbnail deleted successfully" });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};