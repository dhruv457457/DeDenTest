// test-tx-verification.js
// Run with: node test-tx-verification.js

const { ethers } = require("ethers");

// Your configuration
const TX_HASH = "0xd5823aa49072b84169b75e71147b1135fd03c5e83dbb15ae999686737ca57fe9";
const CHAIN_ID = 56; // BSC
const RPC_URL = "https://bsc-dataseed.binance.org/";
const TREASURY_ADDRESS = "0x317914bc4DB3f61C0cBA933A3e00d7A8BeD124A5".toLowerCase();

// BSC Token Addresses
const TOKENS = {
  USDT: "0x55d398326f99059fF775485246999027B3197955".toLowerCase(),
  USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d".toLowerCase(),
};

const TRANSFER_EVENT_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

async function testTransaction() {
  console.log("🔍 Testing Transaction Verification\n");
  console.log("TX Hash:", TX_HASH);
  console.log("Chain ID:", CHAIN_ID);
  console.log("Treasury:", TREASURY_ADDRESS);
  console.log("Expected Tokens:", TOKENS);
  console.log("\n" + "=".repeat(60) + "\n");

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    console.log("📡 Fetching transaction receipt...");
    const receipt = await provider.getTransactionReceipt(TX_HASH);
    
    if (!receipt) {
      console.error("❌ Receipt not found!");
      return;
    }

    console.log("✅ Receipt found!");
    console.log("   Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
    console.log("   Block Number:", receipt.blockNumber);
    console.log("   Gas Used:", receipt.gasUsed.toString());
    console.log("   Total Logs:", receipt.logs.length);
    console.log("\n" + "-".repeat(60) + "\n");

    // Analyze all logs
    console.log("📋 Analyzing all logs:\n");
    receipt.logs.forEach((log, index) => {
      const isTransfer = log.topics[0] === TRANSFER_EVENT_TOPIC;
      const isUSDT = log.address.toLowerCase() === TOKENS.USDT;
      const isUSDC = log.address.toLowerCase() === TOKENS.USDC;
      
      console.log(`Log #${index}:`);
      console.log(`   Address: ${log.address}`);
      console.log(`   Token: ${isUSDT ? 'USDT ✅' : isUSDC ? 'USDC ✅' : 'Other'}`);
      console.log(`   Is Transfer Event: ${isTransfer ? 'YES ✅' : 'NO'}`);
      
      if (isTransfer && log.topics.length >= 3) {
        const from = ethers.getAddress("0x" + log.topics[1].slice(26));
        const to = ethers.getAddress("0x" + log.topics[2].slice(26));
        const amount = BigInt(log.data || "0x0");
        
        console.log(`   From: ${from}`);
        console.log(`   To: ${to}`);
        console.log(`   Amount: ${amount.toString()}`);
        console.log(`   To Treasury: ${to.toLowerCase() === TREASURY_ADDRESS ? 'YES ✅✅✅' : 'NO'}`);
      }
      console.log("");
    });

    console.log("=".repeat(60) + "\n");

    // Find Transfer to treasury
    console.log("🎯 Looking for Transfer to Treasury...\n");
    
    const transferLogs = receipt.logs.filter(
      (log) =>
        (log.address.toLowerCase() === TOKENS.USDT || 
         log.address.toLowerCase() === TOKENS.USDC) &&
        log.topics[0] === TRANSFER_EVENT_TOPIC &&
        log.topics.length >= 3
    );

    console.log(`Found ${transferLogs.length} Transfer event(s) from USDT/USDC\n`);

    const treasuryTransfer = transferLogs.find((log) => {
      const to = ethers.getAddress("0x" + log.topics[2].slice(26));
      return to.toLowerCase() === TREASURY_ADDRESS;
    });

    if (treasuryTransfer) {
      const from = ethers.getAddress("0x" + treasuryTransfer.topics[1].slice(26));
      const to = ethers.getAddress("0x" + treasuryTransfer.topics[2].slice(26));
      const amount = BigInt(treasuryTransfer.data || "0x0");
      const tokenAddress = treasuryTransfer.address.toLowerCase();
      const isUSDT = tokenAddress === TOKENS.USDT;
      
      console.log("✅✅✅ SUCCESS! Transfer to Treasury Found! ✅✅✅\n");
      console.log("Details:");
      console.log(`   Token: ${isUSDT ? 'USDT' : 'USDC'}`);
      console.log(`   Token Address: ${treasuryTransfer.address}`);
      console.log(`   From: ${from}`);
      console.log(`   To: ${to}`);
      console.log(`   Amount (wei): ${amount.toString()}`);
      console.log(`   Amount (formatted): ${ethers.formatUnits(amount, 18)} tokens`);
      console.log(`   Treasury Match: ${to.toLowerCase() === TREASURY_ADDRESS ? '✅ YES' : '❌ NO'}`);
      
    } else {
      console.log("❌ No transfer to treasury found!");
      console.log("\nTransfers found to:");
      transferLogs.forEach((log) => {
        const to = ethers.getAddress("0x" + log.topics[2].slice(26));
        console.log(`   ${to}`);
      });
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  }
}

testTransaction();