export async function onRequestGet({ env }: any) {
  return new Response(JSON.stringify({
    gemini: false,
    deepseek: false,
    glm: false,
    qwen: false
  }), {
    headers: {
      "Content-Type": "application/json"
    }
  });
}
