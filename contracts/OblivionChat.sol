// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title OblivionChat
/// @notice Stores chat messages encrypted client-side, and stores the per-message key encrypted with FHEVM.
contract OblivionChat is ZamaEthereumConfig {
    struct Message {
        address from;
        uint64 timestamp;
        string ciphertext;
        euint64 encryptedKey;
    }

    mapping(address => Message[]) private _inbox;

    event MessageSent(address indexed from, address indexed to, uint256 indexed index, uint256 timestamp);

    /// @notice Send an encrypted message to a recipient.
    /// @param to The recipient address.
    /// @param ciphertext The message encrypted client-side with the random key A.
    /// @param encryptedKey The random key A encrypted with FHEVM.
    /// @param inputProof The proof for the encrypted input.
    function sendMessage(address to, string calldata ciphertext, externalEuint64 encryptedKey, bytes calldata inputProof)
        external
    {
        require(to != address(0), "InvalidRecipient");

        euint64 key = FHE.fromExternal(encryptedKey, inputProof);

        _inbox[to].push(
            Message({from: msg.sender, timestamp: uint64(block.timestamp), ciphertext: ciphertext, encryptedKey: key})
        );

        // Allow the contract to keep the ciphertext, and allow both sender and recipient to user-decrypt the key.
        FHE.allowThis(key);
        FHE.allow(key, to);
        FHE.allow(key, msg.sender);

        emit MessageSent(msg.sender, to, _inbox[to].length - 1, block.timestamp);
    }

    /// @notice Returns the inbox size for a given user.
    function inboxCount(address user) external view returns (uint256) {
        return _inbox[user].length;
    }

    /// @notice Returns one inbox message by index.
    /// @dev View functions must not rely on msg.sender; callers must provide the user address explicitly.
    function getInboxMessage(address user, uint256 index)
        external
        view
        returns (address from, uint256 timestamp, string memory ciphertext, euint64 encryptedKey)
    {
        Message storage message_ = _inbox[user][index];
        return (message_.from, message_.timestamp, message_.ciphertext, message_.encryptedKey);
    }

    /// @notice Returns a slice of inbox messages, useful to reduce RPC roundtrips.
    function getInboxSlice(address user, uint256 start, uint256 limit)
        external
        view
        returns (address[] memory froms, uint64[] memory timestamps, string[] memory ciphertexts, bytes32[] memory keys)
    {
        uint256 length = _inbox[user].length;
        if (start >= length) {
            return (new address[](0), new uint64[](0), new string[](0), new bytes32[](0));
        }

        uint256 end = start + limit;
        if (end > length) end = length;
        uint256 size = end - start;

        froms = new address[](size);
        timestamps = new uint64[](size);
        ciphertexts = new string[](size);
        keys = new bytes32[](size);

        for (uint256 i = 0; i < size; i++) {
            Message storage message_ = _inbox[user][start + i];
            froms[i] = message_.from;
            timestamps[i] = message_.timestamp;
            ciphertexts[i] = message_.ciphertext;
            keys[i] = euint64.unwrap(message_.encryptedKey);
        }
    }
}
