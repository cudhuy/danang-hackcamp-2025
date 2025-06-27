'use client';

import { useState, useEffect } from 'react';
import {
	ArrowLeft,
	Plus,
	Info,
	AlertTriangle,
	Check,
	X,
	Hash,
	ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { TokenPairSelector } from '../create-liquidity-pool/token-pair-selector';
import { LiquidityInput } from '../create-liquidity-pool/liquidity-input';
import { PoolPreview } from '../create-liquidity-pool/pool-preview';
import {
	useConfig,
	useWriteContract,
	useWaitForTransactionReceipt,
	useReadContracts,
} from 'wagmi';
import { contractAddresses } from '@/lib/contractAddresses';
import { erc20Abi, uniswapV2PairAbi } from '@/lib/abi';
import { Address, getAddress, parseUnits, BaseError } from 'viem';
import { useAtomValue } from 'jotai';
import { addressAtom } from '../../sigpasskit';
import { useAccount } from 'wagmi';
import { localConfig } from '@/app/providers';
import { getSigpassWallet } from '@/lib/sigpass';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { getBlockExplorerUrl, truncateHash } from '@/lib/utils';
import CopyButton from '../../copy-button';

export interface Token {
	symbol: string;
	name: string;
	address: string;
	logoUrl?: string;
	balance?: string;
	price?: string;
}

const availableTokens: Token[] = [
	{
		symbol: 'WETH',
		name: 'Wrapped Ether',
		address: contractAddresses.WETH,
		balance: '0',
		price: '2500.00',
	},
	{
		symbol: 'HUY',
		name: 'Huy Token',
		address: contractAddresses.UNI_TOKEN,
		balance: '0',
		price: '1.00',
	},
];

export function AddLiquidityPoolComponent() {
	const router = useRouter();
	const config = useConfig();
	const address = useAtomValue(addressAtom);
	const { address: wagmiAddress, chainId } = useAccount();
	const [tokenA, setTokenA] = useState<Token | null>(null);
	const [tokenB, setTokenB] = useState<Token | null>(null);
	const [amountA, setAmountA] = useState<string>('');
	const [amountB, setAmountB] = useState<string>('');
	const [feeRate] = useState('0.3');
	const [pairAddress, setPairAddress] = useState<string | null>(null);
	const [currentStep, setCurrentStep] = useState<
		'idle' | 'transferA' | 'transferB' | 'minting' | 'success' | 'error'
	>('idle');
	const [showDialog, setShowDialog] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string>('');
	const [transactionHashes, setTransactionHashes] = useState<string[]>([]);

	const currentAddress = address || wagmiAddress;
	const currentConfig = address ? localConfig : config;

	const {
		data: hash,
		error: writeContractError,
		isPending,
		writeContractAsync,
		reset: resetWriteContract,
	} = useWriteContract({
		config: currentConfig,
	});

	const { isLoading: isConfirming, isSuccess: isConfirmed } =
		useWaitForTransactionReceipt({
			hash,
			config: currentConfig,
		});

	// Get token balances
	const { data: tokenDataA } = useReadContracts({
		config: currentConfig,
		contracts: [
			{
				abi: erc20Abi,
				address: tokenA?.address as Address,
				functionName: 'balanceOf',
				args: [currentAddress as Address],
			},
			{
				abi: erc20Abi,
				address: tokenA?.address as Address,
				functionName: 'decimals',
				args: [],
			},
		],
		query: {
			enabled: !!tokenA && !!currentAddress,
		},
	});

	const { data: tokenDataB } = useReadContracts({
		config: currentConfig,
		contracts: [
			{
				abi: erc20Abi,
				address: tokenB?.address as Address,
				functionName: 'balanceOf',
				args: [currentAddress as Address],
			},
			{
				abi: erc20Abi,
				address: tokenB?.address as Address,
				functionName: 'decimals',
				args: [],
			},
		],
		query: {
			enabled: !!tokenB && !!currentAddress,
		},
	});

	useEffect(() => {
		if (hash) {
			setTransactionHashes((prev) => [...prev, hash]);
			setShowDialog(true);
		}
	}, [hash]);

	useEffect(() => {
		if (isConfirmed && hash) {
			handleTransactionConfirmed();
		}
	}, [isConfirmed, hash, currentStep]);

	const handleTransactionConfirmed = async () => {
		try {
			if (currentStep === 'transferA') {
				// Token A transferred, now transfer token B
				setTimeout(() => {
					handleTransferTokenB();
				}, 1000);
			} else if (currentStep === 'transferB') {
				// Token B transferred, now mint LP tokens
				setTimeout(() => {
					handleMintLiquidity();
				}, 1000);
			} else if (currentStep === 'minting') {
				// All done
				setCurrentStep('success');
				setTimeout(() => {
					router.push('/liquidity-pool');
				}, 3000);
			}
		} catch (error) {
			console.error('Error in transaction flow:', error);
			setCurrentStep('error');
			setErrorMessage('Failed to continue transaction flow');
		}
	};

	useEffect(() => {
		if (writeContractError) {
			setCurrentStep('error');
			setErrorMessage(
				(writeContractError as BaseError).shortMessage ||
					writeContractError.message,
			);
		}
	}, [writeContractError]);

	const handleBack = () => {
		router.back();
	};

	const handlePairStatusChange = (exists: boolean, address: string | null) => {
		if (!exists) {
			setCurrentStep('error');
			setErrorMessage('No existing pool found for selected token pair');
			setPairAddress(null);
		} else {
			setPairAddress(address);
		}
	};

	const handleTransferTokenA = async () => {
		if (!tokenA || !amountA || !tokenDataA || !pairAddress) return;

		try {
			setCurrentStep('transferA');
			resetWriteContract();

			const decimalsA = tokenDataA[1]?.result as number;
			const amountAWei = parseUnits(amountA, decimalsA);

			console.log(
				'Transferring',
				amountA,
				tokenA.symbol,
				'to pair:',
				pairAddress,
			);

			await writeContractAsync({
				account: address ? await getSigpassWallet() : undefined,
				address: getAddress(tokenA.address),
				abi: erc20Abi,
				functionName: 'transfer',
				args: [getAddress(pairAddress), amountAWei],
			});
		} catch (error) {
			console.error('Transfer token A failed:', error);
			setCurrentStep('error');
			setErrorMessage('Failed to transfer ' + tokenA.symbol);
		}
	};

	const handleTransferTokenB = async () => {
		if (!tokenB || !amountB || !tokenDataB || !pairAddress) return;

		try {
			setCurrentStep('transferB');
			resetWriteContract();

			const decimalsB = tokenDataB[1]?.result as number;
			const amountBWei = parseUnits(amountB, decimalsB);

			console.log(
				'Transferring',
				amountB,
				tokenB.symbol,
				'to pair:',
				pairAddress,
			);

			await writeContractAsync({
				account: address ? await getSigpassWallet() : undefined,
				address: getAddress(tokenB.address),
				abi: erc20Abi,
				functionName: 'transfer',
				args: [getAddress(pairAddress), amountBWei],
			});
		} catch (error) {
			console.error('Transfer token B failed:', error);
			setCurrentStep('error');
			setErrorMessage('Failed to transfer ' + tokenB.symbol);
		}
	};

	const handleMintLiquidity = async () => {
		if (!currentAddress || !pairAddress) return;

		try {
			setCurrentStep('minting');
			resetWriteContract();

			console.log('Minting LP tokens for pair:', pairAddress);

			await writeContractAsync({
				account: address ? await getSigpassWallet() : undefined,
				address: getAddress(pairAddress),
				abi: uniswapV2PairAbi,
				functionName: 'mint',
				args: [currentAddress as Address],
			});
		} catch (error) {
			console.error('Mint liquidity failed:', error);
			setCurrentStep('error');
			setErrorMessage('Failed to mint LP tokens');
		}
	};

	const handleAddLiquidity = async () => {
		if (
			!currentAddress ||
			!tokenA ||
			!tokenB ||
			!amountA ||
			!amountB ||
			!pairAddress
		)
			return;

		try {
			setCurrentStep('transferA');
			setShowDialog(true);
			setTransactionHashes([]);
			resetWriteContract();

			await handleTransferTokenA();
		} catch (error) {
			console.error('Add liquidity failed:', error);
			setCurrentStep('error');
			setErrorMessage('Failed to initiate liquidity addition');
		}
	};

	const isFormValid =
		tokenA &&
		tokenB &&
		amountA &&
		amountB &&
		parseFloat(amountA) > 0 &&
		parseFloat(amountB) > 0 &&
		currentAddress &&
		pairAddress;

	const getButtonText = () => {
		if (!currentAddress) return 'Connect Wallet';
		if (!tokenA || !tokenB) return 'Select Tokens';
		if (!pairAddress) return 'No Pool Found';
		if (!amountA || !amountB) return 'Enter Amounts';

		switch (currentStep) {
			case 'transferA':
				return 'Transferring Token A...';
			case 'transferB':
				return 'Transferring Token B...';
			case 'minting':
				return 'Minting LP Tokens...';
			default:
				return 'Add Liquidity';
		}
	};

	const getStepDescription = () => {
		switch (currentStep) {
			case 'transferA':
				return `Transferring ${tokenA?.symbol} to pool...`;
			case 'transferB':
				return `Transferring ${tokenB?.symbol} to pool...`;
			case 'minting':
				return 'Minting LP tokens...';
			case 'success':
				return 'Liquidity added successfully!';
			case 'error':
				return 'Transaction failed';
			default:
				return '';
		}
	};

	const resetProcess = () => {
		setCurrentStep('idle');
		setTransactionHashes([]);
		setErrorMessage('');
		resetWriteContract();
		setShowDialog(false);
	};

	return (
		<div className='w-full max-w-2xl mx-auto space-y-6'>
			{/* Header */}
			<div className='flex items-center gap-4'>
				<Button
					variant='ghost'
					size='sm'
					onClick={handleBack}
					className='h-8 w-8 p-0'
				>
					<ArrowLeft className='h-4 w-4' />
				</Button>
				<div>
					<h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
						Add Liquidity to Pool
					</h2>
					<p className='text-gray-600 dark:text-gray-400 mt-1'>
						Add liquidity to an existing pool to earn trading fees
					</p>
				</div>
			</div>

			{/* Liquidity Addition Form */}
			<Card className='border border-gray-200 dark:border-gray-800'>
				<CardHeader>
					<CardTitle className='flex items-center justify-between'>
						<span>Select Pair</span>
						<Badge variant='secondary'>Fee: {feeRate}%</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent className='space-y-6'>
					{/* Token Pair Selection */}
					<TokenPairSelector
						tokenA={tokenA}
						tokenB={tokenB}
						onTokenASelect={setTokenA}
						onTokenBSelect={setTokenB}
						availableTokens={availableTokens}
						onPairStatusChange={handlePairStatusChange}
					/>

					{/* Liquidity Inputs */}
					{tokenA && tokenB && pairAddress && (
						<div className='space-y-4'>
							<div className='flex items-center gap-2 mb-4'>
								<Info className='h-4 w-4 text-blue-600' />
								<span className='text-sm text-gray-600 dark:text-gray-400'>
									Add liquidity to the existing {tokenA.symbol}/{tokenB.symbol}{' '}
									pool
								</span>
							</div>

							<LiquidityInput
								label='Amount A'
								token={tokenA}
								amount={amountA}
								onAmountChange={setAmountA}
							/>

							<div className='flex justify-center'>
								<div className='w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center'>
									<Plus className='h-4 w-4 text-gray-600' />
								</div>
							</div>

							<LiquidityInput
								label='Amount B'
								token={tokenB}
								amount={amountB}
								onAmountChange={setAmountB}
							/>
						</div>
					)}

					{/* Pool Preview */}
					{tokenA && tokenB && amountA && amountB && pairAddress && (
						<PoolPreview
							tokenA={tokenA}
							tokenB={tokenB}
							amountA={amountA}
							amountB={amountB}
							feeRate={feeRate}
						/>
					)}

					{/* Action Button */}
					<Button
						onClick={handleAddLiquidity}
						disabled={!isFormValid || currentStep !== 'idle'}
						className='w-full h-12 text-lg font-medium'
					>
						{getButtonText()}
					</Button>

					{/* Reset Button when there's an error */}
					{currentStep === 'error' && (
						<Button onClick={resetProcess} variant='outline' className='w-full'>
							Try Again
						</Button>
					)}

					{/* Important Notes */}
					<Alert>
						<Info className='h-4 w-4' />
						<AlertDescription>
							<div className='space-y-2'>
								<p className='font-medium'>Process:</p>
								<ul className='text-sm space-y-1 ml-4 list-disc'>
									<li>Transfer {tokenA?.symbol} to pair contract</li>
									<li>Transfer {tokenB?.symbol} to pair contract</li>
									<li>Mint LP tokens to your wallet</li>
									<li>Continue earning 0.3% fees from trades</li>
								</ul>
							</div>
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>

			{/* Transaction Status Dialog */}
			<Dialog open={showDialog} onOpenChange={setShowDialog}>
				<DialogContent className='sm:max-w-md rounded-2xl border-2 border-indigo-200 dark:border-indigo-800'>
					<DialogHeader>
						<DialogTitle className='text-xl font-bold text-center bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent'>
							Transaction Progress
						</DialogTitle>
						<DialogDescription className='text-center'>
							{getStepDescription()}
						</DialogDescription>
					</DialogHeader>

					<div className='flex flex-col gap-4 p-4 bg-indigo-50/80 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50'>
						{/* Current Transaction Hash */}
						{hash && (
							<div className='flex flex-row gap-2 items-center p-3 bg-white/90 dark:bg-black/40 rounded-lg border border-indigo-200 dark:border-indigo-800'>
								<Hash className='w-5 h-5 text-indigo-600' />
								<span className='font-medium'>Current TX:</span>
								<a
									className='flex flex-row gap-2 items-center underline underline-offset-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors'
									href={`${getBlockExplorerUrl(
										currentConfig,
										chainId,
									)}/tx/${hash}`}
									target='_blank'
									rel='noopener noreferrer'
								>
									{truncateHash(hash)}
									<ExternalLink className='w-4 h-4' />
								</a>
								<CopyButton copyText={hash} />
							</div>
						)}

						{/* Pair Address */}
						{pairAddress && (
							<div className='flex flex-row gap-2 items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800'>
								<Check className='w-5 h-5 text-green-600' />
								<span className='font-medium'>Pool Address:</span>
								<a
									className='flex flex-row gap-2 items-center underline underline-offset-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors'
									href={`${getBlockExplorerUrl(
										currentConfig,
										chainId,
									)}/address/${pairAddress}`}
									target='_blank'
									rel='noopener noreferrer'
								>
									{truncateHash(pairAddress)}
									<ExternalLink className='w-4 h-4' />
								</a>
								<CopyButton copyText={pairAddress} />
							</div>
						)}

						{/* Progress Steps */}
						<div className='space-y-2'>
							<div
								className={`flex items-center gap-2 p-2 rounded ${
									currentStep === 'transferA'
										? 'bg-blue-100 dark:bg-blue-900/20'
										: transactionHashes.length > 0
										? 'bg-green-100 dark:bg-green-900/20'
										: 'bg-gray-100 dark:bg-gray-800'
								}`}
							>
								{transactionHashes.length > 0 ? (
									<Check className='w-4 h-4 text-green-600' />
								) : currentStep === 'transferA' ? (
									<div className='w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin' />
								) : (
									<div className='w-4 h-4 rounded-full border-2 border-gray-300' />
								)}
								<span className='text-sm'>Transfer {tokenA?.symbol}</span>
							</div>

							<div
								className={`flex items-center gap-2 p-2 rounded ${
									currentStep === 'transferB'
										? 'bg-blue-100 dark:bg-blue-900/20'
										: transactionHashes.length > 1
										? 'bg-green-100 dark:bg-green-900/20'
										: 'bg-gray-100 dark:bg-gray-800'
								}`}
							>
								{transactionHashes.length > 1 ? (
									<Check className='w-4 h-4 text-green-600' />
								) : currentStep === 'transferB' ? (
									<div className='w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin' />
								) : (
									<div className='w-4 h-4 rounded-full border-2 border-gray-300' />
								)}
								<span className='text-sm'>Transfer {tokenB?.symbol}</span>
							</div>

							<div
								className={`flex items-center gap-2 p-2 rounded ${
									currentStep === 'minting'
										? 'bg-blue-100 dark:bg-blue-900/20'
										: currentStep === 'success'
										? 'bg-green-100 dark:bg-green-900/20'
										: 'bg-gray-100 dark:bg-gray-800'
								}`}
							>
								{currentStep === 'success' ? (
									<Check className='w-4 h-4 text-green-600' />
								) : currentStep === 'minting' ? (
									<div className='w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin' />
								) : (
									<div className='w-4 h-4 rounded-full border-2 border-gray-300' />
								)}
								<span className='text-sm'>Mint LP tokens</span>
							</div>
						</div>

						{/* Status Messages */}
						<div className='space-y-2'>
							{isConfirming && (
								<div className='flex flex-row gap-2 items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 animate-pulse'>
									<div className='w-5 h-5 border-2 border-yellowribbon-500 border-t-transparent rounded-full animate-spin' />
									<span className='text-yellow-600 dark:text-yellow-400 font-medium'>
										Waiting for confirmation...
									</span>
								</div>
							)}

							{currentStep === 'success' && (
								<div className='flex flex-row gap-2 items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800'>
									<Check className='w-5 h-5 text-green-600 dark:text-green-400' />
									<span className='text-green-600 dark:text-green-400 font-medium'>
										All transactions confirmed! Redirecting...
									</span>
								</div>
							)}

							{currentStep === 'error' && (
								<div className='flex flex-row gap-2 items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800'>
									<X className='w-5 h-5 text-red-600 dark:text-red-400' />
									<span className='text-red-600 dark:text-red-400 font-medium'>
										Error: {errorMessage}
									</span>
								</div>
							)}
						</div>

						{/* Close/Reset buttons */}
						<div className='flex gap-2'>
							{currentStep === 'error' && (
								<Button
									onClick={resetProcess}
									variant='outline'
									className='flex-1'
								>
									Try Again
								</Button>
							)}
							<Button
								onClick={() => setShowDialog(false)}
								variant={currentStep === 'error' ? 'outline' : 'default'}
								className='flex-1'
								disabled={
									currentStep !== 'idle' &&
									currentStep !== 'error' &&
									currentStep !== 'success'
								}
							>
								{currentStep === 'success'
									? 'Close'
									: currentStep === 'error'
									? 'Close'
									: 'Processing...'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
