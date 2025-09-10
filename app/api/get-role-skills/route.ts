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
    if (!process.env.TAVILY_API_KEY) {
      console.log('Tavily API key not found, skipping web search');
      return '';
    }

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
      console.error('Tavily API response not ok:', response.status, response.statusText);
      return '';
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
    if (!process.env.YOUTUBE_API_KEY) {
      console.log('YouTube API key not found, using fallback URL');
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + ' tutorial')}`;
    }

    const query = `${skill} tutorial long form`;
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoDuration=long&order=viewCount&maxResults=1&key=${process.env.YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      console.error('YouTube API response not ok:', response.status, response.statusText);
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + ' tutorial')}`;
    }

    const data = await response.json();
    const video = data.items?.[0];
    
    if (video) {
      return `https://www.youtube.com/watch?v=${video.id.videoId}`;
    }
    
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + ' tutorial')}`;
  } catch (error) {
    console.error('YouTube search failed:', error);
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + ' tutorial')}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('API called - checking environment variables');
    console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
    console.log('YOUTUBE_API_KEY exists:', !!process.env.YOUTUBE_API_KEY);
    console.log('TAVILY_API_KEY exists:', !!process.env.TAVILY_API_KEY);

    const body: SkillAnalysisRequest = await request.json();
    const { role, company, skills } = body;
    console.log('Request body:', { role, company, skills });

    // Search for required skills
    const searchQuery = `skills required for ${role} at ${company}`;
    console.log('Searching web for:', searchQuery);
    const webResults = await searchWeb(searchQuery);
    console.log('Web results length:', webResults.length);

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

    console.log('Calling Groq API...');
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
    console.log('AI Response:', aiResponse);
    
    // Extract missing skills from AI response
    let missingSkills: string[] = [];
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        missingSkills = parsed.missing_skills || [];
      }
    } catch (error) {
      console.log('JSON parsing failed, using fallback');
      // Fallback: extract skills manually from response
      const lines = aiResponse.split('\n');
      missingSkills = lines
        .filter(line => line.includes('missing') || line.includes('need'))
        .map(line => line.replace(/[^\w\s]/g, '').trim())
        .filter(skill => skill.length > 0)
        .slice(0, 5);
    }

    console.log('Missing skills:', missingSkills);

    if (missingSkills.length === 0) {
      return NextResponse.json({
        status: 'ready',
        message: 'You are ready for the role! Just polish your skills and you will surely make it one day 🚀'
      } as SkillAnalysisResponse);
    }

    // Find YouTube videos for missing skills
    const skillsWithVideos: MissingSkill[] = [];
    
    for (const skill of missingSkills) {
      console.log('Searching YouTube for:', skill);
      const videoUrl = await searchYouTube(skill);
      if (videoUrl) {
        skillsWithVideos.push({
          skill,
          video: videoUrl
        });
      }
    }

    console.log('Final result:', skillsWithVideos);

    return NextResponse.json({
      status: 'missing_skills',
      missing_skills: skillsWithVideos
    } as SkillAnalysisResponse);

  } catch (error) {
    console.error('Error in get-role-skills:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}