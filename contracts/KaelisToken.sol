// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol";
import {Nox, euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/**
 * @title KaelisToken
 * @notice Native confidential ERC-7984 token used to fund Kaelis campaigns. Balances
 *         and transfer amounts are encrypted euint256 handles managed by the Nox
 *         protocol's off-chain TEE compute pipeline — this contract itself contains no
 *         custom cryptography, it composes the official Nox confidential-contracts
 *         ERC7984 reference implementation (mint/burn/transfer balance bookkeeping,
 *         operator-based delegated transfers, overflow-safe primitives) with owner-gated
 *         minting so KaelisCampaignManager can fund campaigns on demand.
 *
 * Minting accepts an externally-encrypted amount (produced client-side via the Nox
 * JS SDK's encryptInput()) plus its proof, exactly as shown in OpenZeppelin's own
 * ERC7984MintableBurnable reference pattern -- the plaintext mint amount is never
 * submitted on-chain.
 */
contract KaelisToken is ERC7984, Ownable {
    constructor(
        string memory name_,
        string memory symbol_,
        string memory contractURI_,
        address owner_
    ) ERC7984(name_, symbol_, contractURI_) Ownable(owner_) {}

    /// @notice Mints an encrypted amount of tokens to `to`. Only the contract owner
    ///         (the Kaelis deployer / treasury) may mint, mirroring how a distributor
    ///         funds a campaign pool before recipients can claim against it.
    function mint(
        address to,
        externalEuint256 encryptedAmount,
        bytes calldata inputProof
    ) external onlyOwner returns (euint256) {
        euint256 amount = Nox.fromExternal(encryptedAmount, inputProof);
        return _mint(to, amount);
    }

    /// @notice Burns an encrypted amount of the caller's own tokens.
    function burn(externalEuint256 encryptedAmount, bytes calldata inputProof) external returns (euint256) {
        euint256 amount = Nox.fromExternal(encryptedAmount, inputProof);
        return _burn(msg.sender, amount);
    }

    // _mint(address,euint256) and _burn(address,euint256) are inherited directly from
    // ERC7984Base (they wrap _update with from/to == address(0)) -- no override needed.
}

