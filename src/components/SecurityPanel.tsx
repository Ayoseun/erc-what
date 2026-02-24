import { useState } from "react";
import { Shield, ShieldAlert, ShieldX, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type Severity = "critical" | "high" | "medium" | "low";

export interface Vulnerability {
  id: string;
  name: string;
  severity: Severity;
  description: string;
  attackVector: string;           // How the attack is executed
  realWorldExploit?: {            // Optional: real incident
    name: string;
    lostUSD: string;
    year: number;
    url?: string;
  };
  vulnerableCode: string;         // Solidity snippet showing the bug
  fixedCode: string;              // Solidity snippet showing the fix
  ozGuard?: string;               // OpenZeppelin import that prevents it
  references: { label: string; url: string }[];
}

export interface ERCSecurityData {
  ercNumber: string;
  overallRisk: Severity;
  summary: string;
  vulnerabilities: Vulnerability[];
}

// ---------------------------------------------------------------------------
// Vulnerability database
// ---------------------------------------------------------------------------
export const securityDatabase: Record<string, ERCSecurityData> = {
  "20": {
    ercNumber: "20",
    overallRisk: "high",
    summary: "ERC-20 is the most exploited standard. The approve/transferFrom race condition and missing return values have drained hundreds of millions. Always use SafeERC20.",
    vulnerabilities: [
      {
        id: "erc20-approve-race",
        name: "Approve / TransferFrom Race Condition",
        severity: "high",
        description: "If a spender is approved for N tokens and the owner changes approval to M, the spender can front-run the change and spend both N and M tokens by watching the mempool.",
        attackVector: "Owner calls approve(spender, newAmount). Spender watches mempool, front-runs with transferFrom(owner, attacker, oldAmount), then claims transferFrom(owner, attacker, newAmount) after confirmation.",
        vulnerableCode: `// VULNERABLE: direct approve change
function changeAllowance(address spender, uint256 newAmount) external {
    // Attacker can front-run this and spend OLD + NEW amount
    _approve(msg.sender, spender, newAmount);
}`,
        fixedCode: `// FIXED: use increaseAllowance / decreaseAllowance
// Or reset to 0 first, then set new value
function safeChangeAllowance(address spender, uint256 newAmount) external {
    uint256 currentAllowance = allowance(msg.sender, spender);
    if (newAmount > currentAllowance) {
        increaseAllowance(spender, newAmount - currentAllowance);
    } else {
        decreaseAllowance(spender, currentAllowance - newAmount);
    }
}`,
        ozGuard: `import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// Use safeIncreaseAllowance / safeDecreaseAllowance instead of approve`,
        references: [
          { label: "ERC-20 API attack vectors", url: "https://docs.google.com/document/d/1YLPtQxZu1eVHqm4cFHa-AkuHvMcBBi76_FPgQeKBMG0" },
        ],
      },
      {
        id: "erc20-missing-return",
        name: "Missing Return Value",
        severity: "high",
        description: "Some ERC-20 tokens (USDT, BNB) don't return a boolean from transfer(). Contracts that check the return value will revert. Contracts that don't check it silently swallow failed transfers.",
        attackVector: "Protocol calls token.transfer(user, amount). Token returns nothing. Protocol assumes success and credits the user. User receives free tokens without the transfer succeeding.",
        realWorldExploit: {
          name: "Multiple DeFi protocols",
          lostUSD: "$0 direct — but caused silent failed transfers in early Uniswap and Compound deployments",
          year: 2020,
        },
        vulnerableCode: `// VULNERABLE: assumes transfer returns true
function withdraw(uint256 amount) external {
    token.transfer(msg.sender, amount); // ← return value ignored
    emit Withdrawn(msg.sender, amount);
}`,
        fixedCode: `// FIXED: use SafeERC20 which handles non-standard tokens
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

function withdraw(uint256 amount) external {
    SafeERC20.safeTransfer(token, msg.sender, amount); // ← safe wrapper
    emit Withdrawn(msg.sender, amount);
}`,
        ozGuard: `import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
using SafeERC20 for IERC20;`,
        references: [
          { label: "SafeERC20 docs", url: "https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#SafeERC20" },
        ],
      },
      {
        id: "erc20-flash-loan-inflation",
        name: "Flash Loan Price Manipulation",
        severity: "critical",
        description: "Protocols using ERC-20 token balances as price oracles can be manipulated by flash loans within a single transaction, inflating or deflating prices to drain vaults.",
        attackVector: "Attacker flash-loans a large amount → manipulates the on-chain token price → exploits a protocol using spot price → repays the flash loan. All in one transaction.",
        realWorldExploit: {
          name: "bZx Protocol",
          lostUSD: "$954,000",
          year: 2020,
          url: "https://bzx.network/blog/postmortem-ethdenver",
        },
        vulnerableCode: `// VULNERABLE: using spot balance as price
function getPrice() public view returns (uint256) {
    return token.balanceOf(pool) / weth.balanceOf(pool); // ← manipulable
}`,
        fixedCode: `// FIXED: use a TWAP oracle (e.g. Uniswap v3 TWAP or Chainlink)
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

AggregatorV3Interface internal priceFeed;

function getPrice() public view returns (int256) {
    (, int256 price,,,) = priceFeed.latestRoundData();
    return price; // ← manipulation-resistant
}`,
        references: [
          { label: "Uniswap v3 TWAP", url: "https://docs.uniswap.org/concepts/protocol/oracle" },
          { label: "Chainlink Data Feeds", url: "https://docs.chain.link/data-feeds" },
        ],
      },
    ],
  },

  "721": {
    ercNumber: "721",
    overallRisk: "medium",
    summary: "ERC-721 risks are concentrated in safeTransferFrom callbacks and URI manipulation. The reentrancy risk via onERC721Received is the most exploited vector.",
    vulnerabilities: [
      {
        id: "erc721-reentrancy",
        name: "Reentrancy via onERC721Received",
        severity: "critical",
        description: "safeTransferFrom calls onERC721Received on the recipient contract. If the recipient is malicious, it can re-enter the sending contract before state is updated — classic reentrancy.",
        attackVector: "Attacker deploys a contract with onERC721Received that calls back into the vulnerable function (e.g. mint, buy) before the first call finishes. State updates haven't happened yet, so the attacker double-spends.",
        realWorldExploit: {
          name: "Akutar NFT",
          lostUSD: "$34,000,000",
          year: 2022,
          url: "https://blocksec.com/blog/the-akutar-nft-incident",
        },
        vulnerableCode: `// VULNERABLE: state update AFTER external call
function buyNFT(uint256 tokenId) external payable {
    require(msg.value >= price, "Too low");
    _safeTransfer(address(this), msg.sender, tokenId, ""); // ← external call first
    balances[msg.sender] += 1; // ← state updated after — TOO LATE
}`,
        fixedCode: `// FIXED: Checks-Effects-Interactions pattern
function buyNFT(uint256 tokenId) external payable {
    require(msg.value >= price, "Too low");
    balances[msg.sender] += 1;           // ← 1. Effects first
    _safeTransfer(address(this), msg.sender, tokenId, ""); // ← 2. Interaction last
}

// BETTER: use ReentrancyGuard
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

function buyNFT(uint256 tokenId) external payable nonReentrant {
    require(msg.value >= price, "Too low");
    _safeTransfer(address(this), msg.sender, tokenId, "");
}`,
        ozGuard: `import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// Apply nonReentrant modifier to any function calling safeTransferFrom`,
        references: [
          { label: "Reentrancy attacks", url: "https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard" },
        ],
      },
      {
        id: "erc721-metadata-manipulation",
        name: "Centralised / Mutable Metadata",
        severity: "medium",
        description: "If tokenURI points to a centralised server, the NFT's image and attributes can be changed or deleted by the server owner — the NFT is not truly immutable.",
        attackVector: "Project owner (or hacker who compromises their server) changes the metadata API to return different images or attributes. Holders own a token ID but not the original art.",
        vulnerableCode: `// VULNERABLE: mutable centralised URI
string private baseURI = "https://api.myproject.com/tokens/";

function tokenURI(uint256 tokenId) public view override returns (string memory) {
    return string(abi.encodePacked(baseURI, tokenId.toString())); // ← server can change
}`,
        fixedCode: `// FIXED: use IPFS / Arweave content-addressed URIs
// Once set, the content at this URI cannot change
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    return string(abi.encodePacked(
        "ipfs://QmYourImmutableCIDHere/", tokenId.toString(), ".json"
    ));
}

// OR: store metadata fully on-chain using Base64
import "@openzeppelin/contracts/utils/Base64.sol";`,
        references: [
          { label: "On-chain metadata", url: "https://docs.openzeppelin.com/contracts/4.x/utilities#Base64" },
        ],
      },
    ],
  },

  "1155": {
    ercNumber: "1155",
    overallRisk: "medium",
    summary: "ERC-1155 shares ERC-721's reentrancy risk via onERC1155Received, and adds batch operation risks where a single bad recipient can block an entire batch transfer.",
    vulnerabilities: [
      {
        id: "erc1155-reentrancy",
        name: "Reentrancy via onERC1155Received",
        severity: "critical",
        description: "Both safeTransferFrom and safeBatchTransferFrom call onERC1155Received / onERC1155BatchReceived on recipient contracts, opening the same reentrancy vector as ERC-721.",
        attackVector: "Recipient contract's onERC1155Received callback re-enters the sender contract before the original transfer finishes. State hasn't been committed, enabling double-spend or fund drain.",
        vulnerableCode: `// VULNERABLE: no reentrancy protection on transfer handler
function claimTokens(uint256 id, uint256 amount) external {
    require(claimable[msg.sender][id] >= amount, "Too much");
    _safeTransferFrom(address(this), msg.sender, id, amount, ""); // ← re-entrant
    claimable[msg.sender][id] -= amount; // ← updated too late
}`,
        fixedCode: `import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

function claimTokens(uint256 id, uint256 amount) external nonReentrant {
    require(claimable[msg.sender][id] >= amount, "Too much");
    claimable[msg.sender][id] -= amount; // ← effects first
    _safeTransferFrom(address(this), msg.sender, id, amount, "");
}`,
        ozGuard: `import "@openzeppelin/contracts/security/ReentrancyGuard.sol";`,
        references: [
          { label: "ERC-1155 security", url: "https://eips.ethereum.org/EIPS/eip-1155#security-considerations" },
        ],
      },
      {
        id: "erc1155-batch-dos",
        name: "Batch Transfer DoS via Malicious Receiver",
        severity: "medium",
        description: "In safeBatchTransferFrom, if ANY recipient in the batch reverts in their onERC1155BatchReceived, the entire batch fails. A single malicious or broken receiver blocks all transfers.",
        attackVector: "Attacker deploys a contract whose onERC1155BatchReceived always reverts. If included in any batch operation, they can freeze funds by making the batch fail repeatedly.",
        vulnerableCode: `// VULNERABLE: single revert blocks entire batch
function airdrop(address[] calldata recipients, uint256 id, uint256 amount) external {
    for (uint i = 0; i < recipients.length; i++) {
        _safeTransferFrom(msg.sender, recipients[i], id, amount, ""); // ← one revert = all fail
    }
}`,
        fixedCode: `// FIXED: use try/catch to isolate failures
function airdrop(address[] calldata recipients, uint256 id, uint256 amount) external {
    for (uint i = 0; i < recipients.length; i++) {
        try this.safeSingleTransfer(recipients[i], id, amount) {
            // success
        } catch {
            emit TransferFailed(recipients[i], id, amount);
        }
    }
}`,
        references: [
          { label: "ERC-1155 batch considerations", url: "https://eips.ethereum.org/EIPS/eip-1155" },
        ],
      },
    ],
  },

  "4626": {
    ercNumber: "4626",
    overallRisk: "critical",
    summary: "ERC-4626 vaults are high-value targets. The inflation attack is the most critical — it has stolen funds from multiple protocol launches. Always include a dead shares fix in your deployment.",
    vulnerabilities: [
      {
        id: "erc4626-inflation",
        name: "Vault Inflation Attack (Share Price Manipulation)",
        severity: "critical",
        description: "An attacker can manipulate the share price of a freshly deployed vault by front-running the first deposit. By donating tokens directly to the vault, they inflate the share price and steal a portion of the victim's deposit.",
        attackVector: "1. Attacker watches for vault deployment. 2. Front-runs first depositor with a tiny deposit (1 wei → gets 1 share). 3. Donates a large amount directly to the vault (bypassing deposit). 4. Share price is now enormous. 5. Victim's deposit rounds down to 0 shares. 6. Attacker withdraws everything.",
        realWorldExploit: {
          name: "Multiple ERC-4626 vault launches",
          lostUSD: "$200,000+ across incidents",
          year: 2023,
          url: "https://blog.openzeppelin.com/a-novel-defense-against-erc4626-inflation-attacks",
        },
        vulnerableCode: `// VULNERABLE: standard vault with no inflation protection
contract MyVault is ERC4626 {
    constructor(IERC20 asset) ERC20("Vault", "vTKN") ERC4626(asset) {}
    // No protection — vulnerable to inflation attack on first deposit
}`,
        fixedCode: `// FIXED: use OpenZeppelin's built-in decimal offset protection
// OZ v5 ERC4626 includes _decimalsOffset() which makes inflation attacks
// economically infeasible by requiring attacker to donate ~10^18x more

contract MyVault is ERC4626 {
    constructor(IERC20 asset) ERC20("Vault", "vTKN") ERC4626(asset) {}

    // OZ v5 automatically applies a virtual offset — no extra code needed.
    // For older OZ: mint dead shares to address(1) on deployment:
    function initialize() external {
        // Deposit a small amount to a dead address to seed the vault
        _mint(address(1), 10 ** decimals());
    }
}`,
        ozGuard: `// Use OpenZeppelin contracts v5.0+
// ERC4626 now includes built-in inflation attack protection via virtual shares`,
        references: [
          { label: "OZ inflation attack writeup", url: "https://blog.openzeppelin.com/a-novel-defense-against-erc4626-inflation-attacks" },
          { label: "ERC-4626 security", url: "https://eips.ethereum.org/EIPS/eip-4626#security-considerations" },
        ],
      },
      {
        id: "erc4626-rounding",
        name: "Rounding Errors in Share Conversion",
        severity: "high",
        description: "Incorrect rounding in convertToShares / convertToAssets can be exploited to extract value over many transactions, or cause users to receive fewer assets than they deposited.",
        attackVector: "Attacker repeatedly deposits and withdraws small amounts, exploiting rounding in the share-to-asset conversion to accumulate a profit from the vault's rounding losses.",
        vulnerableCode: `// VULNERABLE: rounding in wrong direction
function convertToAssets(uint256 shares) public view override returns (uint256) {
    return shares * totalAssets() / totalSupply(); // ← rounds DOWN, bad for withdrawers
}`,
        fixedCode: `// FIXED: round DOWN for deposit/mint (favours vault)
//        round UP for withdraw/redeem (protects users)
// OpenZeppelin handles this automatically with Math.mulDiv

function convertToAssets(uint256 shares) public view override returns (uint256) {
    return Math.mulDiv(shares, totalAssets() + 1, totalSupply() + 10 ** _decimalsOffset());
}`,
        references: [
          { label: "ERC-4626 rounding", url: "https://eips.ethereum.org/EIPS/eip-4626#security-considerations" },
        ],
      },
    ],
  },

  "777": {
    ercNumber: "777",
    overallRisk: "critical",
    summary: "ERC-777 is considered dangerous for use in DeFi. The tokensReceived hook has enabled reentrancy attacks that drained over $25M. Avoid using ERC-777 in DeFi contexts.",
    vulnerabilities: [
      {
        id: "erc777-reentrancy",
        name: "Reentrancy via tokensReceived Hook",
        severity: "critical",
        description: "ERC-777's tokensReceived hook calls arbitrary code on the recipient before updating state, enabling textbook reentrancy. This exact vulnerability drained Uniswap and dYdX pools.",
        attackVector: "1. Attacker holds ERC-777 tokens. 2. Calls a DeFi protocol function (e.g. withdraw). 3. Protocol sends tokens → triggers attacker's tokensReceived hook. 4. Hook re-enters the protocol before balance is updated. 5. Attacker drains the pool.",
        realWorldExploit: {
          name: "Uniswap / Lendf.me (imBTC attack)",
          lostUSD: "$25,000,000",
          year: 2020,
          url: "https://medium.com/imtoken/about-the-lendf-me-and-uniswap-security-incident-b8e8b6b6e16b",
        },
        vulnerableCode: `// VULNERABLE: DeFi protocol that accepts ERC-777 tokens
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount);
    token.transfer(msg.sender, amount); // ← triggers tokensReceived → REENTRANCY
    balances[msg.sender] -= amount;     // ← too late
}`,
        fixedCode: `// FIXED option 1: use ReentrancyGuard
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

function withdraw(uint256 amount) external nonReentrant {
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount; // ← effects first
    token.transfer(msg.sender, amount);
}

// FIXED option 2: don't support ERC-777 at all
// Use ERC-20 with SafeERC20 instead`,
        ozGuard: `import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// Apply nonReentrant to all functions that transfer ERC-777 tokens`,
        references: [
          { label: "Lendf.me post-mortem", url: "https://medium.com/imtoken/about-the-lendf-me-and-uniswap-security-incident-b8e8b6b6e16b" },
          { label: "ERC-777 considered harmful", url: "https://github.com/OpenZeppelin/openzeppelin-contracts/issues/2620" },
        ],
      },
    ],
  },

  "4337": {
    ercNumber: "4337",
    overallRisk: "high",
    summary: "Account Abstraction introduces new attack surfaces around UserOperation validation, paymaster manipulation, and signature replay across chains.",
    vulnerabilities: [
      {
        id: "erc4337-signature-replay",
        name: "Cross-Chain Signature Replay",
        severity: "critical",
        description: "If UserOperations don't include chainId in their signed data, a valid signature on one chain can be replayed on another chain where the same smart wallet exists.",
        attackVector: "User signs a UserOperation on Ethereum mainnet. Attacker replays the same signed UserOp on Base or Arbitrum where the user has the same wallet address. Transaction executes on second chain without user's knowledge.",
        vulnerableCode: `// VULNERABLE: signature doesn't include chainId
function _validateSignature(UserOperation calldata userOp) internal view {
    bytes32 hash = keccak256(abi.encode(
        userOp.sender,
        userOp.nonce,
        userOp.callData
        // ← chainId missing!
    ));
    require(hash.recover(userOp.signature) == owner);
}`,
        fixedCode: `// FIXED: include chainId and entryPoint address in signed data
function _validateSignature(UserOperation calldata userOp) internal view {
    bytes32 hash = keccak256(abi.encode(
        block.chainid,           // ← chain-specific
        address(entryPoint()),   // ← entryPoint-specific
        userOp.sender,
        userOp.nonce,
        userOp.callData
    ));
    require(hash.toEthSignedMessageHash().recover(userOp.signature) == owner);
}`,
        references: [
          { label: "ERC-4337 security", url: "https://eips.ethereum.org/EIPS/eip-4337#security-considerations" },
        ],
      },
      {
        id: "erc4337-paymaster-drain",
        name: "Paymaster Gas Drain",
        severity: "high",
        description: "A malicious user can craft UserOperations that pass validatePaymasterUserOp but consume maximum gas during execution, draining the paymaster's stake.",
        attackVector: "Attacker creates UserOps that pass the paymaster's validation check cheaply, but include callData that runs expensive computation during execution. Repeating this drains the paymaster deposit.",
        vulnerableCode: `// VULNERABLE: paymaster doesn't limit execution gas
function validatePaymasterUserOp(UserOperation calldata userOp, ...)
    external returns (bytes memory context, uint256 validationData) {
    require(whitelist[userOp.sender], "Not whitelisted");
    return ("", 0); // ← no gas limit check on execution
}`,
        fixedCode: `// FIXED: enforce callGasLimit in paymaster validation
function validatePaymasterUserOp(UserOperation calldata userOp, ...)
    external returns (bytes memory context, uint256 validationData) {
    require(whitelist[userOp.sender], "Not whitelisted");
    require(userOp.callGasLimit <= MAX_CALL_GAS, "Gas limit too high");
    require(userOp.maxFeePerGas <= MAX_FEE, "Fee too high");
    return ("", 0);
}`,
        references: [
          { label: "Paymaster security", url: "https://eips.ethereum.org/EIPS/eip-4337#paymaster" },
        ],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------
const severityConfig: Record<Severity, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  critical: {
    label: "Critical",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    icon: <ShieldX className="h-4 w-4" />,
  },
  high: {
    label: "High",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    icon: <ShieldAlert className="h-4 w-4" />,
  },
  medium: {
    label: "Medium",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  low: {
    label: "Low",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: <Shield className="h-4 w-4" />,
  },
};

// ---------------------------------------------------------------------------
// CodeBlock
// ---------------------------------------------------------------------------
function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-lg border border-border bg-background overflow-hidden">
      {label && (
        <div className="border-b border-border px-3 py-1.5 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          {label}
        </div>
      )}
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto p-3 pt-8 text-[11px] leading-relaxed text-muted-foreground font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VulnerabilityCard
// ---------------------------------------------------------------------------
function VulnerabilityCard({ vuln }: { vuln: Vulnerability }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = severityConfig[vuln.severity];

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className={cfg.color}>{cfg.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{vuln.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
                {cfg.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{vuln.description}</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-border/50 p-4">

              {/* Full description */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">What is it</p>
                <p className="text-sm text-foreground leading-relaxed">{vuln.description}</p>
              </div>

              {/* Attack vector */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">How the attack works</p>
                <p className="text-sm text-foreground leading-relaxed">{vuln.attackVector}</p>
              </div>

              {/* Real world exploit */}
              {vuln.realWorldExploit && (
                <div className={`rounded-lg border ${cfg.border} p-3 flex items-start gap-3`}>
                  <ShieldX className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      Real exploit: {vuln.realWorldExploit.name} ({vuln.realWorldExploit.year})
                    </p>
                    <p className={`text-xs font-bold ${cfg.color}`}>{vuln.realWorldExploit.lostUSD} lost</p>
                  </div>
                  {vuln.realWorldExploit.url && (
                    <a
                      href={vuln.realWorldExploit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Code comparison */}
              <div className="grid gap-3 sm:grid-cols-2">
                <CodeBlock code={vuln.vulnerableCode} label="❌ Vulnerable" />
                <CodeBlock code={vuln.fixedCode} label="✅ Fixed" />
              </div>

              {/* OZ guard */}
              {vuln.ozGuard && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">OpenZeppelin guard</p>
                  <CodeBlock code={vuln.ozGuard} />
                </div>
              )}

              {/* References */}
              {vuln.references.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {vuln.references.map((r) => (
                    <a
                      key={r.url}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {r.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main SecurityPanel component
// ---------------------------------------------------------------------------
interface SecurityPanelProps {
  ercNumber: string;
}

const SecurityPanel = ({ ercNumber }: SecurityPanelProps) => {
  const data = securityDatabase[ercNumber];

  if (!data) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Shield className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No security data available for ERC-{ercNumber} yet.</p>
        <a
          href={`https://eips.ethereum.org/EIPS/eip-${ercNumber}#security-considerations`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-primary underline underline-offset-2"
        >
          Read the EIP security considerations <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  const cfg = severityConfig[data.overallRisk];
  const criticalCount = data.vulnerabilities.filter((v) => v.severity === "critical").length;
  const highCount = data.vulnerabilities.filter((v) => v.severity === "high").length;

  return (
    <div className="space-y-4">
      {/* Risk header */}
      <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
        <div className="flex items-center gap-3 mb-2">
          <span className={cfg.color}>{cfg.icon}</span>
          <span className={`text-sm font-bold ${cfg.color}`}>Overall Risk: {cfg.label}</span>
          <div className="ml-auto flex gap-2 text-xs">
            {criticalCount > 0 && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-red-400 font-semibold border border-red-500/30">
                {criticalCount} Critical
              </span>
            )}
            {highCount > 0 && (
              <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-orange-400 font-semibold border border-orange-500/30">
                {highCount} High
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{data.summary}</p>
      </div>

      {/* Vulnerability list */}
      <div className="space-y-3">
        {data.vulnerabilities.map((vuln) => (
          <VulnerabilityCard key={vuln.id} vuln={vuln} />
        ))}
      </div>

      {/* Footer link */}
      <a
        href={`https://eips.ethereum.org/EIPS/eip-${ercNumber}#security-considerations`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ExternalLink className="h-3 w-3" />
        Full security considerations in EIP-{ercNumber}
      </a>
    </div>
  );
};

export default SecurityPanel;
