import { useState } from "react";
import { ERCData, categoryColors } from "@/data/ercData";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lightbulb, Wrench, Link2, Sparkles, Code2, Copy, Check, BookOpen, ShieldAlert, Globe, Fuel } from "lucide-react";
import SecurityPanel, { securityDatabase } from "@/components/SecurityPanel";
import L2CompatibilityPanel, { l2CompatDatabase } from "@/components/L2CompatibilityPanel";
import GasCostPanel, { gasDatabase } from "@/components/GasCostPanel";

interface ERCDetailProps {
  erc: ERCData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Solidity interfaces
// ---------------------------------------------------------------------------
const solidityInterfaces: Record<string, string> = {
  "20": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}`,
  "721": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC721 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}`,
  "1155": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC1155 {
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory);
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address account, address operator) external view returns (bool);
    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data) external;
    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) external;
}`,
  "2981": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC2981 {
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external view returns (address receiver, uint256 royaltyAmount);
}`,
  "4626": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC4626 {
    event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
    function asset() external view returns (address);
    function totalAssets() external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function mint(uint256 shares, address receiver) external returns (uint256 assets);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
}`,
  "4907": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC4907 {
    event UpdateUser(uint256 indexed tokenId, address indexed user, uint64 expires);
    function setUser(uint256 tokenId, address user, uint64 expires) external;
    function userOf(uint256 tokenId) external view returns (address);
    function userExpires(uint256 tokenId) external view returns (uint256);
}`,
  "1271": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC1271 {
    function isValidSignature(bytes32 hash, bytes memory signature)
        external view returns (bytes4 magicValue);
}`,
  "165": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}`,
  "6551": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC6551Registry {
    event AccountCreated(address account, address indexed implementation, bytes32 salt,
        uint256 chainId, address indexed tokenContract, uint256 indexed tokenId);
    function createAccount(address implementation, bytes32 salt, uint256 chainId,
        address tokenContract, uint256 tokenId) external returns (address account);
    function account(address implementation, bytes32 salt, uint256 chainId,
        address tokenContract, uint256 tokenId) external view returns (address account);
}`,
  "5484": `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC5484 {
    enum BurnAuth { IssuerOnly, OwnerOnly, Both, Neither }
    event Issued(address indexed from, address indexed to, uint256 indexed tokenId, BurnAuth burnAuth);
    function burnAuth(uint256 tokenId) external view returns (BurnAuth);
}`,
};

// ---------------------------------------------------------------------------
// OZ snippets
// ---------------------------------------------------------------------------
const ozSnippets: Record<string, string> = {
  "20": `import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, ERC20Burnable, Ownable {
    constructor(address initialOwner)
        ERC20("MyToken", "MTK") Ownable(initialOwner) {}
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}`,
  "721": `import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    constructor(address initialOwner)
        ERC721("MyNFT", "MNFT") Ownable(initialOwner) {}
    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }
    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}`,
  "1155": `import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyMultiToken is ERC1155, Ownable {
    constructor(address initialOwner)
        ERC1155("https://api.example.com/tokens/{id}.json")
        Ownable(initialOwner)
    { _mint(initialOwner, 0, 10_000, ""); }
    function mint(address to, uint256 id, uint256 amount) public onlyOwner {
        _mint(to, id, amount, "");
    }
}`,
  "2981": `import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RoyaltyNFT is ERC721, ERC2981, Ownable {
    uint256 private _nextTokenId;
    constructor(address initialOwner)
        ERC721("RoyaltyNFT", "RNFT") Ownable(initialOwner)
    { _setDefaultRoyalty(initialOwner, 500); } // 5%
    function safeMint(address to) public onlyOwner { _safeMint(to, _nextTokenId++); }
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}`,
  "4626": `import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract MyVault is ERC4626 {
    constructor(IERC20 asset_)
        ERC20("My Vault Shares", "vSHARE")
        ERC4626(asset_) {}
}`,
  "1271": `import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";

