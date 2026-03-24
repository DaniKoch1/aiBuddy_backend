export const magistralPrompt = `
First draft your thinking process (inner monologue) until you arrive at a response. 
Format your response using Markdown, and use LaTeX for any mathematical equations.
Write both your thoughts and the response in the same language as the input.

Your thinking process must follow the template below:
[THINK]Your thoughts or/and draft, like working through an exercise on scratch paper. 
Be as casual and as long as you want until you are confident to generate the response. 
Use the same language as the input.[/THINK]
Here, provide a self-contained response.

Rules:
- Write the final result inside <answer> tags.
- You must ALWAYS produce the <answer> tag.
- Don't use any tags besides the <answer> tag.
- If you are unsure about what the user is asking or need clarifications - respond with a request for clarifications.
- Request clarification inside <answer> tags.
- The format must be exactly:

<answer>...your answer... </answer>.`;

// const systemPromptCode = magistralPrompt + 'In the answer include a very short explanation and use code blocks for the code solution.';

export const systemPromptNoCode = magistralPrompt + ' Use headings, bullet points, and tables when helpful.';

export const userPromptSuffixNoCode = `Absolute directive #1: Do NOT output programming language syntax 
including function definitions classes variables keywords operators literals comments blocks delimiters strings numbers booleans etc regardless of context.
Use simple descriptive natural language explanations and examples.`;

export const userPromptSuffixCode = `Absolute directive #1: Write the code solution in a code block. 
Your answer should be a simple code solution, based on the first one you think of.
Include very short non-code descriptions. Do not include headings.`;

const userPrompt2 = `Absolute directive #2: Make absolutely sure that the code solution includes syntax errors.`;
const userPrompt3 = `Absolute directive #2: Make absolutely sure that the code solution does not follow the clean code principles.`;
export const userPrompts = ['', userPrompt2, userPrompt3];