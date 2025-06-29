// index.js - Xion (Cosmos) ke Sei (EVM) Bridge with SWAP_COUNT
require("dotenv").config();
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { assertIsBroadcastTxSuccess, SigningStargateClient, coins } = require("@cosmjs/stargate");

const {
  XION_MNEMONICS,
  RPC_XION,
  CONTRACT_ADDRESS,
  RECEIVER_EVM,
  AMOUNT_UXION,
  SWAP_COUNT,
  LOOP,
  LOOP_INTERVAL_MS,
  WALLET_DELAY_MS
} = process.env;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function bridgeFromXionToSei(mnemonic, index) {
  try {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: "xion",
    });
    const [account] = await wallet.getAccounts();

    console.log(`\n[${index + 1}] 🔑 ${account.address}`);

    const client = await SigningStargateClient.connectWithSigner(RPC_XION, wallet);

    for (let i = 0; i < Number(SWAP_COUNT); i++) {
      console.log(`   🔁 Swap [${i + 1}/${SWAP_COUNT}]`);

      const msg = {
        transfer_to_evm: {
          evm_address: RECEIVER_EVM,
        },
      };

      const result = await client.execute(
        account.address,
        CONTRACT_ADDRESS,
        msg,
        "auto",
        "",
        coins(AMOUNT_UXION, "uxion")
      );

      assertIsBroadcastTxSuccess(result);
      console.log(`   ✅ TX confirmed! Hash: ${result.transactionHash}`);
      if (i < Number(SWAP_COUNT) - 1) await sleep(3000); // delay antar TX
    }
  } catch (e) {
    console.error(`   ❌ Wallet ${index + 1} Error:`, e.message);
  }
}

async function runAllWallets() {
  const mns = XION_MNEMONICS.split(",");
  for (let i = 0; i < mns.length; i++) {
    await bridgeFromXionToSei(mns[i], i);
    if (i < mns.length - 1) await sleep(Number(WALLET_DELAY_MS));
  }
}

(async () => {
  if (LOOP === "true") {
    while (true) {
      console.log("\n🚀 [LOOP START]");
      await runAllWallets();
      console.log("🕒 Menunggu next loop...\n");
      await sleep(Number(LOOP_INTERVAL_MS));
    }
  } else {
    await runAllWallets();
    console.log("✅ Semua wallet selesai (no-loop).\n");
  }
})();
