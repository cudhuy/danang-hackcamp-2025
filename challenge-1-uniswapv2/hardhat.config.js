require('@nomicfoundation/hardhat-toolbox');
require('@parity/hardhat-polkadot');

require('dotenv').config();

require('./tasks/compile-revive.js');
require('./tasks/deploy.js');

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
	solidity: '0.8.28',
	resolc: {
		version: '1.5.2',
		compilerSource: 'npm',
		settings: {
			optimizer: {
				enabled: true,
				parameters: 'z',
				fallbackOz: true,
				runs: 400,
			},
		},
	},
	networks: {
		hardhat: {
			polkavm: true,
			nodeConfig: {
				nodeBinaryPath: './binaries/substrate-node',
				rpcPort: 8000,
				dev: true,
			},
			adapterConfig: {
				adapterBinaryPath: './binaries/eth-rpc',
				dev: true,
			},
		},
		polkavm: {
			polkavm: true,
			url: 'http://127.0.0.1:8545',
			accounts: [process.env.LOCAL_PRIV_KEY, process.env.AH_PRIV_KEY],
		},
		paseoAssetHub: {
			polkavm: true,
			url: 'https://testnet-passet-hub-eth-rpc.polkadot.io/',
			accounts: [process.env.AH_PRIV_KEY],
		},
	},
};

module.exports = config;
