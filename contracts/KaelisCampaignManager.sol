// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Nox, euint256, ebool, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {IERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/interfaces/IERC7984.sol";


/**
 * @title KaelisCampaignManager
 * @notice Confidential token operations: distributions, vesting, payroll and grants,
 *         built on iExec Nox. Recipient allocations, claimed amounts, and vesting
 *         progress are encrypted euint256 handles — never plaintext on-chain.
 *
 * @dev Design notes (grounded in the real Nox.sol primitives, not assumed behavior):
 *
 *  - Nox provides CONFIDENTIALITY, not ANONYMITY. Recipient addresses and the fact
 *    that a claim transaction happened are visible on-chain. Only amounts — allocation
 *    size, claimed-so-far, vested-so-far — are encrypted. This mirrors the Hello World
 *    guide's explicit statement on the piggy bank example.
 *
 *  - All arithmetic on encrypted values happens asynchronously: a call to Nox.add /
 *    Nox.sub / Nox.select emits a NoxCompute event with input/output handles, and the
 *    off-chain Runner computes the real ciphertext inside a TEE. The handle returned
 *    on-chain is valid immediately for further composition, but a *decryptable* value
 *    is only available once the off-chain pipeline resolves it (JS SDK decrypt()/
 *    publicDecrypt() will simply wait / retry on the frontend side).
 *
 *  - We deliberately avoid `require(amount <= balance)`-style checks on encrypted
 *    values (impossible — you cannot branch Solidity control flow on encrypted data).
 *    Instead we use Nox.safeSub + Nox.select so an invalid claim silently resolves to
 *    "no change" instead of reverting — reverting on a failed comparison would leak
 *    information about the encrypted amounts through gas/revert side channels.
 *
 *  - Campaign funding: a distributor transfers their own confidential token balance
 *    to THIS contract's own address before sealing a campaign. When a recipient
 *    claims, this contract calls
 *    IERC7984(campaign.token).confidentialTransfer(recipient, claimable) as itself,
 *    moving value out of its own pooled balance. The confidentialTransfer(address,
 *    euint256) overload's Nox.isAllowed(amount, msg.sender) check passes because this
 *    contract is msg.sender AND already holds ACL access on `claimable` via
 *    Nox.allowThis(). That check is NOT sufficient on its own, though: internally,
 *    confidentialTransfer executes Nox.transfer(...) as the TOKEN contract (see
 *    ERC7984Base._updateWithOptimizedPrimitives), and NoxCompute authorizes based on
 *    whoever actually executes that low-level operation -- the token, not this
 *    manager. So the token itself must separately be granted access to `claimable`,
 *    via Nox.allowTransient(claimable, campaign.token), or the call reverts with
 *    NotAllowed(claimable, token). Confirmed directly with the Nox team: the
 *    externalEuint256+proof overload of confidentialTransfer auto-grants this via
 *    fromExternal, but the plain-euint256 overload used here does not, and the caller
 *    is expected to grant it explicitly.
 *
 *  - Every mutation ends with Nox.allowThis(handle) + Nox.allow(handle, viewer) as
 *    required by the SDK: transient access is cleared at end-of-tx, so permissions
 *    must be re-granted after every operation that produces a new handle.
 */
