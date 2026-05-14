import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY'],
});
// console.log('apiKey', client.apiKey);
// I think there is an error with the key either it is invalid or expired

const message = await client.messages.create({
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello, Claude' }],
  model: 'claude-sonnet-4-20250514',
});

console.log(message.content);