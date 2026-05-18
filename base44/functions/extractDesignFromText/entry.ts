import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { text } = await req.json();
    if (!text) {
      return Response.json({ error: 'Missing text' }, { status: 400 });
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an interior design project assistant. Analyze this design consultation summary text.
Extract ALL design items, recommendations, and decisions organized by room/space.

For EACH item extract:
- room: the space/room name in Hebrew (סלון, מטבח, חדר שינה, חדר רחצה, כניסה, מדרגות, חוץ, פינת אוכל, כללי)
- category: one of: color, flooring, furniture, lighting, textile, carpentry, accessories, wallpaper, plants, appliances, other
- title: short title in Hebrew
- description: the full recommendation/explanation in Hebrew (include tips, reasoning)
- options: array of options [{name, link, price, notes}] - extract product names, URLs, prices, contact info
- supplier: main supplier name
- supplier_phone: supplier phone if mentioned
- stage: project stage number (6=design plan, 7=work plans, 8=design concept, 9=shopping, 10=supplier pricing, 11=execution, 12=installation). Default to 8 if unclear.
- priority: "must" or "nice_to_have"

Be thorough - extract EVERY recommendation, even small ones like plants or accessories.
Group related items by room. Each distinct product/decision should be a separate item.
Keep all Hebrew text as-is. Extract ALL URLs mentioned.

Here is the document text:
${text}`,
      response_json_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                room: { type: "string" },
                category: { type: "string", enum: ["color", "flooring", "furniture", "lighting", "textile", "carpentry", "accessories", "wallpaper", "plants", "appliances", "other"] },
                title: { type: "string" },
                description: { type: "string" },
                options: { type: "array", items: { type: "object", properties: { name: { type: "string" }, link: { type: "string" }, price: { type: "string" }, notes: { type: "string" } } } },
                supplier: { type: "string" },
                supplier_phone: { type: "string" },
                stage: { type: "number" },
                priority: { type: "string", enum: ["must", "nice_to_have"] }
              }
            }
          },
          summary: { type: "string" }
        }
      },
      model: "claude_sonnet_4_6"
    });

    return Response.json({
      items: result.items || [],
      summary: result.summary || '',
      count: (result.items || []).length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});