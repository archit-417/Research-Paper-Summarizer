const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function listModels() {
  try {
    const models = await openai.models.list();
    console.log("Available models:");
    models.data.forEach(model => {
      console.log(`- ${model.id}`);
    });
  } catch (error) {
    console.error('Error fetching models:', error);
  }
}

listModels();