import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, CheckCircle2, XCircle, Search,
  ExternalLink, ArrowRight, RotateCcw, FileCode2,
  ShieldAlert, Info, Clipboard,
} from "lucide-react";

// ---------------------------------------------------------------------------
// ERC status knowledge base
// ---------------------------------------------------------------------------
export type ERCHealth = "deprecated" | "not-recommended" | "stagnant" | "superseded" | "draft-risk" | "safe";

interface ERCHealthRecord {
  number: string;
  health: ERCHealth;
  officialStatus: string;       // e.g. "Final", "Stagnant", "Withdrawn"
  reason: string;               // Why it's problematic
  riskLevel: "critical" | "high" | "medium" | "low";
  replacement?: {
    ercNumber: string;
    label: string;
    reason: string;
  };
  eipUrl: string;
  sourceNote: string;           // Where the deprecation/warning comes from
}

const ercHealthDB: Record<string, ERCHealthRecord> = {
  "777": {
    number: "777",
    health: "not-recommended",
    officialStatus: "Final",
    riskLevel: "critical",
    reason: "Ethereum.org explicitly marks ERC-777 as 'NOT RECOMMENDED' due to its tokensReceived hook enabling reentrancy attacks. The $25M Lendf.me exploit used this exact vector. OpenZeppelin has removed ERC-777 from their contracts library.",
    replacement: {
      ercNumber: "20",
      label: "ERC-20 + ERC-1363",
      reason: "Use ERC-20 with SafeERC20 for standard transfers. Use ERC-1363 if you need the callback-on-transfer behaviour ERC-777 offered, but without the reentrancy risk.",
    },
    eipUrl: "https://eips.ethereum.org/EIPS/eip-777",
    sourceNote: "ethereum.org/developers/docs/standards — listed as '(NOT RECOMMENDED)'",
  },
  "1820": {
    number: "1820",
    health: "not-recommended",
    officialStatus: "Final",
    riskLevel: "high",
    reason: "ERC-1820 (Pseudo-introspection Registry) is tightly coupled to ERC-777. Since ERC-777 is not recommended, ERC-1820 has no remaining practical use case in modern contracts. It adds deployment complexity for zero benefit.",
    replacement: {
      ercNumber: "165",
      label: "ERC-165",
      reason: "ERC-165 is the standard, lightweight interface detection mechanism used by ERC-721, ERC-1155, and all major token standards.",
    },
    eipUrl: "https://eips.ethereum.org/EIPS/eip-1820",
    sourceNote: "Practically superseded alongside ERC-777",
  },
  "223": {
    number: "223",
    health: "stagnant",
    officialStatus: "Stagnant",
    riskLevel: "high",
    reason: "ERC-223 attempted to fix ERC-20's missing-return-value problem with a transfer callback, but stalled in draft and was never finalised. ERC-1363 solved the same problem correctly and reached Final status.",
    replacement: {
      ercNumber: "1363",
      label: "ERC-1363",
      reason: "ERC-1363 is the Final-status solution for the same problem ERC-223 tried to solve — callbacks on ERC-20 transfer without reentrancy risk.",
    },
    eipUrl: "https://eips.ethereum.org/EIPS/eip-223",
    sourceNote: "EIP status: Stagnant",
  },
  "827": {
    number: "827",
    health: "stagnant",
    officialStatus: "Stagnant",
    riskLevel: "critical",
    reason: "ERC-827 allowed arbitrary calldata to be passed with token transfers, which enabled attackers to execute arbitrary function calls from within a transfer. It was never finalised and is considered dangerous.",
    replacement: {
      ercNumber: "1363",
      label: "ERC-1363",
      reason: "ERC-1363 provides safe, constrained callbacks after token transfers without allowing arbitrary calldata execution.",
    },
    eipUrl: "https://eips.ethereum.org/EIPS/eip-827",
    sourceNote: "EIP status: Stagnant — dangerous, never finalised",
  },
  "884": {
    number: "884",
    health: "stagnant",
    officialStatus: "Stagnant",
    riskLevel: "medium",
    reason: "ERC-884 (Delaware General Corporations Law compliant token) stalled in draft. Use ERC-3643 for modern compliant security tokens with on-chain identity verification.",
    replacement: {
      ercNumber: "3643",
      label: "ERC-3643 (T-REX)",
      reason: "ERC-3643 is the actively maintained compliant security token standard used in production by major asset tokenisation projects.",
    },
    eipUrl: "https://eips.ethereum.org/EIPS/eip-884",
    sourceNote: "EIP status: Stagnant",
  },
  "948": {
    number: "948",
    health: "stagnant",
    officialStatus: "Stagnant",
    riskLevel: "medium",
    reason: "ERC-948 (subscription tokens) stalled in draft and was never finalised. Subscription logic is better implemented via ERC-20 + off-chain infrastructure or ERC-4337 paymasters.",
    replacement: {
      ercNumber: "4337",
      label: "ERC-4337 Paymasters",
      reason: "ERC-4337 paymasters can sponsor recurring gas payments, enabling subscription-like UX without a dedicated token standard.",
    },
    eipUrl: "https://eips.ethereum.org/EIPS/eip-948",
    sourceNote: "EIP status: Stagnant",
  },
  "1400": {
    number: "1400",
    health: "stagnant",
    officialStatus: "Stagnant",
    riskLevel: "medium",
    reason: "ERC-1400 (Security Token Standard) stalled. ERC-3643 (T-REX) has become the de facto compliant security token standard used in production.",
    replacement: {
      ercNumber: "3643",
      label: "ERC-3643 (T-REX)",
      reason: "ERC-3643 is actively maintained, production-tested, and used by asset managers and financial institutions for compliant tokenised securities.",
    },
    eipUrl: "https://eips.ethereum.org/EIPS/eip-1400",
    sourceNote: "EIP status: Stagnant",
  },
  "2612": {
    number: "2612",
    health: "safe",
    officialStatus: "Final",
    riskLevel: "low",
    reason: "Safe to use. ERC-2612 (permit) is Final and widely deployed. It is the recommended way to implement gasless approvals on ERC-20 tokens.",
    eipUrl: "https://eips.ethereum.org/EIPS/eip-2612",
    sourceNote: "EIP status: Final",
  },
};

