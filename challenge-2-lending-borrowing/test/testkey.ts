const { ethers } = require("ethers");

// Tạo ví ngẫu nhiên
const wallet1 = ethers.Wallet.createRandom();
const wallet2 = ethers.Wallet.createRandom();
const wallet3 = ethers.Wallet.createRandom();

console.log("PRIVATE_KEY:", wallet1.privateKey);
console.log("PRIVATE_KEY2:", wallet2.privateKey);
console.log("PRIVATE_KEY3:", wallet3.privateKey);