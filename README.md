# ercWhat

> Find the right Ethereum standard before you write a single line of code.

**ercWhat** is a developer tool that maps your project idea to the Ethereum Request for Comments (ERCs) you actually need. Describe what you're building — a real estate platform, an NFT marketplace, a DAO — and ercWhat surfaces the relevant standards with context on why they fit, what they do, and how they work together.

---

## The Problem

Ethereum has dozens of token standards and contract interfaces. Most developers either default to ERC-20 and ERC-721 out of habit, or spend hours reading through EIPs to figure out what's relevant to their use case. Neither is a good use of time.

Your boss says *"we want to build a real estate tokenization app."* You shouldn't have to already know that ERC-3643 handles compliant transfers, ERC-4907 enables rental mechanics, or that ERC-6551 lets your property NFTs own their own rental income wallet. ercWhat tells you.

---

## Features

- **Natural language search** — describe your project in plain English and get a ranked list of relevant ERCs
- **Relevance scoring** — each result shows how well the standard fits your use case
- **"Why for your project" explanations** — not just what the ERC does, but why it matters for what you're building
- **Browse all ERCs** — filterable by category (Tokens, NFTs, DeFi, Infrastructure, Identity, Wallets)
- **Full standard details** — use cases, key functions, what it pairs with, and a direct link to the EIP
- **Pairing recommendations** — know which standards are commonly used together

---

## Standards Covered

| Category | Standards |
|---|---|
| **Tokens** | ERC-20, ERC-777, ERC-1363, ERC-2612, ERC-3525, ERC-3643, ERC-1400, ERC-5679 |
| **NFTs** | ERC-721, ERC-1155, ERC-2981, ERC-4907, ERC-5007, ERC-5192, ERC-5375, ERC-5484, ERC-4955, ERC-6551 |
| **DeFi** | ERC-4626, ERC-712 |
| **Infrastructure** | ERC-165, ERC-1167, ERC-1271, ERC-1967, ERC-2535, ERC-5679 |
| **Identity** | ERC-5192, ERC-5484 |
| **Wallets** | ERC-4337, ERC-6900, ERC-7579 |

---

## Usage

ercWhat is a single HTML file with no dependencies or build step required.

```bash
# Clone the repo
git clone https://github.com/yourhandle/ercwhat
cd ercwhat

# Open directly in your browser
open ercwhat.html
```

Or just drag `ercwhat.html` into any browser. That's it.

---

## Example Queries

- `"I want to build a real estate platform where properties are fractionally owned and can be rented out"`
- `"NFT marketplace with automatic creator royalties on secondary sales"`
- `"DAO with on-chain governance and proposal voting"`
- `"DeFi lending protocol with yield-bearing deposit receipts"`
- `"Blockchain game with player inventories, currencies, and unique characters"`
- `"KYC-compliant security token for accredited investors"`
- `"Soulbound credential system for university diplomas"`

---

## Roadmap

- [ ] AI-powered recommendations via Anthropic API for deeper, context-aware suggestions
- [ ] OpenZeppelin code snippets for each ERC
- [ ] Stack builder — pin ERCs and export your contract architecture
- [ ] Compatibility matrix — see which standards conflict or must be combined
- [ ] Community-submitted use case examples
- [ ] Search by EIP number
- [ ] Solidity interface previews

---

## Contributing

New ERCs ship regularly. If a standard is missing or a use case description could be improved, PRs are welcome.

1. Fork the repo
2. Add your ERC to the `ERCS` array in `ercwhat.html` following the existing schema
3. Include: `id`, `name`, `category`, `desc`, `uses`, `functions`, `pairs`, `tags`, `eip`, `keywords`
4. Open a PR with a brief note on why the standard deserves inclusion

---

## Why "ercWhat"

Because that's what every developer says when their lead asks them to use the right token standard.

---

## License

MIT