contract SmartWallet is IERC1271 {
    using ECDSA for bytes32;
    address public owner;
    bytes4 private constant MAGIC_VALUE = 0x1626ba7e;
    constructor(address _owner) { owner = _owner; }
    function isValidSignature(bytes32 hash, bytes memory signature)
        external view override returns (bytes4) {
        return hash.recover(signature) == owner ? MAGIC_VALUE : bytes4(0xffffffff);
    }
}`,
};

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
type Tab = "overview" | "security" | "l2" | "gas" | "interface" | "implementation";

const tabDefs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",       label: "Overview",  icon: <BookOpen    className="h-3.5 w-3.5" /> },
  { id: "security",       label: "Security",  icon: <ShieldAlert className="h-3.5 w-3.5" /> },
  { id: "l2",             label: "L2",        icon: <Globe       className="h-3.5 w-3.5" /> },
  { id: "gas",            label: "Gas",       icon: <Fuel        className="h-3.5 w-3.5" /> },
  { id: "interface",      label: "Interface", icon: <Code2       className="h-3.5 w-3.5" /> },
  { id: "implementation", label: "OZ Code",   icon: <Sparkles    className="h-3.5 w-3.5" /> },
];

// ---------------------------------------------------------------------------
// CodeBlock
// ---------------------------------------------------------------------------
function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-lg border border-border bg-background overflow-hidden">
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre className="overflow-x-auto p-4 pt-12 text-xs leading-relaxed text-muted-foreground font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const ERCDetail = ({ erc, open, onOpenChange }: ERCDetailProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (!erc) return null;

  const hasSecurity       = !!securityDatabase[erc.number];
  const hasL2             = !!l2CompatDatabase[erc.number];
  const hasGas            = !!gasDatabase[erc.number];
  const hasInterface      = !!solidityInterfaces[erc.number];
  const hasImplementation = !!ozSnippets[erc.number];

  const secData = securityDatabase[erc.number];
  const l2Data  = l2CompatDatabase[erc.number];
  const l2Issues = l2Data?.notes.filter((n) => n.support !== "full").length ?? 0;

  const secBadge = secData
    ? ({ critical: "text-red-400 bg-red-500/10 border-red-500/30", high: "text-orange-400 bg-orange-500/10 border-orange-500/30", medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", low: "text-blue-400 bg-blue-500/10 border-blue-500/30" } as Record<string, string>)[secData.overallRisk]
    : "";

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setActiveTab("overview"); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-2xl">

        {/* Header */}
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg font-bold text-primary">ERC-{erc.number}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColors[erc.category]}`}>
              {erc.category}
            </span>
            <Badge variant="outline" className="text-xs text-muted-foreground">{erc.status}</Badge>
            {hasSecurity && (
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${secBadge}`}>
                {secData.overallRisk} risk
              </span>
            )}
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">{erc.title}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border border-border bg-background p-1">
          {tabDefs.map(({ id, label, icon }) => {
            const disabled =
              (id === "security"       && !hasSecurity) ||
              (id === "l2"             && !hasL2) ||
              (id === "gas"            && !hasGas) ||
              (id === "interface"      && !hasInterface) ||
              (id === "implementation" && !hasImplementation);

            const isActive = activeTab === id;
            const accentClass =
              id === "security" && isActive ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
              id === "l2"       && isActive ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
              id === "gas"      && isActive ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
              isActive                      ? "bg-primary text-primary-foreground" : "";

            return (
              <button
                key={id}
                onClick={() => !disabled && setActiveTab(id)}
                disabled={disabled}
                className={`relative flex flex-1 items-center justify-center gap-1 rounded-md px-1 py-2 text-[11px] font-medium transition-all ${
                  isActive ? accentClass : disabled ? "cursor-not-allowed opacity-25 text-muted-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
                {id === "security" && hasSecurity && !isActive && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[8px] font-bold text-white">
                    {secData.vulnerabilities.length}
                  </span>
                )}
                {id === "l2" && hasL2 && l2Issues > 0 && !isActive && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-[8px] font-bold text-black">
                    {l2Issues}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Overview ─────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-5 pt-1">
            <p className="text-sm leading-relaxed text-muted-foreground">{erc.summary}</p>
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> Key Features
              </h4>
              <div className="flex flex-wrap gap-2">
                {erc.keyFeatures.map((f) => <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>)}
              </div>
            </div>
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Lightbulb className="h-4 w-4 text-amber-400" /> Use Cases
              </h4>
              <ul className="space-y-1.5">
                {erc.useCases.map((uc) => (
                  <li key={uc} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />{uc}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Wrench className="h-4 w-4 text-accent" /> What You Can Build
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {erc.buildExamples.map((ex) => (
                  <div key={ex} className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-secondary-foreground">{ex}</div>
                ))}
              </div>
            </div>
            {erc.relatedERCs && erc.relatedERCs.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Link2 className="h-4 w-4 text-primary" /> Related ERCs
                </h4>
                <div className="flex flex-wrap gap-2">
                  {erc.relatedERCs.map((r) => (
                    <Badge key={r} variant="outline" className="font-mono text-xs text-primary">ERC-{r}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "security" && <SecurityPanel ercNumber={erc.number} />}
        {activeTab === "l2"       && <L2CompatibilityPanel ercNumber={erc.number} />}
        {activeTab === "gas"      && <GasCostPanel ercNumber={erc.number} />}

        {/* ── Solidity Interface ────────────────────────────────────── */}
        {activeTab === "interface" && (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground">The minimal interface every compliant implementation must satisfy.</p>
            <CodeBlock code={solidityInterfaces[erc.number]} />
            <a href={`https://eips.ethereum.org/EIPS/eip-${erc.number}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary underline underline-offset-2">
              EIP-{erc.number} on ethereum.org ↗
            </a>
          </div>
        )}

        {/* ── OZ Implementation ────────────────────────────────────── */}
        {activeTab === "implementation" && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Production-ready OpenZeppelin implementation.</p>
              <a href="https://www.npmjs.com/package/@openzeppelin/contracts" target="_blank" rel="noopener noreferrer"
                className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">npm ↗</a>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 font-mono text-xs text-muted-foreground">
              npm install @openzeppelin/contracts
            </div>
            <CodeBlock code={ozSnippets[erc.number]} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ERCDetail;