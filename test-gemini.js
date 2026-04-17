const fetch = require('node-fetch');

const API_KEY = process.env.VITE_GEMINI_API_KEY || 'AIzaSyD31VgKbE_iOqFW2P0sKEfdP4lqyK3_dJ0';

async function testDiscovery() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  console.log('Discovery Status:', response.status);
  if (!response.ok) {
    console.log('Error:', data);
    return;
  }
  const models = data.models || [];
  console.log('Total models:', models.length);
  
  const genModels = models.filter(m => m.supportedMethodNames?.includes('generateContent'));
  console.log('Generative Models:', genModels.map(m => m.name));
  
  // Test one payload
  const modelName = 'models/gemini-1.5-flash';
  console.log(`\nTesting generation with ${modelName}...`);
  const genUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${API_KEY}`;
  
  const req = await fetch(genUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Say hi.' }] }]
    })
  });
  console.log('Gen Status:', req.status);
  const genData = await req.json();
  if (!req.ok) {
    console.log('Gen Error:', genData);
  } else {
    console.log('Gen Output:', genData.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 50));
  }
}

testDiscovery();
