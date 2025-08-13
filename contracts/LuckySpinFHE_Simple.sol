// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, euint256, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract LuckySpinFHE_Simple is SepoliaConfig {
    // Encrypted user state
    mapping(address => euint64) private userSpins;
    mapping(address => euint64) private userGm; // Encrypted GM token balance
    mapping(address => euint256) private userRewards;

    // Plain helpers/state (non-sensitive)
    mapping(address => uint256) private lastCheckInTime; // Last check-in timestamp
    mapping(address => uint256) private lastCheckInDay; // Day bucket = timestamp / SECONDS_PER_DAY
    // Strict FHE encrypted aggregates
    mapping(address => euint64) private encryptedScore; // total score (encrypted)
    mapping(address => euint64) private encryptedLastSlot; // last spin result slot index (0-7)
    mapping(address => euint64) private encryptedPendingEthWei; // pending ETH rewards (encrypted)

    uint256 public constant SPIN_PRICE = 0.01 ether;
    uint256 public constant GM_TOKEN_RATE = 1000; // 1 ETH = 1000 GM tokens
    uint256 public constant SECONDS_PER_DAY = 24 * 60 * 60; // Reset at UTC 00:00
    address public owner;

    // Leaderboard (public scores)
    mapping(address => uint256) private publicScore;
    mapping(address => bool) private isScorePublished;
    address[] private publishedAddresses;
    mapping(address => uint256) private publishedIndex; // 1-based index in array, 0 means not present
    // Total on-chain score (deprecated in strict FHE). Use encryptedScore instead

    // Events
    event SpinPurchased(address indexed user, uint256 weiSpent, uint64 spinsBought);
    event SpinCompleted(address indexed user, string result);
    event SpinOutcome(address indexed user, uint8 slot, uint256 prizeWei, uint64 gmDelta);
    event SpinFailed(address indexed user, string reason);
    event GmTokensBought(address indexed user, uint256 amount);
    event GmTokensBoughtFHE(address indexed user);
    event SpinBoughtWithGm(address indexed user, uint64 count);
    event CheckInCompleted(address indexed user, uint256 timestamp);
    event EthClaimed(address indexed user, uint256 amount);
    event ScorePublished(address indexed user, uint256 score);
    event ScoreUnpublished(address indexed user);
    event ScoreUpdated(address indexed user, uint256 newTotalScore, uint256 delta);

    constructor() {
        owner = msg.sender;
    }

    // Trusted attestor for claim attestations (e.g., Zama oracle)
    address public attestor;
    mapping(address => uint256) public claimNonce;

    function setAttestor(address newAttestor) external {
        require(msg.sender == owner, "Only owner");
        attestor = newAttestor;
    }

    // Strict FHE: disable ETH-based spin purchase
    function buySpins(externalEuint64 /*encryptedAmount*/, bytes calldata /*proof*/) external payable {
        revert("Spin purchase via ETH disabled");
    }

    function buySpinsWithEth() external payable {
        revert("Spin purchase via ETH disabled");
    }

    // ETH-based GM purchase (ETH is public; GM credited as encrypted)
    function buyGmTokens() external payable {
        require(msg.value > 0, "Must send ETH");
        uint256 gmPlain = (msg.value * GM_TOKEN_RATE) / 1 ether;
        euint64 credit = FHE.asEuint64(uint64(gmPlain));
        euint64 currentGm = userGm[msg.sender];
        userGm[msg.sender] = FHE.add(currentGm, credit);
        FHE.allowThis(userGm[msg.sender]);
        FHE.allow(userGm[msg.sender], msg.sender);
        emit GmTokensBought(msg.sender, gmPlain);
    }

    // Strict FHE path: credit GM from encrypted input (demo)
    function buyGmTokensFHE(externalEuint64 encryptedAmount, bytes calldata proof) external payable {
        euint64 credit = FHE.fromExternal(encryptedAmount, proof);
        euint64 currentGm = userGm[msg.sender];
        userGm[msg.sender] = FHE.add(currentGm, credit);
        FHE.allowThis(userGm[msg.sender]);
        FHE.allow(userGm[msg.sender], msg.sender);
        emit GmTokensBoughtFHE(msg.sender);
    }

    // Buy exactly one spin using 10 GM tokens, strict FHE gate
    function buySpinWithGm() external {
        euint64 gm = userGm[msg.sender];
        ebool enough = FHE.gt(gm, FHE.asEuint64(9));
        userGm[msg.sender] = FHE.select(enough, FHE.sub(gm, FHE.asEuint64(10)), gm);
        FHE.allowThis(userGm[msg.sender]);
        FHE.allow(userGm[msg.sender], msg.sender);

        // Add 1 spin
        euint64 spins = userSpins[msg.sender];
        userSpins[msg.sender] = FHE.select(enough, FHE.add(spins, FHE.asEuint64(1)), spins);
        FHE.allowThis(userSpins[msg.sender]);
        FHE.allow(userSpins[msg.sender], msg.sender);

        emit SpinBoughtWithGm(msg.sender, 1);
    }

    // Daily check-in: once per day (UTC), grant 1 spin
    function checkIn() external {
        uint256 currentTime = block.timestamp;
        uint256 currentDay = currentTime / SECONDS_PER_DAY; // UTC day bucket
        uint256 lastDay = lastCheckInDay[msg.sender];
        require(currentDay > lastDay, "Already checked in today");

        lastCheckInDay[msg.sender] = currentDay;
        lastCheckInTime[msg.sender] = currentTime;

        // Grant 1 spin
        euint64 current = userSpins[msg.sender];
        userSpins[msg.sender] = FHE.add(current, FHE.asEuint64(1));
        FHE.allowThis(userSpins[msg.sender]);
        FHE.allow(userSpins[msg.sender], msg.sender);

        emit CheckInCompleted(msg.sender, currentTime);
    }

    function canCheckIn(address user) external view returns (bool) {
        uint256 currentDay = block.timestamp / SECONDS_PER_DAY;
        return currentDay > lastCheckInDay[user];
    }

    function getLastCheckInTime(address user) external view returns (uint256) {
        return lastCheckInTime[user];
    }

    function getTimeUntilNextCheckIn(address user) external view returns (uint256) {
        uint256 currentTime = block.timestamp;
        uint256 currentDay = currentTime / SECONDS_PER_DAY;
        if (currentDay > lastCheckInDay[user]) return 0;
        uint256 dayEndTs = (currentDay + 1) * SECONDS_PER_DAY;
        return dayEndTs > currentTime ? (dayEndTs - currentTime) : 0;
    }

    // Core spin with 8 fixed slots matching frontend
    function spin() external {
        euint64 spins = userSpins[msg.sender];
        ebool canSpin = FHE.gt(spins, FHE.asEuint64(0));
        userSpins[msg.sender] = FHE.select(canSpin, FHE.sub(spins, FHE.asEuint64(1)), spins);
        FHE.allowThis(userSpins[msg.sender]);
        FHE.allow(userSpins[msg.sender], msg.sender);

        // 8-slot wheel
        // 0: 0.1 ETH, 1: 0.01 ETH, 2-4: Empty, 5: 5 GM, 6: 15 GM, 7: 30 GM
        uint256 slot = uint256(
            keccak256(abi.encodePacked(block.prevrandao, block.timestamp, msg.sender, block.number))
        ) % 8;

        uint256 prizeWei = 0;
        string memory resultMsg = "Empty";

        if (slot == 0) {
            prizeWei = 0.1 ether;
            resultMsg = "Won 0.1 ETH";
        } else if (slot == 1) {
            prizeWei = 0.01 ether;
            resultMsg = "Won 0.01 ETH";
        } else if (slot >= 2 && slot <= 4) {
            resultMsg = "Empty";
        } else if (slot == 5) {
            // +5 GM
            euint64 gm = userGm[msg.sender];
            userGm[msg.sender] = FHE.add(gm, FHE.asEuint64(5));
            FHE.allowThis(userGm[msg.sender]);
            FHE.allow(userGm[msg.sender], msg.sender);
            resultMsg = "Won 5 GM";
        } else if (slot == 6) {
            // +15 GM
            euint64 gm2 = userGm[msg.sender];
            userGm[msg.sender] = FHE.select(canSpin, FHE.add(gm2, FHE.asEuint64(15)), gm2);
            FHE.allowThis(userGm[msg.sender]);
            FHE.allow(userGm[msg.sender], msg.sender);
            resultMsg = "Won 15 GM";
        } else {
            // slot == 7 → +30 GM
            euint64 gm3 = userGm[msg.sender];
            userGm[msg.sender] = FHE.select(canSpin, FHE.add(gm3, FHE.asEuint64(30)), gm3);
            FHE.allowThis(userGm[msg.sender]);
            FHE.allow(userGm[msg.sender], msg.sender);
            resultMsg = "Won 30 GM";
        }
        // Emit score delta only
        emit ScoreUpdated(msg.sender, 0, 100);

        // Emit compact outcome for faster frontend decode
        uint64 gmDelta = slot == 5 ? 5 : (slot == 6 ? 15 : (slot == 7 ? 30 : 0));
        emit SpinOutcome(msg.sender, uint8(slot), prizeWei, gmDelta);
        emit SpinCompleted(msg.sender, resultMsg);
    }

    // Leaderboard public/unpublic
    function publishScore(uint256 score) external {
        if (!isScorePublished[msg.sender]) {
            isScorePublished[msg.sender] = true;
            publishedAddresses.push(msg.sender);
            publishedIndex[msg.sender] = publishedAddresses.length; // 1-based
        }
        publicScore[msg.sender] = score;
        emit ScorePublished(msg.sender, score);
    }

    function unpublishScore() external {
        if (!isScorePublished[msg.sender]) return;
        isScorePublished[msg.sender] = false;
        delete publicScore[msg.sender];

        // Remove from array in O(1)
        uint256 idx = publishedIndex[msg.sender];
        if (idx != 0) {
            uint256 last = publishedAddresses.length;
            if (idx != last) {
                address lastAddr = publishedAddresses[last - 1];
                publishedAddresses[idx - 1] = lastAddr;
                publishedIndex[lastAddr] = idx;
            }
            publishedAddresses.pop();
            publishedIndex[msg.sender] = 0;
        }
        emit ScoreUnpublished(msg.sender);
    }

    // View helpers
    function getUserSpins(address user) external view returns (euint64) {
        return userSpins[user];
    }

    function getUserGmBalance(address user) external view returns (euint64) {
        return userGm[user];
    }

    // Removed claimableEth in strict path

    function getPublicScore(address user) external view returns (uint256) {
        return publicScore[user];
    }

    function isPublished(address user) external view returns (bool) {
        return isScorePublished[user];
    }

    function getPublishedAddresses() external view returns (address[] memory) {
        return publishedAddresses;
    }

    // Removed plain mirrors and totalScore

    // Leaderboard slice for pagination
    function getPublishedRange(
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory addrs, uint256[] memory scores) {
        uint256 n = publishedAddresses.length;
        if (offset >= n) {
            return (new address[](0), new uint256[](0));
        }
        uint256 end = offset + limit;
        if (end > n) end = n;
        uint256 len = end - offset;
        addrs = new address[](len);
        scores = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            address addr = publishedAddresses[offset + i];
            addrs[i] = addr;
            scores[i] = publicScore[addr];
        }
    }

    // Dashboard bundle: user state + leaderboard slice
    function getDashboardState(
        address user,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            euint64 spinsEnc,
            euint64 gmEnc,
            uint64 spinsPlain,
            uint256 claimable,
            bool published,
            uint256 score,
            uint256 lastCheckIn,
            address[] memory addrs,
            uint256[] memory scores
        )
    {
        (address[] memory a, uint256[] memory s) = this.getPublishedRange(offset, limit);
        return (
            userSpins[user],
            userGm[user],
            0,
            0,
            isScorePublished[user],
            publicScore[user],
            lastCheckInTime[user],
            a,
            s
        );
    }

    // Batch getter to speed up frontend load
    function getUserState(
        address user
    )
        external
        view
        returns (
            euint64 spinsEnc,
            euint64 gmEnc,
            uint64 spinsPlain,
            uint256 claimable,
            bool published,
            uint256 score,
            uint256 lastCheckIn
        )
    {
        return (
            userSpins[user],
            userGm[user],
            0,
            0,
            isScorePublished[user],
            publicScore[user],
            lastCheckInTime[user]
        );
    }

    // Claim moved to strict contract version

    // Helper to re-authorize user's decrypt permissions without changing values
    function reauthorize() external {
        FHE.allowThis(userSpins[msg.sender]);
        FHE.allow(userSpins[msg.sender], msg.sender);
        FHE.allowThis(userGm[msg.sender]);
        FHE.allow(userGm[msg.sender], msg.sender);
        FHE.allowThis(userRewards[msg.sender]);
        FHE.allow(userRewards[msg.sender], msg.sender);
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function emergencyWithdraw() external {
        require(msg.sender == owner, "Only owner");
        payable(owner).transfer(address(this).balance);
    }

    receive() external payable {}
}
