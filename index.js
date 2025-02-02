import OpenAI from "openai";
import readlineSync from "readline-sync"; 

const OPENAI_API_KEY = 'ihaveputdownmykey';
const WEATHER_API_KEY = '12c9005778274c4db65233642251101';

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

async function getWeatherDetails(city = '') {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("City not found");
        
        const data = await response.json();
        return `${data.name}: ${data.main.temp}°C, ${data.weather[0].description}`;
    } catch (error) {
        return "Weather data not available";
    }
}

const tools = { getWeatherDetails };

const SYSTEM_PROMPT = `
You are an AI Assistant with START, PLAN, ACTION, Observation, and Output State.
Wait for the user prompt and first PLAN using available tools.
After Planning, Take the action with appropriate tools and wait for Observation based on Action.
Once you get the observations, return the AI response based on the START prompt and observations.

Available Tools:
function getWeatherDetails(city: string): string
getWeatherDetails is a function that accepts a city name as a string and returns the weather details.

Example:
START
{ "type": "user", "user": "What is the sum of the weather of Patiala and Mohali?" }
{ "type": "plan", "plan": "I will call getWeatherDetails for Patiala" }
{ "type": "action", "function": "getWeatherDetails", "input": "patiala" }
{ "type": "observation", "observation": "10°C" }
{ "type": "plan", "plan": "I will call getWeatherDetails for Mohali" }
{ "type": "action", "function": "getWeatherDetails", "input": "mohali" }
{ "type": "observation", "observation": "14°C" }
{ "type": "output", "output": "The sum of Patiala and Mohali is 24°C" }
`;

const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

(async function main() {
    while (true) {
        const query = readlineSync.question('>> '); // Taking user input
        const userMessage = { type: 'user', user: query };
        messages.push({ role: 'user', content: JSON.stringify(userMessage) });
        
        while (true) {
            const chat = await client.chat.completions.create({
                model: 'gpt-4o',
                messages: messages,
                response_format: { type: 'json_object' },
            });

            const result = chat.choices[0].message.content;
            messages.push({ role: 'assistant', content: result });
            
            const call = JSON.parse(result);
            
            if (call.type === 'output') {
                console.log(`ROBOT: ${call.output}`);
                break;
            } else if (call.type === "action") {
                const fn = tools[call.function];
                if (fn) {
                    const observation = fn(call.input);
                    const obs = { type: 'observation', observation: observation };
                    messages.push({ role: 'developer', content: JSON.stringify(obs) });
                } else {
                    console.log("ROBOT: Invalid function call.");
                    break;
                }
            }
        }
    }
})();
