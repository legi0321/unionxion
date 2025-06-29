
require("dotenv").config();
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { SigningCosmWasmClient } = require("@cosmjs/cosmwasm-stargate");

const {
  XION_MNEMONICS,
  RPC_XION,
  CONTRACT_ADDRESS,
  EVM_RECEIVER,
  AMOUNT,
  DENOM,
  SWAP_COUNT,
  TX_DELAY_MS,
  WALLET_DELAY_MS,
  LOOP,
  LOOP_INTERVAL_MS
} = process.env;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function bridge(walletMnemonic, index) {
  try {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(walletMnemonic, { prefix: "xion" });
    const [account] = await wallet.getAccounts();

    const client = await SigningCosmWasmClient.connectWithSigner(RPC_XION, wallet);

    const amountInMicro = Math.floor(parseFloat(AMOUNT) * 1_000_000).toString();

    console.log(`\n[${index + 1}] 🔑 ${account.address}`);

    for (let i = 0; i < Number(SWAP_COUNT); i++) {
      console.log(`   🔁 Swap [${i + 1}/${SWAP_COUNT}]`);

      const msg = {
        transfer_to_evm: {
          evm_address: EVM_RECEIVER
        }
      };

      const funds = [{
        denom: DENOM,
        amount: amountInMicro
      }];

      const result = await client.execute(account.address, CONTRACT_ADDRESS, msg, "auto", "", funds);

      console.log(`   ✅ TX Hash: ${result.transactionHash}`);
      await sleep(Number(TX_DELAY_MS));
    }
  } catch (err) {
    console.error(`   ❌ Wallet ${index + 1} Error:`, err.message);
  }
}

async function runAllWallets() {
  const wallets = XION_MNEMONICS.split("|||");
  for (let i = 0; i < wallets.length; i++) {
    await bridge(wallets[i], i);
    if (i < wallets.length - 1) await sleep(Number(WALLET_DELAY_MS));
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
    console.log("✅ Semua wallet selesai (no-loop).");
  }
})();