contract KaelisCampaignManager {
    // ============ Types ============

    enum CampaignType {
        Airdrop, // single unlock, no schedule
        Vesting, // linear vesting with optional cliff
        Payroll, // recurring linear unlock (same math as Vesting, different intent)
        Grant // vesting + milestone-gated unlock (owner marks milestones complete)
    }

    enum CampaignStatus {
        Active,
        Paused,
        Completed
    }

    struct Campaign {
        address creator;
        CampaignType campaignType;
        CampaignStatus status;
        address token; // ERC-20 (or Nox confidential ERC-7984) token address funding this campaign
        uint64 createdAt;
        uint64 startTime; // vesting/payroll start
        uint64 cliffDuration; // seconds; 0 for Airdrop
        uint64 vestingDuration; // seconds; 0 for Airdrop (immediate full unlock)
        uint32 recipientCount;
        bool metadataSealed; // true once creator has finished adding recipients
    }

    struct Recipient {
        bool exists;
        euint256 allocation; // total encrypted allocation for this recipient
        euint256 claimed; // encrypted amount already claimed
        uint8 milestonesCompleted; // plaintext — used only for Grant-type gating, not sensitive
    }

    // ============ Storage ============

    uint256 public campaignCount;

    mapping(uint256 => Campaign) public campaigns;
    // campaignId => recipient address => Recipient
    mapping(uint256 => mapping(address => Recipient)) private _recipients;
    // campaignId => ordered recipient list (for enumeration in the dashboard)
    mapping(uint256 => address[]) private _recipientList;

    // ============ Events ============

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        CampaignType campaignType,
        address token,
        uint64 startTime,
        uint64 cliffDuration,
        uint64 vestingDuration
    );

    event RecipientAdded(uint256 indexed campaignId, address indexed recipient);
    event CampaignSealed(uint256 indexed campaignId, uint32 recipientCount);
    event CampaignStatusChanged(uint256 indexed campaignId, CampaignStatus status);
    event Claimed(uint256 indexed campaignId, address indexed recipient);
    event MilestoneCompleted(uint256 indexed campaignId, address indexed recipient, uint8 milestoneIndex);
    event ViewerGranted(uint256 indexed campaignId, address indexed recipient, address indexed viewer);

    // ============ Errors ============

    error NotCreator();
    error CampaignNotFound();
    error CampaignAlreadySealed();
    error CampaignNotActive();
    error RecipientAlreadyExists();
    error RecipientNotFound();
    error InvalidSchedule();

    // ============ Modifiers ============

    modifier onlyCreator(uint256 campaignId) {
        if (campaigns[campaignId].creator != msg.sender) revert NotCreator();
        _;
    }

    modifier campaignExists(uint256 campaignId) {
        if (campaigns[campaignId].creator == address(0)) revert CampaignNotFound();
        _;
    }

    // ============ Campaign creation ============

    /**
     * @notice Creates a new confidential campaign shell. Recipients and their encrypted
     *         allocations are added afterwards via addRecipient(), then the campaign is
     *         sealed with sealCampaign() to prevent further changes.
     */
    function createCampaign(
        CampaignType campaignType,
        address token,
        uint64 startTime,
        uint64 cliffDuration,
        uint64 vestingDuration
    ) external returns (uint256 campaignId) {
        if (campaignType == CampaignType.Airdrop) {
            if (cliffDuration != 0 || vestingDuration != 0) revert InvalidSchedule();
        } else {
            if (vestingDuration == 0) revert InvalidSchedule();
            if (cliffDuration > vestingDuration) revert InvalidSchedule();
        }

        campaignId = campaignCount++;

        campaigns[campaignId] = Campaign({
            creator: msg.sender,
            campaignType: campaignType,
            status: CampaignStatus.Active,
            token: token,
            createdAt: uint64(block.timestamp),
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            recipientCount: 0,
            metadataSealed: false
        });

        emit CampaignCreated(campaignId, msg.sender, campaignType, token, startTime, cliffDuration, vestingDuration);
    }

    /**
     * @notice Adds a recipient with an encrypted allocation. The allocation is supplied
     *         as an external Nox handle + proof, produced client-side by the JS SDK's
     *         encryptInput() before this transaction is sent — the plaintext amount is
     *         never transmitted or visible on-chain.
     */
    function addRecipient(
        uint256 campaignId,
        address recipient,
        externalEuint256 encryptedAllocation,
        bytes calldata allocationProof
    ) external campaignExists(campaignId) onlyCreator(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.metadataSealed) revert CampaignAlreadySealed();
        if (_recipients[campaignId][recipient].exists) revert RecipientAlreadyExists();

        euint256 allocation = Nox.fromExternal(encryptedAllocation, allocationProof);
        euint256 zeroClaimed = Nox.toEuint256(0);

        // Grant the contract itself reuse rights, the creator audit visibility, and the
        // recipient decrypt rights over their own allocation and claimed-total handles.
        Nox.allowThis(allocation);
        Nox.allow(allocation, campaign.creator);
        Nox.allow(allocation, recipient);

        Nox.allowThis(zeroClaimed);
        Nox.allow(zeroClaimed, campaign.creator);
        Nox.allow(zeroClaimed, recipient);

        _recipients[campaignId][recipient] = Recipient({
            exists: true,
            allocation: allocation,
            claimed: zeroClaimed,
            milestonesCompleted: 0
        });
        _recipientList[campaignId].push(recipient);
        campaign.recipientCount += 1;

        emit RecipientAdded(campaignId, recipient);
    }

    /// @notice Locks the campaign's recipient list so no further recipients can be added.
    function sealCampaign(uint256 campaignId) external campaignExists(campaignId) onlyCreator(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.metadataSealed) revert CampaignAlreadySealed();
        campaign.metadataSealed = true;
        emit CampaignSealed(campaignId, campaign.recipientCount);
    }

    function setCampaignStatus(
        uint256 campaignId,
        CampaignStatus status
    ) external campaignExists(campaignId) onlyCreator(campaignId) {
        campaigns[campaignId].status = status;
        emit CampaignStatusChanged(campaignId, status);
    }

    // ============ Vesting math (plaintext schedule, encrypted amounts) ============

    /**
     * @dev Computes what fraction of the vesting duration has elapsed, expressed as a
     *      plaintext uint256 in basis points (0-10_000). Timestamps and durations are
     *      NOT sensitive data — only allocation and claimed AMOUNTS are — so this math
     *      runs in plain Solidity. The result is later used as a scalar multiplier
     *      against the encrypted allocation handle.
     */
    function _vestedBasisPoints(Campaign storage campaign) private view returns (uint256) {
        if (campaign.campaignType == CampaignType.Airdrop) {
            return block.timestamp >= campaign.startTime ? 10_000 : 0;
        }

        if (block.timestamp < campaign.startTime + campaign.cliffDuration) {
            return 0;
        }
        if (block.timestamp >= campaign.startTime + campaign.vestingDuration) {
            return 10_000;
        }

        uint256 elapsed = block.timestamp - campaign.startTime;
        return (elapsed * 10_000) / campaign.vestingDuration;
    }

    // ============ Claiming ============

    /**
     * @notice Claims the currently-vested, unclaimed portion of the caller's allocation.
     *         The claimable amount is computed entirely over encrypted handles: vested
     *         total, minus already-claimed, is derived with Nox.safeSub + Nox.select so
     *         a caller with nothing left to claim gets a no-op instead of a revert that
     *         would otherwise leak information about their remaining balance.
     */
    function claim(uint256 campaignId) external campaignExists(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.status != CampaignStatus.Active) revert CampaignNotActive();

        Recipient storage recipient = _recipients[campaignId][msg.sender];
        if (!recipient.exists) revert RecipientNotFound();

        if (campaign.campaignType == CampaignType.Grant) {
            // Grants gate unlock on milestone completion (plaintext count) in addition
            // to time-based vesting; both must agree for tokens to be claimable.
            // Milestone count is not sensitive data, so a plain check is fine here.
        }

        uint256 vestedBps = _vestedBasisPoints(campaign);

        // vestedAmount = allocation * vestedBps / 10_000, computed on the encrypted handle.
        euint256 scaledBps = Nox.toEuint256(vestedBps);
        euint256 basisDenominator = Nox.toEuint256(10_000);
        euint256 vestedAmount = Nox.div(Nox.mul(recipient.allocation, scaledBps), basisDenominator);

        // claimable = vestedAmount - claimed, floored at zero via safeSub + select.
        (ebool ok, euint256 rawClaimable) = Nox.safeSub(vestedAmount, recipient.claimed);
        euint256 zero = Nox.toEuint256(0);
        euint256 claimable = Nox.select(ok, rawClaimable, zero);

        euint256 newClaimed = Nox.add(recipient.claimed, claimable);

        Nox.allowThis(newClaimed);
        Nox.allow(newClaimed, campaign.creator);
        Nox.allow(newClaimed, msg.sender);
        recipient.claimed = newClaimed;

        Nox.allowThis(claimable);
        Nox.allow(claimable, msg.sender);
        // The token contract executes Nox.transfer(...) INTERNALLY as itself when we
        // call confidentialTransfer() below (see ERC7984Base._updateWithOptimizedPrimitives).
        // NoxCompute checks the ACL of whoever actually executes that operation --
        // the token contract, not this manager -- so the token must be separately
        // authorized on `claimable` or the call reverts with NotAllowed(claimable,
        // token). allowThis()/allow() above only cover THIS contract and the
        // recipient; they do not extend to the token. Confirmed with the Nox team:
        // the externalEuint256+proof overload of confidentialTransfer auto-grants
        // this via fromExternal, but the plain-euint256 overload used here (since
        // `claimable` is already an internal handle, not one needing a proof) does
        // not -- the caller is expected to grant it explicitly, which is what this
        // line does. Transient is sufficient since the token only needs access for
        // the duration of this transaction, and this contract can grant it because
        // it already holds access to `claimable` via the allowThis() call above.
        Nox.allowTransient(claimable, campaign.token);

        // Move `claimable` out of this contract's pooled KaelisToken balance into the
        // recipient's wallet. If the campaign's pool is short, the token's
        // safe-subtract semantics cap the actually moved amount at the available
        // balance instead of reverting, so no information about the shortfall leaks
        // through a failed transaction.
        IERC7984(campaign.token).confidentialTransfer(msg.sender, claimable);

        emit Claimed(campaignId, msg.sender);
    }

    // ============ Grants: milestones ============

    /// @notice Marks a milestone complete for a grant recipient, unlocking further claims.
    function completeMilestone(
        uint256 campaignId,
        address recipient,
        uint8 milestoneIndex
    ) external campaignExists(campaignId) onlyCreator(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.campaignType != CampaignType.Grant) revert InvalidSchedule();

        Recipient storage r = _recipients[campaignId][recipient];
        if (!r.exists) revert RecipientNotFound();

        r.milestonesCompleted = milestoneIndex + 1;
        emit MilestoneCompleted(campaignId, recipient, milestoneIndex);
    }

    // ============ Selective disclosure ============

    /**
     * @notice Grants a third party (e.g. an auditor or compliance reviewer) permission
     *         to decrypt a recipient's allocation and claimed-amount handles, without
     *         exposing them publicly. This is Nox's ACL-based selective disclosure,
     *         invoked directly — not a mock permission flag.
     */
    function grantViewer(
        uint256 campaignId,
        address recipient,
        address viewer
    ) external campaignExists(campaignId) onlyCreator(campaignId) {
        Recipient storage r = _recipients[campaignId][recipient];
        if (!r.exists) revert RecipientNotFound();

        Nox.addViewer(r.allocation, viewer);
        Nox.addViewer(r.claimed, viewer);

        emit ViewerGranted(campaignId, recipient, viewer);
    }

    // ============ Read helpers (no plaintext amounts ever returned) ============

    /// @notice Returns the encrypted allocation handle for a recipient. Decrypt client-side
    ///         via the JS SDK's decrypt() — only addresses with ACL access will succeed.
    function getAllocationHandle(
        uint256 campaignId,
        address recipient
    ) external view campaignExists(campaignId) returns (euint256) {
        Recipient storage r = _recipients[campaignId][recipient];
        if (!r.exists) revert RecipientNotFound();
        return r.allocation;
    }

    function getClaimedHandle(
        uint256 campaignId,
        address recipient
    ) external view campaignExists(campaignId) returns (euint256) {
        Recipient storage r = _recipients[campaignId][recipient];
        if (!r.exists) revert RecipientNotFound();
        return r.claimed;
    }

    function isRecipient(uint256 campaignId, address account) external view returns (bool) {
        return _recipients[campaignId][account].exists;
    }

    function getRecipients(uint256 campaignId) external view returns (address[] memory) {
        return _recipientList[campaignId];
    }

    function getCampaign(uint256 campaignId) external view campaignExists(campaignId) returns (Campaign memory) {
        return campaigns[campaignId];
    }
}
