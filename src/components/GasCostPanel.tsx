import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Fuel, TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp, Info } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type GasTier = "cheap" | "moderate" | "expensive" | "very-expensive";

export interface GasOperation {
  name: string;             // e.g. "transfer()"
  gasUnits: number;         // benchmark gas units
  notes: string;            // context on why it costs this much
  tip?: string;             // gas-saving tip
  tier: GasTier;
}

export interface GasAlternative {
  ercNumber: string;
  label: string;            // e.g. "ERC-1155 batch (10 items)"
  gasUnits: number;
  savingPercent: number;    // vs the primary ERC's most expensive op
}

export interface GasData {
  ercNumber: string;
  deployGas: number;
  operations: GasOperation[];
  alternatives?: GasAlternative[];
  verdict: string;          // one-line gas efficiency summary
}

// ---------------------------------------------------------------------------
// Gas database — sourced from:
//  - RareSkills benchmarks
//  - Alchemy ERC721A article (measured via hardhat)
//  - MetaMask docs
//  - ERC1155D paper (Medium / DonkeVerse)
//  - OpenZeppelin gas reporter
// ---------------------------------------------------------------------------
export const gasDatabase: Record<string, GasData> = {

  "20": {
    ercNumber: "20",
    deployGas: 1_200_000,
    verdict: "Very gas-efficient for transfers. The cheapest way to move value on Ethereum.",
    operations: [
      { name: "transfer()",        gasUnits: 51_000,  tier: "cheap",     notes: "Standard ERC-20 transfer. ~50k gas is the benchmark across USDC, DAI, and most tokens.", tip: "Use transferFrom with a permit (ERC-2612) to save the approval tx entirely." },
      { name: "approve()",         gasUnits: 46_000,  tier: "cheap",     notes: "Required before transferFrom. Costs ~45k gas. ERC-2612 permit() eliminates this transaction entirely.", tip: "Implement ERC-2612 to replace approve() + transferFrom() with a single gasless signature." },
      { name: "transferFrom()",    gasUnits: 64_000,  tier: "cheap",     notes: "Called by spenders after approval. Slightly more expensive than transfer() due to allowance check.", tip: "Use SafeERC20.safeTransferFrom() to handle non-standard tokens safely." },
      { name: "mint() (new addr)", gasUnits: 68_000,  tier: "cheap",     notes: "Minting to a new address costs more due to storage slot initialization (20k for new slot)." },
      { name: "mint() (existing)", gasUnits: 48_000,  tier: "cheap",     notes: "Minting to an existing holder is cheaper — no new storage slot needed." },
      { name: "burn()",            gasUnits: 30_000,  tier: "cheap",     notes: "Burning reclaims storage (SSTORE to zero), which provides a gas refund." },
    ],
    alternatives: [
      { ercNumber: "1155", label: "ERC-1155 single transfer", gasUnits: 50_000, savingPercent: 2 },
      { ercNumber: "1155", label: "ERC-1155 batch (10 tokens)", gasUnits: 90_000, savingPercent: 65 },
    ],
  },

  "721": {
    ercNumber: "721",
    deployGas: 2_100_000,
    verdict: "Moderate cost per operation. Each token is a unique storage write. Batch minting via ERC-721A can cut costs by 5-10x.",
    operations: [
      { name: "mint() — OZ ERC721",       gasUnits: 104_000, tier: "moderate",       notes: "OpenZeppelin ERC721Enumerable mint. Measured via Hardhat: 104,138 gas for first mint.", tip: "Switch to ERC-721A for batch minting — 5 mints for the price of 1 OZ mint." },
      { name: "mint() — ERC721A (×1)",    gasUnits: 93_000,  tier: "moderate",       notes: "Azuki's ERC721A single mint. Saves ~10k vs OZ baseline.", tip: "ERC-721A's real advantage is batch: mint 5 NFTs for 103,736 gas total (vs 566,090 with OZ)." },
      { name: "mint() — ERC721A (×5)",    gasUnits: 103_000, tier: "moderate",       notes: "ERC721A minting 5 NFTs costs barely more than minting 1. Azuki's key innovation.", tip: "Always use ERC-721A for collections with batch minting." },
      { name: "safeTransferFrom()",       gasUnits: 85_000,  tier: "moderate",       notes: "Transfer with onERC721Received callback. More expensive than transferFrom due to external call.", tip: "Use transferFrom() instead of safeTransferFrom() when sending to EOAs — saves ~5-10k gas." },
      { name: "transferFrom()",           gasUnits: 75_000,  tier: "moderate",       notes: "Standard transfer without receiver callback. Cheaper than safeTransferFrom.", tip: "Only use this when you're certain the recipient is an EOA, not a contract." },
      { name: "approve()",                gasUnits: 48_000,  tier: "cheap",          notes: "Per-token approval. Must be called before any marketplace can list your NFT." },
      { name: "setApprovalForAll()",      gasUnits: 45_000,  tier: "cheap",          notes: "Approve all tokens for an operator (e.g. OpenSea). One-time cost per operator." },
    ],
    alternatives: [
      { ercNumber: "1155", label: "ERC-1155 single mint",      gasUnits: 58_000,  savingPercent: 44 },
      { ercNumber: "1155", label: "ERC-1155 batch mint (×10)", gasUnits: 115_000, savingPercent: 78 },
    ],
  },

  "1155": {
    ercNumber: "1155",
    deployGas: 2_400_000,
    verdict: "The most gas-efficient NFT standard. Batch transfers and mints can save 60-90% vs ERC-721.",
    operations: [
      { name: "mint() single",              gasUnits: 58_000,  tier: "cheap",    notes: "Single ERC-1155 mint is ~44% cheaper than OZ ERC-721 mint.", tip: "Use batch minting whenever possible — the gas saving compounds with each additional token." },
      { name: "mintBatch() ×10",            gasUnits: 115_000, tier: "cheap",    notes: "10 tokens minted in one tx. Would cost ~1,040,000 gas with ERC-721 OZ. That's an 89% saving.", tip: "Batch minting is ERC-1155's killer feature. Always mint in batches for gas drops." },
      { name: "safeTransferFrom()",         gasUnits: 50_000,  tier: "cheap",    notes: "Single token transfer. Similar cost to ERC-20, much cheaper than ERC-721 per-token.", tip: "Even single transfers are cheaper than ERC-721 due to simpler balance accounting." },
      { name: "safeBatchTransferFrom() ×10",gasUnits: 90_000,  tier: "cheap",    notes: "10 different token IDs transferred in one transaction. Would cost ~850k gas with ERC-721.", tip: "Batch transfers are the reason gaming projects choose ERC-1155 over ERC-721." },
      { name: "setApprovalForAll()",        gasUnits: 46_000,  tier: "cheap",    notes: "Approve an operator for all token IDs. Same cost as ERC-721." },
      { name: "balanceOfBatch()",           gasUnits: 5_000,   tier: "cheap",    notes: "Read-only. Check balances for multiple token IDs in one call. No gas on-chain (view).", tip: "Use balanceOfBatch to reduce frontend RPC calls when checking multi-token balances." },
    ],
    alternatives: [
      { ercNumber: "721",  label: "ERC-721 single mint (OZ)",  gasUnits: 104_000, savingPercent: -79 },
    ],
  },

  "4626": {
    ercNumber: "4626",
    deployGas: 2_800_000,
    verdict: "High gas costs due to vault math and state writes. Optimize by batching deposits where possible.",
    operations: [
      { name: "deposit()",      gasUnits: 120_000, tier: "moderate",       notes: "Deposit assets and receive shares. Includes ERC-20 transfer + share mint + vault state update.", tip: "Batch small deposits off-chain using a router contract if your vault handles many small depositors." },
      { name: "withdraw()",     gasUnits: 130_000, tier: "moderate",       notes: "Withdraw assets by burning shares. Slightly more expensive than deposit due to share conversion math.", tip: "Avoid frequent small withdrawals — the math overhead is fixed regardless of amount." },
      { name: "mint()",         gasUnits: 125_000, tier: "moderate",       notes: "Mint exact number of shares. Requires previewMint() calculation, slightly more expensive than deposit()." },
      { name: "redeem()",       gasUnits: 125_000, tier: "moderate",       notes: "Redeem exact shares for assets. Similar gas profile to withdraw()." },
      { name: "totalAssets()",  gasUnits: 3_000,   tier: "cheap",          notes: "View function. Free off-chain, minimal on-chain gas when called from another contract." },
      { name: "convertToShares()", gasUnits: 3_500, tier: "cheap",         notes: "View function for share calculation. Used by frontends to preview deposit outcomes." },
    ],
  },

  "4337": {
    ercNumber: "4337",
    deployGas: 3_200_000,
    verdict: "ERC-4337 adds significant overhead vs standard EOA transactions. Worth it for UX gains (gasless, batched ops), but not cheap.",
    operations: [
      { name: "UserOp — simple ETH send",         gasUnits: 200_000, tier: "expensive",      notes: "A basic ETH transfer via ERC-4337 costs ~4-5x more than a standard EOA tx (21k gas). The bundler, EntryPoint, and validation all add overhead.", tip: "Don't use ERC-4337 for simple ETH transfers where EOA is an option. The UX benefit must justify the cost." },
      { name: "UserOp — ERC-20 transfer",         gasUnits: 240_000, tier: "expensive",      notes: "ERC-20 transfer via smart account. Includes validation, execution, and bundler overhead on top of the ~51k base transfer.", tip: "Batch multiple operations into one UserOp using multicall to amortise the fixed overhead." },
      { name: "UserOp — batch (3 operations)",    gasUnits: 300_000, tier: "expensive",      notes: "3 operations in one UserOp costs far less than 3 separate UserOps. Batching is the key to making AA economical.", tip: "Always batch operations. The per-UserOp overhead (~150k) is fixed — more operations per UserOp = lower cost per op." },
      { name: "Smart account deployment",         gasUnits: 350_000, tier: "very-expensive", notes: "First UserOp from a new smart account includes account deployment. Only paid once per account.", tip: "Use counterfactual deployment — the account address is predictable before deployment, so users can receive funds before paying this cost." },
      { name: "Paymaster validation",             gasUnits: 50_000,  tier: "moderate",       notes: "Additional cost when using a paymaster for gasless transactions. The paymaster must also validate and stake.", tip: "Cache paymaster approvals where possible. Use a token paymaster to let users pay gas in ERC-20s." },
    ],
  },

  "2981": {
    ercNumber: "2981",
    deployGas: 400_000,
    verdict: "Essentially free. It's a pure view function — royaltyInfo() is only called off-chain by marketplaces.",
    operations: [
      { name: "royaltyInfo() — view",    gasUnits: 2_500, tier: "cheap", notes: "Pure view function. Called by marketplaces off-chain to determine royalty amounts. Zero gas cost to callers." },
      { name: "_setDefaultRoyalty()",    gasUnits: 45_000, tier: "cheap", notes: "One-time setup call during deployment or by owner. Writes royalty receiver + fee to storage." },
      { name: "_setTokenRoyalty()",      gasUnits: 46_000, tier: "cheap", notes: "Per-token royalty override. Only needed if different tokens have different royalty rates." },
    ],
  },

  "6551": {
    ercNumber: "6551",
    deployGas: 1_800_000,
    verdict: "Account creation is expensive (one-time). Subsequent TBA transactions cost the same as regular smart wallet operations.",
    operations: [
      { name: "createAccount() — registry",    gasUnits: 190_000, tier: "expensive",   notes: "Deploys a new Token Bound Account via the ERC-6551 registry. One-time cost per NFT. Uses CREATE2.", tip: "Only deploy the TBA when the user actually needs to use it. The address is predictable (counterfactual) before deployment." },
      { name: "TBA execute() — ETH send",      gasUnits: 85_000,  tier: "moderate",    notes: "Executing a transaction from a TBA (forwarding ETH). More expensive than EOA due to contract overhead.", tip: "Batch multiple TBA operations using multicall to reduce per-operation cost." },
      { name: "TBA execute() — ERC-20 xfer",  gasUnits: 120_000, tier: "moderate",     notes: "ERC-20 transfer from a TBA. Includes proxy forwarding overhead on top of the standard ~51k transfer.", tip: "Consider whether your use case truly needs TBA vs a simpler delegated execution pattern." },
      { name: "account() — view",              gasUnits: 3_000,   tier: "cheap",        notes: "Compute the deterministic TBA address. View function — free off-chain." },
    ],
  },

  "1271": {
    ercNumber: "1271",
    deployGas: 800_000,
    verdict: "Near-zero runtime cost. isValidSignature() is a view function. The wallet deployment is a one-time cost.",
    operations: [
      { name: "isValidSignature() — ECDSA",  gasUnits: 10_000, tier: "cheap", notes: "Standard ECDSA validation inside isValidSignature(). Called by verifying contracts (e.g. Seaport, Permit2).", tip: "Keep validation logic simple — avoid storage reads inside isValidSignature() as it's called frequently." },
      { name: "isValidSignature() — Multisig", gasUnits: 40_000, tier: "cheap", notes: "Multi-sig validation (e.g. Safe's 2/3 threshold). More expensive per additional signer." },
    ],
  },

  "20-2612": {
    ercNumber: "20",
    deployGas: 1_400_000,
    verdict: "ERC-2612 eliminates the approve() transaction entirely — saving users one full transaction per interaction.",
    operations: [
      { name: "permit() — off-chain sig",    gasUnits: 0,      tier: "cheap",   notes: "Signing happens off-chain — zero gas. The signed permit is submitted with the transferFrom call.", tip: "Replace every approve() + transferFrom() pattern with permit() + transferFrom() to halve user gas costs." },
      { name: "transferFrom() with permit",  gasUnits: 70_000, tier: "cheap",   notes: "The permit is verified inside transferFrom(). One transaction does what approve() + transferFrom() used to do in two.", tip: "Users save one full transaction (~46k gas) every time they interact with your protocol." },
    ],
  },

};

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
const tierConfig: Record<GasTier, { color: string; bg: string; label: string; bar: string }> = {
  "cheap":          { color: "text-green-400",  bg: "bg-green-500/10",  label: "Cheap",         bar: "bg-green-400" },
  "moderate":       { color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Moderate",      bar: "bg-yellow-400" },
  "expensive":      { color: "text-orange-400", bg: "bg-orange-500/10", label: "Expensive",     bar: "bg-orange-400" },
  "very-expensive": { color: "text-red-400",    bg: "bg-red-500/10",    label: "Very Expensive", bar: "bg-red-400" },
};

const tierOrder: GasTier[] = ["cheap", "moderate", "expensive", "very-expensive"];

function barWidth(gasUnits: number, maxGas: number): number {
  return Math.max(4, Math.min(100, (gasUnits / maxGas) * 100));
}

function formatGas(n: number): string {
  if (n === 0) return "0 (off-chain)";
  return n.toLocaleString();
}

function formatUSD(gasUnits: number, gweiPrice: number, ethUsd: number): string {
  if (gasUnits === 0) return "$0.00";
  const eth = (gasUnits * gweiPrice * 1e-9);
  const usd = eth * ethUsd;
  if (usd < 0.01) return "< $0.01";
  return `$${usd.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// OperationRow
// ---------------------------------------------------------------------------
function OperationRow({
  op,
  maxGas,
  gweiPrice,
  ethUsd,
}: {
  op: GasOperation;
  maxGas: number;
  gweiPrice: number;
  ethUsd: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = tierConfig[op.tier];

  return (
    <div className={`rounded-lg border border-border overflow-hidden transition-colors hover:border-border/80`}>
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        {/* Function name */}
        <code className="flex-1 min-w-0 truncate font-mono text-xs text-primary">{op.name}</code>

        {/* Gas bar */}
        <div className="hidden sm:flex items-center gap-2 w-32 shrink-0">
          <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${barWidth(op.gasUnits, maxGas)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full ${cfg.bar}`}
            />
          </div>
        </div>

        {/* Gas units */}
        <span className="text-xs font-mono text-muted-foreground w-20 text-right shrink-0">
          {formatGas(op.gasUnits)}
        </span>

        {/* USD */}
        <span className={`text-xs font-semibold w-16 text-right shrink-0 ${cfg.color}`}>
          {formatUSD(op.gasUnits, gweiPrice, ethUsd)}
        </span>

        {/* Tier badge */}
        <span className={`hidden sm:inline text-[9px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 shrink-0 ${cfg.color} ${cfg.bg}`}>
          {cfg.label}
        </span>

        {expanded
          ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="border-t border-border/50 px-4 py-3 space-y-2"
        >
          <p className="text-xs text-muted-foreground leading-relaxed">{op.notes}</p>
          {op.tip && (
            <div className="flex items-start gap-2 rounded-md border border-green-500/20 bg-green-500/5 px-3 py-2">
              <TrendingDown className="h-3.5 w-3.5 shrink-0 text-green-400 mt-0.5" />
              <p className="text-xs text-green-400 leading-relaxed">{op.tip}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main GasCostPanel
// ---------------------------------------------------------------------------
interface GasCostPanelProps {
  ercNumber: string;
}

const GasCostPanel = ({ ercNumber }: GasCostPanelProps) => {
  const [gweiPrice, setGweiPrice] = useState(20);
  const [ethUsd, setEthUsd] = useState(3000);

  const data = gasDatabase[ercNumber];

  const maxGas = useMemo(() =>
    data ? Math.max(...data.operations.map((o) => o.gasUnits), 1) : 1,
  [data]);

  const totalDeployUsd = data
    ? formatUSD(data.deployGas, gweiPrice, ethUsd)
    : "$—";

  if (!data) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Fuel className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No gas data available for ERC-{ercNumber} yet.</p>
        <a
          href="https://www.evm.codes/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline underline-offset-2"
        >
          Check evm.codes for opcode gas costs ↗
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Verdict */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Fuel className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gas Verdict</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{data.verdict}</p>
      </div>

      {/* Live calculator */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Calculator</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Gas price (gwei)</label>
            <div className="flex items-center gap-2">
              <input
                type="range" min={1} max={200} value={gweiPrice}
                onChange={(e) => setGweiPrice(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-xs font-mono text-primary w-10 text-right">{gweiPrice}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">ETH price (USD)</label>
            <div className="flex items-center gap-2">
              <input
                type="range" min={500} max={10000} step={100} value={ethUsd}
                onChange={(e) => setEthUsd(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-xs font-mono text-primary w-16 text-right">${ethUsd.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Deploy cost */}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2">
          <span className="text-xs text-muted-foreground">Deploy contract</span>
          <div className="text-right">
            <span className="text-xs font-mono text-muted-foreground">{data.deployGas.toLocaleString()} gas</span>
            <span className="ml-3 text-sm font-bold text-foreground">{totalDeployUsd}</span>
          </div>
        </div>
      </div>

      {/* Operations table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operations</p>
          <div className="hidden sm:flex items-center gap-4 text-[10px] text-muted-foreground/60">
            <span className="w-32 text-center">Cost</span>
            <span className="w-20 text-right">Gas units</span>
            <span className="w-16 text-right">USD</span>
            <span className="w-20 text-right">Tier</span>
          </div>
        </div>
        {[...data.operations]
          .sort((a, b) => tierOrder.indexOf(b.tier) - tierOrder.indexOf(a.tier))
          .map((op) => (
            <OperationRow key={op.name} op={op} maxGas={maxGas} gweiPrice={gweiPrice} ethUsd={ethUsd} />
          ))}
      </div>

      {/* Alternatives */}
      {data.alternatives && data.alternatives.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Cheaper Alternatives
          </p>
          {data.alternatives.map((alt) => (
            <div key={alt.label} className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
              <code className="font-mono text-xs text-primary shrink-0">ERC-{alt.ercNumber}</code>
              <span className="text-xs text-muted-foreground flex-1">{alt.label}</span>
              <span className="text-xs font-mono text-muted-foreground">{alt.gasUnits.toLocaleString()} gas</span>
              <span className="text-xs font-mono">{formatUSD(alt.gasUnits, gweiPrice, ethUsd)}</span>
              {alt.savingPercent > 0 ? (
                <span className="flex items-center gap-1 text-xs font-bold text-green-400">
                  <TrendingDown className="h-3.5 w-3.5" />
                  {alt.savingPercent}% cheaper
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-orange-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {Math.abs(alt.savingPercent)}% more
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground/60">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <p>Gas units are benchmarks from hardhat tests and published research. Actual costs vary with contract state, calldata size, and network conditions.</p>
      </div>
    </div>
  );
};

export default GasCostPanel;
