import { useMemo, useState } from "react";
import { ERCData } from "@/data/ercData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, AlertCircle, GitMerge } from "lucide-react";
import { motion } from "framer-motion";

export type CompatResult = "required" | "compatible" | "caution" | "incompatible" | "n/a";

interface CompatibilityMatrixProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ercs: ERCData[];
}

type Rule = { result: CompatResult; note: string };

const rules: Record<string, Rule> = {
  "20:2612":   { result: "required",     note: "ERC-2612 is a direct extension of ERC-20 (adds permit for gasless approvals). Always use together." },
  "721:2981":  { result: "required",     note: "ERC-2981 is the standard royalty extension for ERC-721 NFTs." },
  "1155:2981": { result: "required",     note: "ERC-2981 is the standard royalty extension for ERC-1155 multi-tokens." },
  "4337:1271": { result: "required",     note: "Account Abstraction smart wallets must implement ERC-1271 for off-chain signature validation." },
  "721:165":   { result: "required",     note: "ERC-721 mandates ERC-165 for interface detection — they are inseparable." },
  "1155:165":  { result: "required",     note: "ERC-1155 mandates ERC-165 for interface detection." },
  "20:4626":   { result: "required",     note: "ERC-4626 tokenized vaults wrap an ERC-20 asset and issue ERC-20 shares." },
  "721:6551":  { result: "required",     note: "ERC-6551 Token Bound Accounts are always anchored to an ERC-721 token." },
  "721:4907":  { result: "compatible",   note: "ERC-4907 adds a user/rental role on top of ERC-721. Very common pairing." },
  "721:5484":  { result: "compatible",   note: "ERC-5484 restricts transfer on ERC-721 to create soulbound tokens." },
  "721:5192":  { result: "compatible",   note: "ERC-5192 adds a minimal locked flag to ERC-721 for simpler soulbound use." },
  "721:5007":  { result: "compatible",   note: "ERC-5007 adds time-based validity windows to ERC-721 tokens." },
  "4337:6900": { result: "compatible",   note: "ERC-6900 is the modular plugin specification built on top of ERC-4337." },
  "4337:7579": { result: "compatible",   note: "ERC-7579 is a leaner alternative module spec for ERC-4337 accounts." },
  "20:1363":   { result: "compatible",   note: "ERC-1363 extends ERC-20 with transferAndCall hooks for payable token flows." },
  "20:777":    { result: "compatible",   note: "ERC-777 is a superset of ERC-20 with hooks. Mostly superseded by ERC-1363." },
  "721:3525":  { result: "compatible",   note: "ERC-3525 semi-fungible tokens extend ERC-721 identity with a value field." },
  "5484:4907": { result: "caution",      note: "Soulbound (non-transferable) conflicts with rental mechanics — rental requires transfer or user delegation." },
  "5192:4907": { result: "caution",      note: "Locked tokens (5192) cannot be transferred, which may block rental assignment." },
  "777:4626":  { result: "caution",      note: "ERC-777 hooks can trigger reentrancy in vault contexts. Prefer plain ERC-20." },
  "6900:7579": { result: "caution",      note: "ERC-6900 and ERC-7579 are competing module standards — implement only one." },
  "5484:5192": { result: "incompatible", note: "Both implement soulbound locking mechanisms — redundant and likely conflicting." },
  "20:721":    { result: "incompatible", note: "Fundamentally different token models. Use ERC-1155 if you need both fungible and non-fungible in one contract." },
};

function getRule(a: string, b: string): Rule {
  return rules[`${a}:${b}`] ?? rules[`${b}:${a}`] ?? { result: "n/a", note: "No specific compatibility data available for this pair." };
}

const cellStyles: Record<CompatResult, { bg: string; text: string; icon: React.ReactNode }> = {
  required:     { bg: "bg-green-500/20",  text: "text-green-400",  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  compatible:   { bg: "bg-blue-500/15",   text: "text-blue-400",   icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  caution:      { bg: "bg-yellow-500/15", text: "text-yellow-400", icon: <AlertCircle  className="h-3.5 w-3.5" /> },
  incompatible: { bg: "bg-red-500/15",    text: "text-red-400",    icon: <XCircle      className="h-3.5 w-3.5" /> },
  "n/a":        { bg: "bg-secondary/20",  text: "text-muted-foreground/20", icon: <span className="text-[10px]">—</span> },
};

const resultLabel: Record<CompatResult, string> = {
  required:     "Required pair",
  compatible:   "Compatible",
  caution:      "Use with caution",
  incompatible: "Incompatible",
  "n/a":        "No data",
};

const MATRIX_ERCS = ["20","721","1155","4626","4337","2981","6551","4907","5484","1271","165","777","1363","6900","7579","5192","5007","3525"];

const CompatibilityMatrix = ({ open, onOpenChange, ercs }: CompatibilityMatrixProps) => {
  const [active, setActive] = useState<{ a: string; b: string; rule: Rule } | null>(null);

  const ercNumbers = useMemo(() => {
    const dbNumbers = new Set(ercs.map((e) => e.number));
    return MATRIX_ERCS.filter((n) => dbNumbers.has(n));
  }, [ercs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-auto border-border bg-card sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <GitMerge className="h-5 w-5 text-primary" />
            ERC Compatibility Matrix
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Click any cell to see why two standards work together, require each other, or conflict.
          </p>
        </DialogHeader>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs border-b border-border pb-3">
          {(["required","compatible","caution","incompatible"] as CompatResult[]).map((r) => (
            <div key={r} className={`flex items-center gap-1.5 ${cellStyles[r].text}`}>
              {cellStyles[r].icon}
              <span className="text-muted-foreground">{resultLabel[r]}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="w-20 p-1" />
                {ercNumbers.map((n) => (
                  <th key={n} className="p-0.5">
                    <div className="flex items-end justify-center h-16">
                      <span
                        className="font-mono font-bold text-primary text-[9px] leading-tight"
                        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                      >
                        ERC-{n}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ercNumbers.map((rowNum) => (
                <tr key={rowNum}>
                  <td className="p-1 pr-3 text-right font-mono font-bold text-primary text-[9px] whitespace-nowrap">
                    ERC-{rowNum}
                  </td>
                  {ercNumbers.map((colNum) => {
                    if (rowNum === colNum) {
                      return (
                        <td key={colNum} className="p-0.5">
                          <div className="h-7 w-7 rounded bg-border/40 flex items-center justify-center">
                            <span className="text-border text-[8px]">◼</span>
                          </div>
                        </td>
                      );
                    }
                    const rule = getRule(rowNum, colNum);
                    const style = cellStyles[rule.result];
                    const isActive = active?.a === rowNum && active?.b === colNum;
                    return (
                      <td key={colNum} className="p-0.5">
                        <motion.button
                          whileHover={{ scale: 1.2 }}
                          onClick={() => setActive(isActive ? null : { a: rowNum, b: colNum, rule })}
                          className={`h-7 w-7 rounded flex items-center justify-center transition-all ${style.bg} ${style.text} ${
                            isActive ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-white/20"
                          }`}
                        >
                          {style.icon}
                        </motion.button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-border bg-background p-4 space-y-2"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-primary">ERC-{active.a}</span>
              <span className="text-muted-foreground text-sm">×</span>
              <span className="font-mono text-sm font-bold text-primary">ERC-{active.b}</span>
              <span className={`ml-auto flex items-center gap-1.5 text-xs font-semibold ${cellStyles[active.rule.result].text}`}>
                {cellStyles[active.rule.result].icon}
                {resultLabel[active.rule.result]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{active.rule.note}</p>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CompatibilityMatrix;