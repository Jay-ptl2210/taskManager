const axios = require('axios');
require('dotenv').config();

const classifyTask = async (text) => {
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
      {
        inputs: text,
        parameters: {
          candidate_labels: ['Bug', 'Feature', 'Content', 'Urgent', 'Low Priority'],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        },
      }
    );

    return response.data.labels[0] || 'Uncategorized';
  } catch (error) {
    console.error('AI classification error:', error.message);
    return 'Uncategorized';
  }
};

module.exports = classifyTask;
