import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { mkdirSync } from 'fs';
import fs from "fs";
import path from 'path';
import { spawn } from 'child_process';
import OpenAI from "openai";

// tmp directory setup
const TMP_DIR = '/tmp/next-whisper-test';
mkdirSync(TMP_DIR, { recursive: true });

// openai client setup
const openai = new OpenAI(
  {
    apiKey: ''
  }
);


async function finalAnalysis(v3: string) {
  const prompt = `
  Here is a review of a TikTok video:
  
  ${v3}
  
  Using the review, return the following analysis with critique as a JSON object with these exact fields:
  
  {
    "hookRating": number,
    "hookExplanation": string,
    "engagementRating": number,
    "engagementExplanation": string
  }
  
  Do NOT include anything outside the JSON — return ONLY the JSON.
  `.trim();
  
  
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });
  
    return JSON.parse(completion.choices[0]?.message?.content || '');

}



async function promptVa3Analysis(va2Output: string) {
  const prompt = `
You are a TikTok expert.

Here is a detailed analysis of a TikTok video:

${va2Output}

Using the above, provide:
- Hook Rating (0-100)
- Hook Recommendations with timestamps
- Engagement Rating (0-100)
- Engagement Recommendations with timestamps

Use TikTok psychology, video strategy, and clear formatting as outlined in Prompt Va3.
`.trim();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 2000
  });

  return completion.choices[0]?.message?.content || '';
}

// Complete va2 analysis

async function promptVa2Analysis(gptVisualSummary: string, srtTranscript: string): Promise<string> {
  const prompt = `
This is a follow-up analysis combining both visual and audio information.

Brand Persona Summary:
He is a software Engineer

Video Transcript (in SRT format):
${srtTranscript}

Visual Summary (from GPT-4 Vision):
${gptVisualSummary}

Using the SRT transcript and visual summary together, polish your assumptions and descriptions. Add timestamps from the transcript to improve specificity.

Output structure:
- Overall Video Summary
- Detailed Frame Analysis
  1. Dynamic Angles
  2. Text Hook
  3. Captions
  4. Number of People in Frame
  5. B-Roll Indications
  6. Hand Gestures
  7. Additional On-Screen Actions
  8. Frame Description (with timestamps)
  9. Video Quality
  10. Recording Style
  11. Location
  `.trim();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 3000
  });

  return completion.choices[0]?.message?.content || '';
}

// Get the GPT frames 
async function gptFrames(inputPath: string): Promise<string[]> {
  const framesDir = inputPath.replace(path.extname(inputPath), '_frames');
  mkdirSync(framesDir, { recursive: true });

  const framePattern = path.join(framesDir, 'frame_%04d.jpg');

  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ['-i', inputPath, '-vf', 'fps=1', framePattern]);

    ffmpeg.stderr.on('data', data => console.log('[ffmpeg-frames]', data.toString()));
    ffmpeg.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg (frame extraction) exited with code ${code}`));
      }
    });
  });

  const frameFiles = fs.readdirSync(framesDir)
    .filter(file => file.endsWith('.jpg'))
    .sort()
    .map(file => path.join(framesDir, file));

  return frameFiles;
}

// Analyse the GPT frames
async function analyzeFramesWithGPT(framePaths: string[]) {

  const imageBlocks: OpenAI.Chat.Completions.ChatCompletionContentPartImage[] = framePaths.slice(0, 10).map((filePath) => {
    const base64 = fs.readFileSync(filePath, 'base64');
    return {
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${base64}`,
        detail: 'auto'
      }
    };
  });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `
These are frames extracted from a TikTok video. Analyze them together as one video sequence, and return:
- An overall video summary
- Frame-by-frame differences and observations
- Details on hooks, gestures, text captions, camera angles, B-roll, and recording style
Return in structured breakdown format.
            `.trim()
          },
          ...imageBlocks
        ]
      }
    ],
    max_tokens: 2000
  });

  return completion.choices[0]?.message?.content || '';
}

async function runWhisper(inputPath: string) {
  const translation = await openai.audio.translations.create({
    file: fs.createReadStream(inputPath),
    model: "whisper-1",
    response_format: "srt" 
  });

  const srtPath = inputPath.replace(path.extname(inputPath), '.srt');
  
  const content = typeof translation === 'string' ? translation : translation.text;
  await writeFile(srtPath, content);
  
  return srtPath;
}


function runFFMPEG(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(path.extname(inputPath), '.mp3');
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ['-i', inputPath, '-vn', '-acodec', 'libmp3lame', outputPath]);
 
    ffmpeg.stderr.on('data', (data) => {
      console.log('[ffmpeg]', data.toString());
    });
 
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
 }



 export async function POST(req: NextRequest) {
  try {
    // Parse it and return the file 
    const formData = await req.formData();
    const file = formData.get('file') as File;

    // Some basic error handling if they do not upload a file 
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Now turn file into NodeJS buffer, as nodeJS buffer type we can write to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const originalFilename = file.name;
    const inputPath = path.join(TMP_DIR, originalFilename);
    const outputPath = inputPath.replace(path.extname(inputPath), '.mp3');

    // Save uploaded file to disk
    await writeFile(inputPath, buffer);

    // Helper function to run our FFmpeg promise function 
    const response = await runFFMPEG(inputPath);

    // Now we run whisper API 
    const responseTwo = await runWhisper(response);

    // Now we use the GPT models -> We need to extract a frame every 0.5 seconds, send to GPT to do analysis
    const responseThree = await gptFrames(inputPath)

    const gptVisionOutput = await analyzeFramesWithGPT(responseThree);
    // There is some good info in here
    console.log(gptVisionOutput);

    // Read the SRT and make sure it's not a buffer ( Default ) and is utf-8 which will auto make it a string
    const srtContent = fs.readFileSync(responseTwo, 'utf8');

    const polishedAnalysis = await promptVa2Analysis(gptVisionOutput, srtContent);

    // Now we feed this polishedAnalysis into V3
    const v3 = await promptVa3Analysis(polishedAnalysis);

    const final = await finalAnalysis(v3);

    // Now lets return this object
    return NextResponse.json(final);

  } catch (error) {
    console.error('Error in /api/upload:', error);
    return NextResponse.json(
      {
        error: 'An error occurred during video processing',
        message: (error as Error).message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

