import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, ExternalLink, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ChainSupport = "full" | "partial" | "native-different" | "unsupported";

export interface ChainNote {
  chain: Chain;
  support: ChainSupport;
  summary: string;         // one-line status
  details: string;         // full explanation
  gotcha?: string;         // the thing that WILL catch you out
  docsUrl?: string;
}

export interface L2CompatData {
  ercNumber: string;
  notes: ChainNote[];
}

export type Chain = "Arbitrum" | "Optimism" | "Base" | "zkSync Era" | "Polygon zkEVM" | "Linea";

// ---------------------------------------------------------------------------
// Chain metadata
// ---------------------------------------------------------------------------
const chainMeta: Record<Chain, { color: string; bg: string; border: string; type: string; emoji: string }> = {
  "Arbitrum":       { color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",   type: "Optimistic Rollup", emoji: "🔵" },
  "Optimism":       { color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",    type: "Optimistic Rollup", emoji: "🔴" },
  "Base":           { color: "text-sky-400",    bg: "bg-sky-500/10",    border: "border-sky-500/30",    type: "Optimistic Rollup", emoji: "🌐" },
  "zkSync Era":     { color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", type: "ZK Rollup",         emoji: "⚡" },
  "Polygon zkEVM":  { color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30", type: "ZK Rollup",         emoji: "🟣" },
  "Linea":          { color: "text-teal-400",   bg: "bg-teal-500/10",   border: "border-teal-500/30",   type: "ZK Rollup",         emoji: "🟢" },
};

const supportConfig: Record<ChainSupport, { label: string; color: string; icon: React.ReactNode }> = {
  "full":             { label: "Full support",       color: "text-green-400",  icon: <CheckCircle2 className="h-4 w-4" /> },
  "partial":          { label: "Partial support",    color: "text-yellow-400", icon: <AlertTriangle className="h-4 w-4" /> },
  "native-different": { label: "Native — different", color: "text-purple-400", icon: <Info className="h-4 w-4" /> },
  "unsupported":      { label: "Not supported",      color: "text-red-400",    icon: <XCircle className="h-4 w-4" /> },
};

// ---------------------------------------------------------------------------
// L2 compatibility database
// Research-backed, sourced from chain docs + real dev experience
// ---------------------------------------------------------------------------
export const l2CompatDatabase: Record<string, L2CompatData> = {

  "20": {
    ercNumber: "20",
    notes: [
      { chain: "Arbitrum",      support: "full",    summary: "Fully compatible — deploy without changes", details: "Arbitrum is EVM-equivalent. All ERC-20 functions work identically to mainnet. SafeERC20 patterns behave the same. Gas costs are ~10-20x cheaper than mainnet.", docsUrl: "https://docs.arbitrum.io/for-devs/concepts/differences-between-arbitrum-ethereum/solidity-support" },
      { chain: "Optimism",      support: "full",    summary: "Fully compatible — deploy without changes", details: "OP Stack is EVM-equivalent. ERC-20s work identically. Note: Optimism uses a two-phase withdrawal (7-day challenge period) for bridging tokens back to L1.", docsUrl: "https://docs.optimism.io/chain/differences" },
      { chain: "Base",          support: "full",    summary: "Fully compatible — built on OP Stack",      details: "Base inherits OP Stack's EVM equivalence. ERC-20s work identically. Base has deep USDC integration via Coinbase, making it ideal for stablecoin use cases.", docsUrl: "https://docs.base.org" },
      { chain: "zkSync Era",    support: "partial", summary: "Mostly compatible — USDT & non-standard tokens need care", details: "Standard ERC-20s work. However, zkSync uses a different contract deployment mechanism (ContractDeployer system contract). Non-standard ERC-20s (USDT, BNB) that don't return bool may behave differently.", gotcha: "zkSync compiles with zksolc, not solc. If your ERC-20 uses assembly or inline opcodes, it may not compile. Test with the zkSync compiler before assuming compatibility.", docsUrl: "https://docs.zksync.io/build/developer-reference/differences-with-ethereum" },
      { chain: "Polygon zkEVM", support: "full",    summary: "Fully compatible — EVM-equivalent ZK rollup", details: "Polygon zkEVM is designed for EVM equivalence at the bytecode level. ERC-20s deploy and behave identically to Ethereum mainnet.", docsUrl: "https://docs.polygon.technology/zkEVM" },
      { chain: "Linea",         support: "full",    summary: "Fully compatible — EVM-equivalent",         details: "Linea supports Ethereum EVM bytecode. ERC-20 contracts deploy without modification. Linea is closely tied to ConsenSys/MetaMask infrastructure.", docsUrl: "https://docs.linea.build" },
    ],
  },

  "721": {
    ercNumber: "721",
    notes: [
      { chain: "Arbitrum",      support: "full",    summary: "Fully compatible — most NFT projects deploy here", details: "Full ERC-721 support. Arbitrum is the most active L2 for NFTs after Ethereum mainnet. tokenURI, safeTransferFrom, and all callbacks work identically.", docsUrl: "https://docs.arbitrum.io" },
      { chain: "Optimism",      support: "full",    summary: "Fully compatible", details: "ERC-721 works identically on Optimism. Note the 7-day withdrawal window if bridging NFTs back to L1 via the native bridge. Third-party bridges offer faster exits.", docsUrl: "https://docs.optimism.io" },
      { chain: "Base",          support: "full",    summary: "Fully compatible — highest NFT retail activity", details: "Base has become a dominant chain for consumer NFTs. Full ERC-721 support. Coinbase Wallet native support makes it ideal for NFT apps targeting mainstream users.", docsUrl: "https://docs.base.org" },
      { chain: "zkSync Era",    support: "partial", summary: "Compatible but onERC721Received needs testing", details: "ERC-721 core functions work. However, zkSync's unique contract deployment (via ContractDeployer) means CREATE2 addresses differ from Ethereum. If your NFT contract uses CREATE2 for predictable addresses, recalculate.", gotcha: "The onERC721Received callback works, but contract addresses derived from CREATE2 will differ on zkSync because it uses a different CREATE2 formula. Don't hardcode expected addresses.", docsUrl: "https://docs.zksync.io/build/developer-reference/differences-with-ethereum#create-create2" },
      { chain: "Polygon zkEVM", support: "full",    summary: "Fully compatible",                          details: "Polygon zkEVM supports ERC-721 fully with EVM bytecode equivalence. Standard NFT deployment patterns work without modification.", docsUrl: "https://docs.polygon.technology/zkEVM" },
      { chain: "Linea",         support: "full",    summary: "Fully compatible",                          details: "Full ERC-721 support on Linea. Works identically to mainnet.", docsUrl: "https://docs.linea.build" },
    ],
  },

  "1155": {
    ercNumber: "1155",
    notes: [
      { chain: "Arbitrum",      support: "full",    summary: "Fully compatible — dominant chain for gaming NFTs", details: "ERC-1155 works identically. Arbitrum is the most popular L2 for blockchain gaming, which heavily uses ERC-1155 for multi-asset inventories.", docsUrl: "https://docs.arbitrum.io" },
      { chain: "Optimism",      support: "full",    summary: "Fully compatible",                          details: "Full ERC-1155 support including batch transfers. 7-day withdrawal applies when bridging to L1.", docsUrl: "https://docs.optimism.io" },
      { chain: "Base",          support: "full",    summary: "Fully compatible",                          details: "Full ERC-1155 support. Base's retail focus makes it good for consumer gaming and collectibles using ERC-1155.", docsUrl: "https://docs.base.org" },
      { chain: "zkSync Era",    support: "partial", summary: "Compatible — watch CREATE2 addresses in batch minting", details: "ERC-1155 core functions work. Batch transfers (safeBatchTransferFrom) work correctly. The same CREATE2 address derivation caveat as ERC-721 applies.", gotcha: "If you're deploying an ERC-1155 factory that uses CREATE2 to predict child contract addresses, those addresses will differ from Ethereum. zkSync uses a different CREATE2 address formula.", docsUrl: "https://docs.zksync.io/build/developer-reference/differences-with-ethereum" },
      { chain: "Polygon zkEVM", support: "full",    summary: "Fully compatible",                          details: "Full ERC-1155 support at EVM equivalence level.", docsUrl: "https://docs.polygon.technology/zkEVM" },
      { chain: "Linea",         support: "full",    summary: "Fully compatible",                          details: "Full ERC-1155 support.", docsUrl: "https://docs.linea.build" },
    ],
  },

  "4337": {
    ercNumber: "4337",
    notes: [
      { chain: "Arbitrum",      support: "full",    summary: "Full ERC-4337 support via dedicated RPC endpoint", details: "Arbitrum activated ERC-4337 bundler support via AIP-2, adding eth_sendRawTransactionConditional specifically for bundlers. The EntryPoint contract is deployed at the standard address. Alchemy, Biconomy, and Pimlico all support Arbitrum bundlers.", gotcha: "UserOp gas costs on Arbitrum are higher than you'd expect — a simple ETH transfer UserOp can exceed $1. This is because UserOps add significant calldata overhead on top of the base transaction.", docsUrl: "https://docs.arbitrum.io/for-devs/concepts/account-abstraction" },
      { chain: "Optimism",      support: "full",    summary: "Full ERC-4337 support — highest adoption among L2s", details: "Optimism and Base are the leading chains for ERC-4337 adoption. The EntryPoint is deployed at the standard address. OP Stack's architecture works well with the bundler model. Base (OP Stack) leads all L2s in ERC-4337 UserOp volume.", docsUrl: "https://docs.optimism.io" },
      { chain: "Base",          support: "full",    summary: "Highest ERC-4337 adoption of any L2",      details: "Base leads all networks in ERC-4337 UserOp volume, driven by Coinbase Smart Wallet. The Coinbase Smart Wallet uses ERC-4337 and ERC-6900 modules, creating a massive native AA ecosystem. EntryPoint is at the standard address.", docsUrl: "https://docs.base.org/identity/smart-wallet/overview" },
      { chain: "zkSync Era",    support: "native-different", summary: "Native AA — NOT ERC-4337 compatible", details: "zkSync has native account abstraction built into the protocol. Every account is a smart contract. This is MORE powerful than ERC-4337 but NOT compatible with ERC-4337. There is no EntryPoint contract, no bundler, no UserOperation type. zkSync uses its own IAccount interface and Paymaster system.", gotcha: "You CANNOT deploy ERC-4337 smart accounts on zkSync Era and expect them to work. You must implement IAccount (zkSync's interface) instead of validateUserOp. Your ERC-4337 bundler infrastructure is also incompatible — you need zkSync's native transaction flow.", docsUrl: "https://docs.zksync.io/build/developer-reference/account-abstraction" },
      { chain: "Polygon zkEVM", support: "full",    summary: "ERC-4337 compatible via standard EntryPoint",  details: "Polygon zkEVM supports ERC-4337 via the standard EntryPoint contract. Works with major bundler providers (Biconomy, Pimlico). ERC-20 gas payments are possible via paymaster.", docsUrl: "https://docs.polygon.technology/zkEVM" },
      { chain: "Linea",         support: "full",    summary: "ERC-4337 compatible",                      details: "Linea supports ERC-4337 via the standard EntryPoint. Works with major AA tooling providers.", docsUrl: "https://docs.linea.build" },
    ],
  },

  "4626": {
    ercNumber: "4626",
    notes: [
      { chain: "Arbitrum",      support: "full",    summary: "Fully compatible — most DeFi vaults deploy here", details: "ERC-4626 vaults work identically on Arbitrum. It is the dominant DeFi L2 with the deepest liquidity. Yield vaults from Yearn, Aave, and others are live on Arbitrum.", docsUrl: "https://docs.arbitrum.io" },
      { chain: "Optimism",      support: "full",    summary: "Fully compatible",                         details: "Full ERC-4626 support. Velodrome and other Optimism-native DeFi protocols use ERC-4626 vaults.", docsUrl: "https://docs.optimism.io" },
      { chain: "Base",          support: "full",    summary: "Fully compatible — growing DeFi ecosystem", details: "Full ERC-4626 support. Aerodrome (Base's leading DEX) and several yield protocols use ERC-4626.", docsUrl: "https://docs.base.org" },
      { chain: "zkSync Era",    support: "partial", summary: "Compatible — but test inflation attack protection", details: "ERC-4626 vaults work on zkSync. However, the OZ v5 inflation attack fix relies on virtual share accounting. Verify that your chosen OZ version behaves correctly on zkSync's compiler before deploying.", gotcha: "zkSync uses zksolc instead of solc. Some advanced Solidity patterns in OZ v5 may compile differently. Always test your vault's deposit/withdraw/share math on a zkSync testnet before mainnet deployment.", docsUrl: "https://docs.zksync.io/build/developer-reference/differences-with-ethereum" },
      { chain: "Polygon zkEVM", support: "full",    summary: "Fully compatible",                         details: "Full ERC-4626 support at EVM equivalence level.", docsUrl: "https://docs.polygon.technology/zkEVM" },
      { chain: "Linea",         support: "full",    summary: "Fully compatible",                         details: "Full ERC-4626 support.", docsUrl: "https://docs.linea.build" },
    ],
  },

  "2981": {
    ercNumber: "2981",
    notes: [
      { chain: "Arbitrum",      support: "full",    summary: "Fully compatible",                         details: "ERC-2981 is a view function interface. Works identically across all EVM chains. Marketplaces on Arbitrum (Treasure, OpenSea) honour it.", docsUrl: "https://docs.arbitrum.io" },
      { chain: "Optimism",      support: "full",    summary: "Fully compatible",                         details: "Full support. OpenSea and other marketplaces on Optimism query royaltyInfo.", docsUrl: "https://docs.optimism.io" },
      { chain: "Base",          support: "full",    summary: "Fully compatible",                         details: "Full support. Zora (Base-native) honours ERC-2981 royalties.", docsUrl: "https://docs.base.org" },
      { chain: "zkSync Era",    support: "full",    summary: "Fully compatible — royaltyInfo is a pure view function", details: "Since ERC-2981 is only a view function, it has no compatibility issues on zkSync. Any zkSync NFT marketplace that honours royalties will query it.", docsUrl: "https://docs.zksync.io" },
      { chain: "Polygon zkEVM", support: "full",    summary: "Fully compatible",                         details: "Full support.", docsUrl: "https://docs.polygon.technology/zkEVM" },
      { chain: "Linea",         support: "full",    summary: "Fully compatible",                         details: "Full support.", docsUrl: "https://docs.linea.build" },
    ],
  },

  "6551": {
    ercNumber: "6551",
    notes: [
      { chain: "Arbitrum",      support: "full",    summary: "Fully compatible — ERC-6551 registry deployed", details: "The ERC-6551 registry is deployed at the canonical address on Arbitrum. Token Bound Accounts work identically to mainnet.", docsUrl: "https://docs.tokenbound.org" },
      { chain: "Optimism",      support: "full",    summary: "Fully compatible — registry deployed",     details: "ERC-6551 registry is live on Optimism at the canonical address.", docsUrl: "https://docs.tokenbound.org" },
      { chain: "Base",          support: "full",    summary: "Fully compatible — registry deployed",     details: "ERC-6551 registry is live on Base. Given Base's gaming and NFT focus, TBAs are well-suited here.", docsUrl: "https://docs.tokenbound.org" },
      { chain: "zkSync Era",    support: "partial", summary: "Registry may not be at canonical address — verify", details: "The ERC-6551 registry uses CREATE2 to deploy at a deterministic address. Because zkSync uses a different CREATE2 formula, the canonical registry address (0x000...2521) may NOT be at the same address on zkSync.", gotcha: "Do not assume the ERC-6551 registry exists at 0x000000000000000000000000000000000000000000000000000000000000 2521 on zkSync. Check the Tokenbound docs for the zkSync-specific registry address before deploying TBAs.", docsUrl: "https://docs.tokenbound.org/contracts/deployments" },
      { chain: "Polygon zkEVM", support: "full",    summary: "Fully compatible — registry at canonical address", details: "Polygon zkEVM's EVM equivalence means the CREATE2 formula is identical to Ethereum. The canonical registry address is valid.", docsUrl: "https://docs.tokenbound.org" },
      { chain: "Linea",         support: "full",    summary: "Fully compatible",                         details: "ERC-6551 registry deployed at canonical address on Linea.", docsUrl: "https://docs.tokenbound.org" },
    ],
  },

  "1271": {
    ercNumber: "1271",
    notes: [
      { chain: "Arbitrum",      support: "full",    summary: "Fully compatible",                         details: "ERC-1271 signature validation works identically. Smart wallets on Arbitrum use it via the standard isValidSignature interface.", docsUrl: "https://docs.arbitrum.io" },
      { chain: "Optimism",      support: "full",    summary: "Fully compatible",                         details: "Full support. Used extensively by Safe (Gnosis Safe) on Optimism.", docsUrl: "https://docs.optimism.io" },
      { chain: "Base",          support: "full",    summary: "Fully compatible — core to Coinbase Smart Wallet", details: "Coinbase Smart Wallet (ERC-4337 based) on Base uses ERC-1271 for all signature validation. It is a first-class citizen on Base.", docsUrl: "https://docs.base.org" },
      { chain: "zkSync Era",    support: "partial", summary: "Supported but signature schemes differ", details: "ERC-1271's isValidSignature interface works on zkSync. However, zkSync's native AA supports multiple signature schemes (ECDSA, secp256r1, etc.). Smart accounts on zkSync may sign with different algorithms than ECDSA.", gotcha: "If your protocol verifies ERC-1271 signatures and assumes ECDSA, it may fail with zkSync native AA accounts that use alternative signature schemes like P-256 (used by passkeys). Always use the isValidSignature interface rather than hardcoding signature recovery logic.", docsUrl: "https://docs.zksync.io/build/developer-reference/account-abstraction#signature-validation" },
      { chain: "Polygon zkEVM", support: "full",    summary: "Fully compatible",                         details: "Full ERC-1271 support.", docsUrl: "https://docs.polygon.technology/zkEVM" },
      { chain: "Linea",         support: "full",    summary: "Fully compatible",                         details: "Full ERC-1271 support.", docsUrl: "https://docs.linea.build" },
    ],
  },

};

// ---------------------------------------------------------------------------
// ChainCard component
// ---------------------------------------------------------------------------
function ChainCard({ note }: { note: ChainNote }) {
  const [expanded, setExpanded] = useState(false);
  const meta = chainMeta[note.chain];
  const support = supportConfig[note.support];

  return (
    <div className={`rounded-xl border ${meta.border} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {/* Chain pill */}
        <div className={`shrink-0 rounded-lg border ${meta.border} ${meta.bg} px-2.5 py-1.5 text-center min-w-[110px]`}>
          <div className={`text-xs font-bold ${meta.color}`}>{note.chain}</div>
          <div className="text-[9px] text-muted-foreground">{meta.type}</div>
        </div>

        {/* Status */}
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${support.color} mb-0.5`}>
            {support.icon}
            {support.label}
          </div>
          <p className="text-xs text-muted-foreground truncate">{note.summary}</p>
        </div>

        {/* Gotcha warning */}
        {note.gotcha && (
          <div className="shrink-0 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
            ⚠ Gotcha
          </div>
        )}

        {expanded
          ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-border/50 p-4">
              <p className="text-sm text-foreground leading-relaxed">{note.details}</p>

              {note.gotcha && (
                <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 flex gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-orange-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-orange-400 mb-1">The Gotcha</p>
                    <p className="text-xs text-foreground leading-relaxed">{note.gotcha}</p>
                  </div>
                </div>
              )}

              {note.docsUrl && (
                <a
                  href={note.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ExternalLink className="h-3 w-3" />
                  {note.chain} docs
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface L2CompatibilityPanelProps {
  ercNumber: string;
}

const supportOrder: ChainSupport[] = ["unsupported", "native-different", "partial", "full"];

const L2CompatibilityPanel = ({ ercNumber }: L2CompatibilityPanelProps) => {
  const data = l2CompatDatabase[ercNumber];
  const [filter, setFilter] = useState<ChainSupport | "all">("all");

  if (!data) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Info className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No L2 compatibility data for ERC-{ercNumber} yet.
        </p>
        <p className="text-xs text-muted-foreground">
          This ERC is either new or has universal EVM compatibility. Check the chain docs directly.
        </p>
      </div>
    );
  }

  // Summary counts
  const counts = data.notes.reduce((acc, n) => {
    acc[n.support] = (acc[n.support] ?? 0) + 1;
    return acc;
  }, {} as Record<ChainSupport, number>);

  const hasGotchas = data.notes.some((n) => n.gotcha);
  const filtered = filter === "all" ? data.notes : data.notes.filter((n) => n.support === filter);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["full", "partial", "native-different", "unsupported"] as ChainSupport[]).map((s) => {
          const cfg = supportConfig[s];
          const count = counts[s] ?? 0;
          return (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? "all" : s)}
              className={`rounded-lg border p-3 text-center transition-all ${
                filter === s
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/20 hover:border-border/80"
              }`}
            >
              <div className={`text-xl font-bold ${cfg.color}`}>{count}</div>
              <div className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Gotcha alert */}
      {hasGotchas && (
        <div className="flex items-start gap-2.5 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-orange-400 mt-0.5" />
          <p className="text-xs text-foreground leading-relaxed">
            <span className="font-bold text-orange-400">Gotchas detected.</span>{" "}
            Some chains have non-obvious behaviour that will catch you out in production. Expand the affected chains below.
          </p>
        </div>
      )}

      {/* Chain cards — sorted: issues first */}
      <div className="space-y-2">
        {[...filtered]
          .sort((a, b) => supportOrder.indexOf(a.support) - supportOrder.indexOf(b.support))
          .map((note) => (
            <ChainCard key={note.chain} note={note} />
          ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Chain behaviour changes with upgrades. Always verify against the latest chain documentation before deploying to mainnet.
      </p>
    </div>
  );
};

export default L2CompatibilityPanel;
