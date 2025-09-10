import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface SkillAnalysisRequest {
  role: string;
  company: string;
  skills: string[];
}

interface MissingSkill {
  skill: string;
  video: string;
}

interface SkillAnalysisResponse {
  status: 'ready' | 'missing_skills';
  message?: string;
  missing_skills?: MissingSkill[];
}

async function searchWeb(query: string): Promise<string> {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        include_answer: true,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      throw new Error('Tavily API request failed');
    }

    const data = await response.json();
    return data.results?.map((r: any) => r.content).join('\n') || '';
  } catch (error) {
    console.error('Web search failed:', error);
    return '';
  }
}

async function searchYouTube(skill: string): Promise<string> {
  try {
    const query = `${skill} tutorial long form`;
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoDuration=long&order=viewCount&maxResults=1&key=${process.env.YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('YouTube API request failed');
    }

    const data = await response.json();
    const video = data.items?.[0];
    
    if (video) {
      return `https://www.youtube.com/watch?v=${video.id.videoId}`;
    }
    
    return '';
  } catch (error) {
    console.error('YouTube search failed:', error);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SkillAnalysisRequest = await request.json();
    const { role, company, skills } = body;

    // Search for required skills
    const searchQuery = `skills required for ${role} at ${company}`;
    const webResults = await searchWeb(searchQuery);

    // Use Groq to analyze required skills
    const skillsPrompt = `
Based on the following web search results about "${role}" at "${company}", extract the key technical skills required:

${webResults}

User's current skills: ${skills.join(', ')}

Please analyze and respond with:
1. List of required skills for this role
2. Which skills the user is missing
3. Format your response as a JSON object with "required_skills" and "missing_skills" arrays

Be specific and focus on technical skills only.
`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: skillsPrompt,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';
    
    // Extract missing skills from AI response
    let missingSkills: string[] = [];
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        missingSkills = parsed.missing_skills || [];
      }
    } catch (error) {
      // Fallback: extract skills manually from response
      const lines = aiResponse.split('\n');
      missingSkills = lines
        .filter(line => line.includes('missing') || line.includes('need'))
        .map(line => line.replace(/[^\w\s]/g, '').trim())
        .filter(skill => skill.length > 0)
        .slice(0, 5);
    }

    if (missingSkills.length === 0) {
      return NextResponse.json({
        status: 'ready',
        message: 'You are ready for the role! Just polish your skills and you will surely make it one day 🚀'
      } as SkillAnalysisResponse);
    }

    // Find YouTube videos for missing skills
    const skillsWithVideos: MissingSkill[] = [];
    
    for (const skill of missingSkills) {
      const videoUrl = await searchYouTube(skill);
      if (videoUrl) {
        skillsWithVideos.push({
          skill,
          video: videoUrl
        });
      }
    }

    return NextResponse.json({
      status: 'missing_skills',
      missing_skills: skillsWithVideos
    } as SkillAnalysisResponse);

  } catch (error) {
    console.error('Error in get-role-skills:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}