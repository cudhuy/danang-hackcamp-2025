# DOT UI Kit

An open-source, up-to-date, opinionated UI scaffolding kit for the Polkadot ecosystem (starting with Asset Hub). The technical stack is:

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide icons](https://lucide.dev/)
- [ShadCN UI](https://ui.shadcn.com/)
- [RainbowKit](https://www.rainbowkit.com/)
- [Wagmi](https://wagmi.sh/)
- [Viem](https://viem.sh/)
- [Jotai](https://jotai.org/)
- [Tanstack React Query](https://tanstack.com/query)
- [Vaul](https://vaul.fun/)
- [Zod](https://zod.dev/)
- [React Hook Form](https://react-hook-form.com/)

## Features

- [x] Multi-chain support
- [x] In-dapp-wallet support
- [x] WalletConnect support
- [x] Collection of web3 components to quickly build your frontend or use as a reference
- [x] React hooks for various onchain interactions with Wagmi

## Requirements

Before you begin, you need to install the following tools:

- [Node (current LTS version)](https://nodejs.org/en/download/)
- [npm (latest version or > v10)](https://www.npmjs.com/get-npm)
- [Git](https://git-scm.com/downloads)

## Getting started

```
git clone https://github.com/buildstationorg/dotui.git
cd dotui
npm install
```

## Running the project

```
npm run dev
```

Default port is 3002. You can change the port in the `package.json` file.

```json
"scripts": {
  "dev": "next dev -p 3002", // Change the port here to -p <port>
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
},
```

## Building the project

```
npm run build
```

## Documentation

Please see [`docs`](docs) for more information and guidelines for contributing to DotUI.

## Contributing to DotUI

We welcome contributions to DotUI!

Please see [`CONTRIBUTING.md`](CONTRIBUTING.md) for more information and guidelines for contributing to DotUI.

## Challenge details

A decentralized lending and borrowing protocol built on Polkadot Asset Hub that enables users to lend their assets and borrow against their collateral, leveraging Polkadot's cross-chain capabilities and security features.

## Functional Specifications

- Collateral System : Users can deposit tokens as collateral, withdraw them when not locked in a loan, and use this collateral to secure their borrowing needs.

- Lending System : Users can borrow tokens against their collateral up to a limit determined by the collateral factor, with the restriction of having only one active loan at a time.

- Repayment System: Users can repay their loans either partially or in full, with the loan status automatically updating to reflect the current repayment state.

## Implementation Smart Contract Requirements

Link contract: [Contract](./contracts)

### 1. Core Functions

- [x] **depositCollateral**: Implement collateral deposit logic

- [x] **withdrawCollateral**: Implement collateral withdrawal logic

- [x] **takeLoan**: Implement loan taking logic

- [x] **repayLoan**: Implement loan repayment logic

### 2. Helper Functions

- [x] **\_loanRequiredCollateral**: Implement required collateral calculation

- [x] **getLoanDetails**: Implement loan information retrieval

### 3. Admin Functions

- [x] **setCollateralFactor**: Implement collateral factor update

### 4. Tests

- [x] Test all function implementations

## Implementation UI Requirements

Link UI sample: [DOT UI](./frontend)

Build the UI with features based on the requirements:

- [x] **Deposit/Withdraw Collateral**
- [x] **Loan and Repay**
- [x] **Show loan details**

## Submission Requirements

- [x] Finish `TODO` smart contract logic
- [x] Complete UI
- [x] Run tests
- [x] Deploy to Paseo Asset Hub