// ERCs that are definitively safe — referenced for clean scan result
const SAFE_ERCS = ["20", "721", "1155", "2981", "4626", "4337", "6551", "4907", "5484", "5192", "1271", "165", "712", "1363", "3643", "2612", "7579", "6900", "4906", "7231"];

// Solidity import/interface patterns to detect ERC usage
const ERC_PATTERNS: { pattern: RegExp; ercNumber: string; label: string }[] = [
  { pattern: /ERC777|IERC777|erc-?777|eip-?777/gi,  ercNumber: "777",  label: "ERC-777" },
  { pattern: /ERC1820|IERC1820|erc-?1820|eip-?1820/gi, ercNumber: "1820", label: "ERC-1820" },
  { pattern: /ERC827|IERC827|erc-?827|eip-?827/gi,  ercNumber: "827",  label: "ERC-827" },
  { pattern: /ERC223|IERC223|erc-?223|eip-?223/gi,  ercNumber: "223",  label: "ERC-223" },
  { pattern: /ERC884|IERC884|erc-?884|eip-?884/gi,  ercNumber: "884",  label: "ERC-884" },
  { pattern: /ERC948|IERC948|erc-?948|eip-?948/gi,  ercNumber: "948",  label: "ERC-948" },
  { pattern: /ERC1400|IERC1400|erc-?1400|eip-?1400/gi, ercNumber: "1400", label: "ERC-1400" },
  // Safe ones — detected to confirm clean
  { pattern: /ERC20|IERC20/gi,  ercNumber: "20",   label: "ERC-20" },
  { pattern: /ERC721|IERC721/gi, ercNumber: "721",  label: "ERC-721" },
  { pattern: /ERC1155|IERC1155/gi, ercNumber: "1155", label: "ERC-1155" },
  { pattern: /ERC4626|IERC4626/gi, ercNumber: "4626", label: "ERC-4626" },
  { pattern: /ERC1363|IERC1363/gi, ercNumber: "1363", label: "ERC-1363" },
  { pattern: /ERC2612|IERC2612/gi, ercNumber: "2612", label: "ERC-2612" },
  { pattern: /ERC165|IERC165/gi, ercNumber: "165", label: "ERC-165" },
  { pattern: /ERC2981|IERC2981/gi, ercNumber: "2981", label: "ERC-2981" },
  { pattern: /ERC4907|IERC4907/gi, ercNumber: "4907", label: "ERC-4907" },
];

