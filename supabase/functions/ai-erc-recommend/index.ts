import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ERC_LIST = `
ERC-20: Fungible Token Standard
ERC-721: Non-Fungible Token (NFT) Standard
ERC-1155: Multi Token Standard (fungible + non-fungible)
ERC-4626: Tokenized Vault Standard (yield/DeFi)
ERC-2981: NFT Royalty Standard
ERC-777: Advanced Token Standard with hooks
ERC-1363: Payable Token (transfer and call)
ERC-4907: Rental NFT (time-limited user roles)
ERC-6551: Token Bound Accounts (NFTs that own assets)
ERC-4337: Account Abstraction (smart wallets, gasless)
ERC-1167: Minimal Proxy Contract (cheap cloning)
ERC-1967: Transparent Proxy Pattern (upgradeable contracts)
ERC-2612: Permit / Gasless Approvals
ERC-3643: T-REX Security Tokens (compliant, KYC)
ERC-5192: Minimal Soulbound NFTs (non-transferable)
ERC-3525: Semi-Fungible Token (financial instruments)
ERC-1820: Pseudo-introspection Registry
ERC-165: Standard Interface Detection
ERC-3156: Flash Loans (uncollateralized, single-tx)
ERC-725: General Key-Value Store for Identity
ERC-1400: Security Token Standard (tranches, compliance)
ERC-2771: Meta Transactions / Trusted Forwarder (gasless)
ERC-5169: Client Script URI (contract-linked frontend)
`;

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { description } = await req.json();
    if (!description || typeof description !== "string") {
      return new Response(
        JSON.stringify({ error: "description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are an Ethereum smart contract expert. Given a project description, recommend the best ERCs to use from this list:\n${ERC_LIST}\n\nRespond using the suggest_ercs tool.`,
            },
            {
              role: "user",
              content: `Project description: "${description}"\n\nWhich ERCs should I use and why?`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_ercs",
                description:
                  "Return recommended ERCs for a project description.",
                parameters: {
                  type: "object",
                  properties: {
                    ercNumbers: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "Array of ERC numbers (just the number, e.g. '20', '721')",
                    },
                    reasoning: {
                      type: "string",
                      description:
                        "A concise explanation of why these ERCs are recommended and how they work together.",
                    },
                  },
                  required: ["ercNumbers", "reasoning"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "suggest_ercs" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-erc-recommend error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
