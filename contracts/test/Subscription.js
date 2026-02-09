const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Subscription", function () {
  async function deployFixture() {
    const [owner, treasury, alice, bob, other] = await ethers.getSigners();

    const TestToken = await ethers.getContractFactory("TestToken");
    const token = await TestToken.deploy();

    const PRICE = 1_000n;
    const PERIOD = 30n * 24n * 60n * 60n; // 30 days

    const Subscription = await ethers.getContractFactory("Subscription");
    const sub = await Subscription.deploy(token.target, treasury.address, PRICE, PERIOD);

    // Fund users
    await token.mint(alice.address, 1_000_000n);
    await token.mint(bob.address, 1_000_000n);

    return { owner, treasury, alice, bob, other, token, sub, PRICE, PERIOD };
  }

  it("constructor: reverts for zero period", async () => {
    const [owner, treasury] = await ethers.getSigners();
    const TestToken = await ethers.getContractFactory("TestToken");
    const token = await TestToken.deploy();

    const Subscription = await ethers.getContractFactory("Subscription");
    await expect(
      Subscription.deploy(token.target, treasury.address, 1_000n, 0)
    ).to.be.revertedWithCustomError(Subscription, "InvalidPeriod");
  });

  describe("subscribe flow", function () {
    it("charges tokens, sets expiry, emits event", async function () {
      const { alice, treasury, token, sub, PRICE, PERIOD } = await loadFixture(deployFixture);

      // Approve large allowance for recurring subscribes
      await (await token.connect(alice).approve(sub.target, ethers.MaxUint256)).wait();
      const start = BigInt(await time.latest());

      const balA0 = await token.balanceOf(alice.address);
      const balT0 = await token.balanceOf(treasury.address);
      const tx1 = await sub.connect(alice).subscribe(2);
      await tx1.wait();
      const balA1 = await token.balanceOf(alice.address);
      const balT1 = await token.balanceOf(treasury.address);
      expect(balA0 - balA1).to.equal(PRICE * 2n);
      expect(balT1 - balT0).to.equal(PRICE * 2n);

      const exp = await sub.expiresAt(alice.address);
      expect(exp).to.be.gte(start + PERIOD * 2n);

      await expect(() => sub.connect(alice).subscribe(1))
        .to.changeTokenBalances(token, [alice, treasury], [-PRICE, PRICE]);
    });

    it("extends from current expiry if active", async function () {
      const { alice, token, sub, PRICE, PERIOD } = await loadFixture(deployFixture);
      await token.connect(alice).approve(sub.target, PRICE * 10n);

      await sub.connect(alice).subscribe(2);
      const exp1 = await sub.expiresAt(alice.address);

      await sub.connect(alice).subscribe(1);
      const exp2 = await sub.expiresAt(alice.address);
      expect(exp2).to.equal(exp1 + PERIOD);
    });

    it("rejects zero or too many periods", async function () {
      const { alice, token, sub } = await loadFixture(deployFixture);
      await token.connect(alice).approve(sub.target, 1_000_000n);
      await expect(sub.connect(alice).subscribe(0)).to.be.revertedWithCustomError(sub, "ZeroPeriods");
      await expect(sub.connect(alice).subscribe(366)).to.be.revertedWithCustomError(sub, "TooManyPeriods");
    });
  });

  describe("giftSubscription", function () {
    it("pays with payer's tokens and sets recipient expiry", async function () {
      const { alice, bob, treasury, token, sub, PRICE, PERIOD } = await loadFixture(deployFixture);
      await (await token.connect(alice).approve(sub.target, PRICE * 2n)).wait();

      await expect(sub.connect(alice).giftSubscription(bob.address, 1))
        .to.emit(sub, "Subscribed")
        .withArgs(alice.address, bob.address, 1, anyValue, PRICE);

      const exp = await sub.expiresAt(bob.address);
      expect(exp).to.be.gt(0);

      await expect(() => sub.connect(alice).giftSubscription(bob.address, 1))
        .to.changeTokenBalances(token, [alice, treasury], [-PRICE, PRICE]);
    });
  });

  describe("admin setters", function () {
    it("only owner can set price", async function () {
      const { sub, other } = await loadFixture(deployFixture);
      await expect(sub.connect(other).setPrice(12345)).to.be.revertedWithCustomError(sub, "OwnableUnauthorizedAccount");
    });

    it("updates price and emits event", async function () {
      const { sub } = await loadFixture(deployFixture);
      const old = await sub.subscriptionPrice();
      await expect(sub.setPrice(old + 1n)).to.emit(sub, "PriceUpdated").withArgs(old, old + 1n);
    });

    it("only owner can set subscription period and not zero", async function () {
      const { sub, other } = await loadFixture(deployFixture);
      await expect(sub.connect(other).setSubscriptionPeriod(1)).to.be.revertedWithCustomError(sub, "OwnableUnauthorizedAccount");
      await expect(sub.setSubscriptionPeriod(0)).to.be.revertedWithCustomError(sub, "InvalidPeriod");
    });

    it("updates period and emits event", async function () {
      const { sub } = await loadFixture(deployFixture);
      const old = await sub.subscriptionPeriod();
      await expect(sub.setSubscriptionPeriod(old + 1n))
        .to.emit(sub, "PeriodSecondsUpdated")
        .withArgs(old, old + 1n);
    });
  });

  describe("pausable", function () {
    it("prevents subscribing when paused", async function () {
      const { sub, alice, token } = await loadFixture(deployFixture);
      await sub.pause();
      await token.connect(alice).approve(sub.target, 10_000n);
      await expect(sub.connect(alice).subscribe(1)).to.be.revertedWithCustomError(sub, "EnforcedPause");
    });
  });

  describe("status helpers", function () {
    it("isActive and timeLeft reflect expiry and cancellation", async function () {
      const { sub, alice, token, PRICE, PERIOD } = await loadFixture(deployFixture);
      await token.connect(alice).approve(sub.target, PRICE);
      await sub.connect(alice).subscribe(1);
      expect(await sub.isActive(alice.address)).to.equal(true);
      expect(await sub.timeLeft(alice.address)).to.be.greaterThan(0);

      // Fast-forward beyond expiry
      await time.increase(PERIOD + 1n);
      expect(await sub.isActive(alice.address)).to.equal(false);
      expect(await sub.timeLeft(alice.address)).to.equal(0);

      // Grant again and then cancel
      await token.connect(alice).approve(sub.target, PRICE);
      await sub.connect(alice).subscribe(1);
      expect(await sub.isActive(alice.address)).to.equal(true);

      await sub.cancel(alice.address);
      expect(await sub.isActive(alice.address)).to.equal(false);
    });
  });
});