// ---------------------------------------------------------------------------
// Scan logic
// ---------------------------------------------------------------------------
interface ScanHit {
  ercNumber: string;
  label: string;
  count: number;
  lines: number[];
  health: ERCHealthRecord | null;
  isSafe: boolean;
}

function scanSolidity(code: string): ScanHit[] {
  const hits: Map<string, ScanHit> = new Map();
  const lines = code.split("\n");

  for (const { pattern, ercNumber, label } of ERC_PATTERNS) {
    const matchLines: number[] = [];
    let totalCount = 0;

    lines.forEach((line, idx) => {
      const matches = line.match(new RegExp(pattern.source, "gi"));
      if (matches) {
        totalCount += matches.length;
        matchLines.push(idx + 1);
      }
    });

    if (totalCount > 0 && !hits.has(ercNumber)) {
      const health = ercHealthDB[ercNumber] ?? null;
      const isSafe = SAFE_ERCS.includes(ercNumber) && !health;
      hits.set(ercNumber, { ercNumber, label, count: totalCount, lines: matchLines.slice(0, 5), health, isSafe });
    }
  }

  // Sort: issues first, then safe
  return [...hits.values()].sort((a, b) => {
    const aRisk = a.health?.riskLevel;
    const bRisk = b.health?.riskLevel;
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    if (aRisk && bRisk) return order[aRisk] - order[bRisk];
    if (aRisk && !bRisk) return -1;
    if (!aRisk && bRisk) return 1;
    return 0;
  });
}

