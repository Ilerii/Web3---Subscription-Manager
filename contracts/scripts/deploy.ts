import { ethers, run } from "hardhat";

// Load env if available
try { require("dotenv").config(); } catch {}

async function main() {
  let token = process.env.TOKEN_ADDRESS;
  let treasury = process.env.TREASURY_ADDRESS;
  const priceRaw = process.env.SUB_PRICE; // token smallest units per period (e.g., USDC: 5_000_000)
  const periodRaw = process.env.SUB_PERIOD_SECONDS; // seconds per period (e.g., 2592000 for ~30 days)
  const deployTestToken = String(process.env.DEPLOY_TEST_TOKEN || "").toLowerCase() === "true";

  if (!token && !deployTestToken) throw new Error("TOKEN_ADDRESS missing or set DEPLOY_TEST_TOKEN=true to deploy a TestToken");
  if (!priceRaw) throw new Error("SUB_PRICE missing");
  if (!periodRaw) throw new Error("SUB_PERIOD_SECONDS missing");

  const price = BigInt(priceRaw);
  const period = BigInt(periodRaw);

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  if (!treasury || !ethers.isAddress(treasury)) {
    treasury = deployerAddress;
    console.log("No valid TREASURY_ADDRESS provided; defaulting to deployer:", treasury);
  }
  console.log("Deployer:", deployerAddress);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  // Optionally deploy a TestToken first
  if (deployTestToken) {
    const TT = await ethers.getContractFactory("TestToken");
    const tt = await TT.deploy();
    console.log("TestToken deploy tx:", tt.deploymentTransaction()?.hash);
    await tt.waitForDeployment();
    token = tt.target as string;
    console.log("TestToken deployed at:", token);
  }

  if (!token || !ethers.isAddress(token)) throw new Error("Resolved TOKEN_ADDRESS is invalid");

  console.log("Token:", token);
  console.log("Treasury:", treasury);
  console.log("Price (per period, raw):", price.toString());
  console.log("Period (seconds):", period.toString());

  const Sub = await ethers.getContractFactory("Subscription");
  const sub = await Sub.deploy(token, treasury, price, period);
  console.log("Deploy tx:", sub.deploymentTransaction()?.hash);
  await sub.waitForDeployment();
  const address = sub.target as string;
  console.log("Subscription deployed at:", address);

  // Optional verify
  const wantVerify = process.env.VERIFY !== "false" && !!process.env.ETHERSCAN_API_KEY;
  if (wantVerify) {
    // Give Etherscan a moment and attempt verification
    try {
      console.log("Verifying on Etherscan...");
      await run("verify:verify", {
        address,
        constructorArguments: [token, treasury, price, period],
      });
      console.log("Verified successfully");
    } catch (e) {
      console.warn("Verification attempt failed:", (e as Error).message);
    }
  }

  console.log("\nFrontend env snippet:");
  console.log(`NEXT_PUBLIC_SUBSCRIPTION_ADDRESS=${address}`);
  console.log(`NEXT_PUBLIC_TOKEN_ADDRESS=${token}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
