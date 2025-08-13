// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, euint256, externalEuint64, externalEuint256, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title LuckySpinFHE_ACL_Simple
 * @dev Lucky Spin contract with simplified ACL implementation
 * Based on Zama documentation: https://docs.zama.ai/protocol/solidity-guides/smart-contract/acl
 */
contract LuckySpinFHE_ACL_Simple is SepoliaConfig {
    // ============ STATE VARIABLES ============

    // User data with ACL
    mapping(address => euint64) private userSpins;
    mapping(address => euint256) private userRewards;
    mapping(address => uint256) private lastGmTime;
    // GM token balance (encrypted, 64-bit is sufficient for demo)
    mapping(address => euint64) private gmTokenBalance;
    // Claimable ETH per user (plain, aggregated from rewards)
    mapping(address => uint256) private claimableEth;
    // Daily GM streak counter (plain)
    mapping(address => uint256) private gmStreak;

    // ACL Host Contract - manages access to encrypted data
    address public aclHost;

    // Access control mappings
    mapping(address => bool) private authorizedUsers;
    mapping(address => bool) private authorizedRelayers;

    // Constants
    uint256 public constant SPIN_PRICE = 0.01 ether;
    uint256 public constant GM_TOKEN_RATE = 100;
    uint256 public constant DAILY_GM_RESET_HOUR = 0;
    uint256 public constant SECONDS_PER_DAY = 24 * 60 * 60;

    // Owner
    address public owner;

    // ============ EVENTS ============

    event SpinPurchased(address indexed user, uint256 value);
    event SpinCompleted(address indexed user, string result);
    event GmTokensBought(address indexed user, uint256 amount);
    event DailyGmCompleted(address indexed user, uint256 timestamp);
    event ScorePublished(address indexed user, uint256 score);

    // ACL Events
    event UserAuthorized(address indexed user);
    event UserDeauthorized(address indexed user);
    event RelayerAuthorized(address indexed relayer);
    event RelayerDeauthorized(address indexed relayer);
    event AclHostUpdated(address indexed oldHost, address indexed newHost);

    // ============ MODIFIERS ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedUsers[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlyRelayer() {
        require(authorizedRelayers[msg.sender] || msg.sender == owner, "Not authorized relayer");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(address _aclHost) {
        owner = msg.sender;
        aclHost = _aclHost;

        // Authorize owner
        authorizedUsers[msg.sender] = true;
        authorizedRelayers[msg.sender] = true;

        emit UserAuthorized(msg.sender);
        emit RelayerAuthorized(msg.sender);
    }

    // ============ ACL MANAGEMENT ============

    /**
     * @dev Authorize a user to access encrypted data
     */
    function authorizeUser(address user) external onlyOwner {
        authorizedUsers[user] = true;
        emit UserAuthorized(user);
    }

    /**
     * @dev Deauthorize a user
     */
    function deauthorizeUser(address user) external onlyOwner {
        authorizedUsers[user] = false;
        emit UserDeauthorized(user);
    }

    /**
     * @dev Authorize a relayer to submit transactions
     */
    function authorizeRelayer(address relayer) external onlyOwner {
        authorizedRelayers[relayer] = true;
        emit RelayerAuthorized(relayer);
    }

    /**
     * @dev Deauthorize a relayer
     */
    function deauthorizeRelayer(address relayer) external onlyOwner {
        authorizedRelayers[relayer] = false;
        emit RelayerDeauthorized(relayer);
    }

    /**
     * @dev Update ACL host contract
     */
    function updateAclHost(address newHost) external onlyOwner {
        address oldHost = aclHost;
        aclHost = newHost;
        emit AclHostUpdated(oldHost, newHost);
    }

    /**
     * @dev Check if user is authorized
     */
    function isUserAuthorized(address user) external view returns (bool) {
        return authorizedUsers[user] || user == owner;
    }

    /**
     * @dev Check if relayer is authorized
     */
    function isRelayerAuthorized(address relayer) external view returns (bool) {
        return authorizedRelayers[relayer] || relayer == owner;
    }

    // ============ CORE FUNCTIONS WITH ACL ============

    /**
     * @dev Buy spins with encrypted amount and ACL validation
     */
    function buySpins(externalEuint64 encryptedAmount, bytes calldata proof) external payable onlyAuthorized {
        require(msg.value > 0, "Must send ETH");

        // Validate encrypted input
        euint64 amount = FHE.fromExternal(encryptedAmount, proof);

        // Update user spins
        euint64 current = userSpins[msg.sender];
        userSpins[msg.sender] = FHE.add(current, amount);

        // Grant access to updated data for contract and user (user-decrypt path)
        FHE.allowThis(userSpins[msg.sender]);
        FHE.allow(userSpins[msg.sender], msg.sender);

        emit SpinPurchased(msg.sender, msg.value);
    }

    /**
     * @dev Buy GM tokens with encrypted amount and ACL validation
     */
    function buyGmTokens(externalEuint64 encryptedAmount, bytes calldata proof) external payable onlyAuthorized {
        require(msg.value > 0, "Must send ETH");
        require(msg.value >= 0.001 ether, "Minimum ETH required for GM tokens");

        // Validate encrypted input and get encrypted GM amount to credit
        euint64 amount = FHE.fromExternal(encryptedAmount, proof);

        // Update GM token balance (encrypted)
        euint64 currentGm = gmTokenBalance[msg.sender];
        gmTokenBalance[msg.sender] = FHE.add(currentGm, amount);

        // Grant access to updated data for contract and user (user-decrypt path)
        FHE.allowThis(gmTokenBalance[msg.sender]);
        FHE.allow(gmTokenBalance[msg.sender], msg.sender);

        emit GmTokensBought(msg.sender, msg.value);
    }

    /**
     * @dev Daily GM with encrypted value and ACL validation
     */
    function dailyGm(externalEuint64 encryptedGmValue, bytes calldata proof) external onlyAuthorized {
        // Validate encrypted input (proof required by protocol)
        euint64 gmValue = FHE.fromExternal(encryptedGmValue, proof);

        uint256 currentTime = block.timestamp;
        uint256 last = lastGmTime[msg.sender];
        require(currentTime >= last + SECONDS_PER_DAY, "Daily GM already claimed today");

        // Update streak: if within 2 days window keep streak, else reset to 1
        if (last != 0 && currentTime <= last + (2 * SECONDS_PER_DAY)) {
            gmStreak[msg.sender] = gmStreak[msg.sender] + 1;
        } else {
            gmStreak[msg.sender] = 1;
        }

        lastGmTime[msg.sender] = currentTime;

        // Add provided encrypted GM value
        euint64 currentGm = gmTokenBalance[msg.sender];
        gmTokenBalance[msg.sender] = FHE.add(currentGm, gmValue);

        // Grant access to updated data for contract and user (user-decrypt path)
        FHE.allowThis(gmTokenBalance[msg.sender]);
        FHE.allow(gmTokenBalance[msg.sender], msg.sender);

        emit DailyGmCompleted(msg.sender, currentTime);
    }

    /**
     * @dev Spin with ACL validation
     */
    function spin() external onlyAuthorized {
        // Subtract 1 spin
        euint64 spins = userSpins[msg.sender];
        userSpins[msg.sender] = FHE.sub(spins, FHE.asEuint64(1));

        // Grant access to updated spins (contract + user)
        FHE.allowThis(userSpins[msg.sender]);
        FHE.allow(userSpins[msg.sender], msg.sender);

        // Generate new reward
        euint64 newReward = FHE.randEuint64();
        userRewards[msg.sender] = FHE.asEuint256(newReward);

        // Grant access to updated rewards (contract + user)
        FHE.allowThis(userRewards[msg.sender]);
        FHE.allow(userRewards[msg.sender], msg.sender);

        emit SpinCompleted(msg.sender, "Spin completed");
    }

    // ============ VIEW FUNCTIONS WITH ACL ============

    /**
     * @dev Get user spins with ACL check
     */
    function getUserSpins(address user) external view returns (euint64) {
        require(authorizedUsers[msg.sender] || msg.sender == user || msg.sender == owner, "Not authorized");
        return userSpins[user];
    }

    /**
     * @dev Get user rewards with ACL check
     */
    function getUserRewards(address user) external view returns (euint256) {
        require(authorizedUsers[msg.sender] || msg.sender == user || msg.sender == owner, "Not authorized");
        return userRewards[user];
    }

    /**
     * @dev Check if user can GM today
     */
    function canGmToday(address user) external view returns (bool) {
        uint256 currentTime = block.timestamp;
        uint256 lastGm = lastGmTime[user];
        return currentTime >= lastGm + SECONDS_PER_DAY;
    }

    /**
     * @dev Get last GM time for user
     */
    function getLastGmTime(address user) external view returns (uint256) {
        return lastGmTime[user];
    }

    /**
     * @dev Get time until next GM
     */
    function getTimeUntilNextGm(address user) external view returns (uint256) {
        uint256 currentTime = block.timestamp;
        uint256 lastGm = lastGmTime[user];
        uint256 nextGmTime = lastGm + SECONDS_PER_DAY;

        if (currentTime >= nextGmTime) {
            return 0;
        } else {
            return nextGmTime - currentTime;
        }
    }

    /**
     * @dev Combined daily GM status for convenience
     */
    function getDailyStatus(address user) external view returns (bool canGm, uint256 timeUntilNext, uint256 lastGm) {
        uint256 currentTime = block.timestamp;
        lastGm = lastGmTime[user];
        uint256 nextGmTime = lastGm + SECONDS_PER_DAY;
        canGm = currentTime >= nextGmTime;
        timeUntilNext = canGm ? 0 : (nextGmTime - currentTime);
    }

    /**
     * @dev Preview how many spins are purchased for a given wei amount
     */
    function previewSpinsFromEth(uint256 weiAmount) external pure returns (uint256) {
        return weiAmount / SPIN_PRICE;
    }

    /**
     * @dev Preview how many GM tokens are received for a given wei amount
     */
    function previewGmFromEth(uint256 weiAmount) external pure returns (uint256) {
        // GM_TOKEN_RATE is defined per 1 ETH; convert from wei
        return (weiAmount * GM_TOKEN_RATE) / 1 ether;
    }

    /**
     * @dev Explicit getters for frontends (mirrors public constants)
     */
    function getSpinPrice() external pure returns (uint256) {
        return SPIN_PRICE;
    }

    function getGmTokenRate() external pure returns (uint256) {
        return GM_TOKEN_RATE;
    }

    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get user's GM token balance (encrypted)
     */
    function getUserGmBalance(address user) external view returns (euint64) {
        require(authorizedUsers[msg.sender] || msg.sender == user || msg.sender == owner, "Not authorized");
        return gmTokenBalance[user];
    }

    /**
     * @dev Publish a user's score (plain) for leaderboard
     */
    mapping(address => uint256) private publicScore;

    function publishScore(uint256 score) external onlyAuthorized {
        publicScore[msg.sender] = score;
        emit ScorePublished(msg.sender, score);
    }

    /**
     * @dev Claim accrued ETH (if any)
     */
    function claimETH() external {
        uint256 amount = claimableEth[msg.sender];
        require(amount > 0, "No ETH to claim");
        claimableEth[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Emergency withdraw
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    /**
     * @dev Grant access to encrypted data for a specific user
     */
    function grantAccess(address user, euint64 data) external onlyOwner {
        FHE.allow(data, user);
    }

    /**
     * @dev Grant transient access to encrypted data
     */
    function grantTransientAccess(address user, euint64 data) external onlyOwner {
        FHE.allowTransient(data, user);
    }

    // ============ FALLBACK ============

    receive() external payable {}
}
