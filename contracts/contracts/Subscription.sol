// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";



contract Subscription is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error ZeroAddress();
    error InvalidPeriod();
    error NoSubscription();
    error SubscriptionInvalid();
    error ZeroPeriods();
    error TooManyPeriods();

    event Subscribed(address indexed payer, address indexed user, uint256 periods, uint64 newExpiry, uint256 amount);
    event Canceled(address indexed user, uint64 oldExpiry);
    event PriceUpdated(uint256 oldSubscriptionPrice, uint256 newSubscriptionPrice);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event PeriodSecondsUpdated(uint64 oldPeriodSeconds, uint64 newPeriodSeconds);

    IERC20 public immutable token;

    mapping(address => uint64) public expiresAt;

    address public treasury;
    uint256 public subscriptionPrice;
    uint64 public subscriptionPeriod;

    uint256 public constant MAX_PERIODS_PER_TX = 365;

    constructor(
        address token_,
        address treasury_,
        uint256 subscriptionPrice_,
        uint64 subscriptionPeriod_
    ) Ownable(msg.sender) {
        if (token_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        if (subscriptionPeriod_ == 0) revert InvalidPeriod();

        token = IERC20(token_);
        treasury = treasury_;
        subscriptionPrice = subscriptionPrice_;
        subscriptionPeriod = subscriptionPeriod_;

    }

     
    function subscribe(uint256 period) external whenNotPaused nonReentrant {
        _subscribeFor(msg.sender, msg.sender, period);
    }

    function giftSubscription(address user, uint256 period) external whenNotPaused nonReentrant {
        if (user == address(0)) revert ZeroAddress();
        _subscribeFor(msg.sender, user, period);
    }

    function isActive(address user) external view returns (bool) {
        return block.timestamp < expiresAt[user]; 
    }

    function timeLeft(address user) external view returns(uint64){
        uint64 exp = expiresAt[user];
        if (block.timestamp >= exp) return 0;
        return exp - uint64(block.timestamp);
    }

    function cancel(address user) external onlyOwner{
        uint64 oldExp = expiresAt[user];
        expiresAt[user] = uint64(block.timestamp);
        emit Canceled(user, oldExp);
    }

    function setPrice(uint256 newPrice) external onlyOwner {
        uint256 old = subscriptionPrice;
        subscriptionPrice = newPrice;
        emit PriceUpdated(old, newPrice);
    }
    // account holding fees
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        address old = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(old, newTreasury);
    }

    function setSubscriptionPeriod(uint64 newSubscriptionPeriod) external onlyOwner {
        if (newSubscriptionPeriod == 0) revert InvalidPeriod();
        uint64 old = subscriptionPeriod;
        subscriptionPeriod = newSubscriptionPeriod;
        emit PeriodSecondsUpdated(old, newSubscriptionPeriod);
    }

    function pause() external onlyOwner(){
        _pause();
    }

    function unpause() external onlyOwner(){
        _unpause();
    }

    function _subscribeFor(address payer, address user, uint256 period) internal{
        if (period == 0) revert ZeroPeriods();
        if (period > MAX_PERIODS_PER_TX) revert TooManyPeriods();

        uint256 amount = subscriptionPrice * period;

        // Start from current expiry if still active, otherwise from now
        uint64 current = expiresAt[user];
        uint64 start = current > uint64(block.timestamp) ? current : uint64(block.timestamp);
        uint64 newExp = start + uint64(period) * subscriptionPeriod;

        expiresAt[user] = newExp;

        // Pull funds from payer to treasury
        token.safeTransferFrom(payer, treasury, amount);

        emit Subscribed(payer, user, period, newExp, amount);
    }
}
