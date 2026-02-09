# Subscription Manager dApp 

A simple, end‑to‑end subscription application with: Solidity smart contracts, a tested Hardhat project, and a Next.js frontend that reads/writes on‑chain and gates content based on blockchain state.

What it does
- Users connect a wallet and purchase time‑boxed “subscription periods” using an ERC‑20 token.
- The frontend calls the contract to subscribe; the contract transfers tokens to a treasury address and extends the user’s expiry.
- A “Restricted” page checks on‑chain status (`isActive(address)`) and only renders content for active subscribers.
- A countdown shows time remaining; when it ends, a modal prompts the user to renew and returns them to the home page.


Key pieces
- Contracts (Hardhat)
  - `Subscription.sol`: ERC‑20 subscription manager.
    - Features: owner controls (price/period/treasury), `Pausable`, `ReentrancyGuard`, clear events, period caps, extend‑from‑current expiry logic.
    - Errors and events make integration straightforward and safe.
  - Tests: cover subscribe, gifting, admin setters, pause, and status helpers.
  - A minimal `TestToken` ERC‑20 exists for testnet demos.
- Frontend (Next.js)
  - Wallet connect via RainbowKit/Wagmi; all reads/writes use Wagmi hooks.
  - On‑chain gating: `/restricted` calls `isActive(address)` and only displays for valid subscribers.
  - UI/UX: blue/white theme, atoms (Button/Card/Alert/Input), feature components (SubscriptionSummary, PeriodSelector, Countdown, TxLink), expiry modal.
  - Reads are centralized in `src/hooks/reads.ts` to keep pages clean.

How it works (happy path)
1) Connect wallet.
2) Pick number of periods (defaults to 10 for a comfortable window).
3) If needed, Approve ERC‑20 allowance.
4) Click Subscribe. The app waits for the transaction/event and confirms on‑chain.
5) Go to Subscriber only view. The content is shown only while `isActive(address)` is true. A header countdown shows remaining time, and an expiry modal returns you to Home when time is up.

Deployed demo (Sepolia)
- Subscription: `0x47da0314C959C7A1715887B2Da12dF3703FB8Fbc`
- Token (TestToken): `0xa397ACd8Ee762ADFB1C587945E7516394e1136D3`

Notes
- You need Sepolia ETH for gas and the demo TestToken balance to subscribe.
- For production, swap in a real token (or WETH) and consider permit/Permit2 for one‑click subscribe and a multisig treasury.

Tech stack
- Contracts: Solidity 0.8.x, Hardhat, OpenZeppelin (Ownable2Step, Pausable, ReentrancyGuard, SafeERC20).
- Frontend: Next.js, React, RainbowKit, Wagmi/viem, CSS Modules.



