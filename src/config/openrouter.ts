export const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.5";

export function isOpenRouterEnabled(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY);
}
