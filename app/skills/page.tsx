'use client';

import { useState } from 'react';

interface MissingSkill {
  skill: string;
  video: string;
}

interface SkillAnalysisResponse {
  status: 'ready' | 'missing_skills';
  message?: string;
  missing_skills?: MissingSkill[];
}

export default function SkillsPage() {
  const [formData, setFormData] = useState({
    role: '',
    company: '',
    skills: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SkillAnalysisResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(s => s);
      
      const response = await fetch('/api/get-role-skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: formData.role,
          company: formData.company,
          skills: skillsArray,
        }),
      });

      const data = await response.json();
      console.log('API Response:', data);
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #ffffff 0%, #fff5f0 50%, #ffede0 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif'
    }}>
      <div style={{ padding: '32px' }}>
        <div style={{ maxWidth: '1024px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <a 
              href="/" 
              style={{
                marginTop: '16px',
                color: '#ea580c',
                textDecoration: 'underline',
                marginBottom: '16px',
                display: 'inline-block'
              }}
            >
              ← Back to Chat
            </a>
          </div>
          <h1 style={{ 
            fontSize: '30px', 
            fontWeight: 'bold', 
            color: '#000000', 
            marginBottom: '32px' 
          }}>
            Skill Gap Analysis
          </h1>
        
          <form onSubmit={handleSubmit} style={{
            backgroundColor: '#fff7ed',
            padding: '24px',
            borderRadius: '8px',
            marginBottom: '32px'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '16px', 
              marginBottom: '16px' 
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  color: '#000000', 
                  fontWeight: '500', 
                  marginBottom: '8px' 
                }}>
                  Role
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  placeholder="e.g., SDE, Data Scientist"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #fed7aa',
                    borderRadius: '8px',
                    fontSize: '16px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    outline: 'none'
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  color: '#000000', 
                  fontWeight: '500', 
                  marginBottom: '8px' 
                }}>
                  Company
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  placeholder="e.g., Google, Microsoft"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #fed7aa',
                    borderRadius: '8px',
                    fontSize: '16px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    outline: 'none'
                  }}
                  required
                />
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                color: '#000000', 
                fontWeight: '500', 
                marginBottom: '8px' 
              }}>
                Your Skills (comma-separated)
              </label>
              <input
                type="text"
                value={formData.skills}
                onChange={(e) => setFormData({...formData, skills: e.target.value})}
                placeholder="e.g., Python, DSA, React"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #fed7aa',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  outline: 'none'
                }}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: loading ? '#9ca3af' : '#f97316',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.backgroundColor = '#ea580c';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.backgroundColor = '#f97316';
              }}
            >
              {loading ? 'Analyzing...' : 'Analyze Skills'}
            </button>
          </form>

          {result && (
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #fed7aa',
              borderRadius: '8px',
              padding: '24px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}>
              {result.status === 'ready' ? (
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ 
                    fontSize: '24px', 
                    fontWeight: 'bold', 
                    color: '#16a34a', 
                    marginBottom: '16px' 
                  }}>
                    🚀 You're Ready!
                  </h2>
                  <p style={{ color: '#000000' }}>{result.message}</p>
                </div>
              ) : (
                <div>
                  <h2 style={{ 
                    fontSize: '24px', 
                    fontWeight: 'bold', 
                    color: '#000000', 
                    marginBottom: '16px' 
                  }}>
                    Skills to Learn
                  </h2>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse', 
                      backgroundColor: '#ffffff' 
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#fed7aa' }}>
                          <th style={{ 
                            border: '1px solid #fed7aa', 
                            padding: '12px', 
                            textAlign: 'left', 
                            color: '#000000', 
                            fontWeight: '600' 
                          }}>
                            Skill Name
                          </th>
                          <th style={{ 
                            border: '1px solid #fed7aa', 
                            padding: '12px', 
                            textAlign: 'left', 
                            color: '#000000', 
                            fontWeight: '600' 
                          }}>
                            YouTube Tutorial
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.missing_skills?.map((skill, index) => (
                          <tr key={index} style={{ 
                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#fff7ed' 
                          }}>
                            <td style={{ 
                              border: '1px solid #fed7aa', 
                              padding: '12px', 
                              color: '#000000', 
                              fontWeight: '500' 
                            }}>
                              {skill.skill}
                            </td>
                            <td style={{ 
                              border: '1px solid #fed7aa', 
                              padding: '12px' 
                            }}>
                              <a
                                href={skill.video}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  backgroundColor: '#f97316',
                                  color: 'white',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  textDecoration: 'none',
                                  display: 'inline-block',
                                  transition: 'background-color 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#ea580c'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#f97316'}
                              >
                                Watch Tutorial
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}