// ---------------------------------------------------------------------------
// UI config
// ---------------------------------------------------------------------------
const healthConfig: Record<ERCHealth, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  deprecated:       { label: "Deprecated",       color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",    icon: <XCircle className="h-4 w-4" /> },
  "not-recommended": { label: "Not Recommended", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", icon: <ShieldAlert className="h-4 w-4" /> },
  stagnant:         { label: "Stagnant",         color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: <AlertTriangle className="h-4 w-4" /> },
  superseded:       { label: "Superseded",       color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: <AlertTriangle className="h-4 w-4" /> },
  "draft-risk":     { label: "Draft Risk",       color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",   icon: <Info className="h-4 w-4" /> },
  safe:             { label: "Safe",             color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30",  icon: <CheckCircle2 className="h-4 w-4" /> },
};

const EXAMPLE_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/utils/introspection/ERC1820Implementer.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Example contract using ERC-777 (not recommended!)
contract MyToken is ERC777 {
    constructor(
        uint256 initialSupply,
        address[] memory defaultOperators
    ) ERC777("MyToken", "MTK", defaultOperators) {
        _mint(msg.sender, initialSupply, "", "");
    }
}`;

// ---------------------------------------------------------------------------
// ResultCard
// ---------------------------------------------------------------------------
function ResultCard({ hit }: { hit: ScanHit }) {
  if (hit.isSafe || (hit.health?.health === "safe")) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
        <code className="font-mono text-sm text-green-400">{hit.label}</code>
        <span className="text-xs text-muted-foreground">— Safe to use</span>
        <span className="ml-auto text-xs text-muted-foreground/50">
          {hit.count} reference{hit.count !== 1 ? "s" : ""}
        </span>
      </div>
    );
  }

  if (!hit.health) return null;

  const cfg = healthConfig[hit.health.health];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}
    >
      {/* Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 shrink-0 ${cfg.color}`}>{cfg.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <code className={`font-mono text-sm font-bold ${cfg.color}`}>{hit.label}</code>
              <span className={`rounded-full border ${cfg.border} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>
                {cfg.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {hit.count} reference{hit.count !== 1 ? "s" : ""} · lines {hit.lines.join(", ")}
                {hit.lines.length < hit.count ? "…" : ""}
              </span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{hit.health.reason}</p>
          </div>
        </div>

        {/* Source */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3 w-3 shrink-0" />
          <span>{hit.health.sourceNote}</span>
          <a
            href={hit.health.eipUrl}
            target="_blank" rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
          >
            EIP-{hit.ercNumber} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Replacement */}
      {hit.health.replacement && (
        <div className="border-t border-border/40 bg-background/40 p-4 flex items-start gap-3">
          <ArrowRight className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground mb-0.5">
              Replace with{" "}
              <code className="font-mono text-green-400">ERC-{hit.health.replacement.ercNumber}</code>
              {" "}({hit.health.replacement.label})
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{hit.health.replacement.reason}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const DeprecatedERCScanner = () => {
  const [code, setCode] = useState("");
  const [results, setResults] = useState<ScanHit[] | null>(null);
  const [scanning, setScanning] = useState(false);

  const handleScan = useCallback(() => {
    if (!code.trim()) return;
    setScanning(true);
    setTimeout(() => {
      setResults(scanSolidity(code));
      setScanning(false);
    }, 400);
  }, [code]);

  const handleReset = () => {
    setCode("");
    setResults(null);
  };

  const handleExample = () => {
    setCode(EXAMPLE_CODE);
    setResults(null);
  };

  const issues  = results?.filter((r) => r.health && r.health.health !== "safe") ?? [];
  const safe    = results?.filter((r) => r.isSafe || r.health?.health === "safe") ?? [];
  const hasIssues = issues.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8 px-4">

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Deprecated ERC Scanner</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Paste your Solidity contract code. The scanner detects deprecated, stagnant, and not-recommended
          ERC standards — before you ship them to production.
        </p>
      </div>

      {/* Input area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Solidity Code
          </label>
          <button
            onClick={handleExample}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Clipboard className="h-3.5 w-3.5" />
            Load example
          </button>
        </div>
        <div className="relative rounded-xl border border-border overflow-hidden focus-within:border-primary/50 transition-colors">
          <textarea
            value={code}
            onChange={(e) => { setCode(e.target.value); setResults(null); }}
            placeholder={`// Paste your Solidity contract here...\n\npragma solidity ^0.8.20;\n\nimport "@openzeppelin/contracts/token/ERC777/ERC777.sol";`}
            rows={16}
            spellCheck={false}
            className="w-full resize-none bg-background p-4 font-mono text-xs text-muted-foreground placeholder:text-muted-foreground/30 focus:outline-none"
          />
          {code && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
              {code.split("\n").length} lines
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleScan}
          disabled={!code.trim() || scanning}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {scanning
            ? <><span className="animate-spin">⟳</span> Scanning…</>
            : <><Search className="h-4 w-4" /> Scan for Deprecated ERCs</>}
        </button>
        {(code || results) && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        )}
      </div>

      {/* Results */}
      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Summary banner */}
            <div className={`rounded-xl border p-4 ${
              hasIssues
                ? "border-orange-500/30 bg-orange-500/10"
                : "border-green-500/30 bg-green-500/10"
            }`}>
              <div className="flex items-center gap-3">
                {hasIssues
                  ? <ShieldAlert className="h-5 w-5 text-orange-400 shrink-0" />
                  : <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />}
                <div>
                  <p className={`text-sm font-bold ${hasIssues ? "text-orange-400" : "text-green-400"}`}>
                    {hasIssues
                      ? `${issues.length} deprecated or risky ERC${issues.length !== 1 ? "s" : ""} detected`
                      : results.length === 0
                      ? "No ERC patterns detected in this code"
                      : "All detected ERCs are current and safe"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {results.length} ERC{results.length !== 1 ? "s" : ""} found · {safe.length} safe · {issues.length} flagged
                  </p>
                </div>
              </div>
            </div>

            {/* Issues */}
            {issues.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  ⚠ Flagged Standards
                </p>
                {issues.map((hit) => (
                  <ResultCard key={hit.ercNumber} hit={hit} />
                ))}
              </div>
            )}

            {/* Safe */}
            {safe.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  ✓ Safe Standards
                </p>
                {safe.map((hit) => (
                  <ResultCard key={hit.ercNumber} hit={hit} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {results.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-border py-12 text-center">
                <FileCode2 className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No ERC references found in this code.</p>
                <p className="text-xs text-muted-foreground/60 max-w-xs">
                  The scanner looks for ERC contract names and imports (e.g. ERC777, IERC20). Make sure your code includes standard import paths or interface names.
                </p>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground/50 text-center px-4">
              Static pattern matching only — does not execute or compile code. Always run a full audit before mainnet deployment.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeprecatedERCScanner;