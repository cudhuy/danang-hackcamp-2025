"use client";

import { useState } from "react";
import { useWriteContract, useReadContracts, useAccount } from "wagmi";
import { parseUnits, formatUnits, Address } from "viem";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DollarSign, LoaderCircle, AlertCircle } from "lucide-react";

import { lendingBorrowingAbi } from "@/lib/lendingBorrowingAbi";
import { erc20Abi } from "@/lib/abi";
import { useToast } from "@/hooks/use-toast";

const LENDING_CONTRACT = "0x1234567890123456789012345678901234567890"; // Replace with actual address
const LENDING_TOKEN = "0x1234567890123456789012345678901234567890"; // Replace with actual address
const COLLATERAL_TOKEN = "0x1234567890123456789012345678901234567890"; // Replace with actual address

const formSchema = z.object({
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    }),
});

export default function TakeLoan() {
  const { address } = useAccount();
  const { toast } = useToast();
  
  const { writeContract, isPending } = useWriteContract({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Loan taken successfully!",
        });
        form.reset();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    },
  });

  const { data: contractData } = useReadContracts({
    contracts: [
      {
        address: LENDING_CONTRACT,
        abi: lendingBorrowingAbi,
        functionName: "collateralBalances",
        args: [address as Address],
      },
      {
        address: LENDING_CONTRACT,
        abi: lendingBorrowingAbi,
        functionName: "getLoanDetails",
        args: [address as Address],
      },
      {
        address: LENDING_CONTRACT,
        abi: lendingBorrowingAbi,
        functionName: "collateralFactor",
      },
      {
        address: LENDING_TOKEN,
        abi: erc20Abi,
        functionName: "decimals",
      },
      {
        address: LENDING_TOKEN,
        abi: erc20Abi,
        functionName: "symbol",
      },
      {
        address: COLLATERAL_TOKEN,
        abi: erc20Abi,
        functionName: "decimals",
      },
    ],
  });

  const depositedCollateral = contractData?.[0]?.result as bigint | undefined;
  const loanDetails = contractData?.[1]?.result as [bigint, bigint, boolean] | undefined;
  const collateralFactor = contractData?.[2]?.result as bigint | undefined;
  const lendingDecimals = contractData?.[3]?.result as number | undefined;
  const lendingSymbol = contractData?.[4]?.result as string | undefined;
  const collateralDecimals = contractData?.[5]?.result as number | undefined;

  const hasActiveLoan = loanDetails?.[2] || false;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const amountBigInt = parseUnits(values.amount, lendingDecimals || 18);

    writeContract({
      address: LENDING_CONTRACT,
      abi: lendingBorrowingAbi,
      functionName: "takeLoan",
      args: [amountBigInt],
    });
  }

  if (hasActiveLoan) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <AlertCircle className="h-12 w-12 text-yellow-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Active Loan Found</h3>
          <p className="text-muted-foreground">
            You already have an active loan. Please repay it before taking a new one.
          </p>
        </div>
      </div>
    );
  }

  const maxLoanAmount = depositedCollateral && collateralFactor
    ? (depositedCollateral * BigInt(100)) / collateralFactor
    : BigInt(0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-green-600" />
        <span className="text-sm text-muted-foreground">
          Max Loan: {formatUnits(maxLoanAmount, lendingDecimals || 18)} {lendingSymbol}
        </span>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loan Amount</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="0.00"
                      {...field}
                      className="pr-16"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {lendingSymbol}
                    </div>
                  </div>
                </FormControl>
                <FormDescription>
                  Borrow tokens against your collateral
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Taking Loan...
              </>
            ) : (
              "Take Loan"
            )}
          </Button>
        </form>
      </Form>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Collateral Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {depositedCollateral ? formatUnits(depositedCollateral, collateralDecimals || 18) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Available amount</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Collateral Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {collateralFactor ? Number(collateralFactor) : "0"}%
            </div>
            <p className="text-xs text-muted-foreground">Loan to collateral ratio</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}