require("dotenv").config();
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { SigningStargateClient, assertIsBroadcastTxSuccess } = require("@cosmjs/stargate");

const {
  XION_MNEMONICS,
  RPC_XION,
  EVM_RECEIVER,
  AMOUNT,
  SWAP_COUNT,
  TX_DELAY_MS,
  WALLET_DELAY_MS,
  LOOP,
  LOOP_INTERVAL_MS,
  DENOM,
} = process.env;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Simulasi MsgTransferToEvm native (Union module) — real chain mungkin perlu register protobuf jika belum ada
function buildTransferToEvmMsg(sender, evmAddress, denom, amount) {
  return {
    typeUrl: "/union.v1.MsgTransferToEvm",
    value: {
      sender,
      evmAddress,
      asset: {
        denom,
        amount: String(amount),
      },
    },
  };
}

async function bridgeXionToSei(walletMnemonic, index) {
  try {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(walletMnemonic, { prefix: "xion" });
    const [account] = await wallet.getAccounts();
    const client = await SigningStargateClient.connectWithSigner(RPC_XION, wallet);

    const microAmount = Math.floor(parseFloat(AMOUNT) * 1_000_000);

    console.log(`\n[${index + 1}] 🔑 ${account.address}`);
    for (let i = 0; i < Number(SWAP_COUNT); i++) {
      console.log(`   🔁 Swap [${i + 1}/${SWAP_COUNT}]`);

      const msg = buildTransferToEvmMsg(account.address, EVM_RECEIVER, DENOM, microAmount);

      const fee = {
        amount: [{ denom: DENOM, amount: "5000" }],
        gas: "200000",
      };

      const result = await client.signAndBroadcast(account.address, [msg], fee, "Bridge to SEI EVM");
      assertIsBroadcastTxSuccess(result);

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
    await bridgeXionToSei(wallets[i], i);
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
})().catch((err) => {
  console.error("❌ Fatal Error:", err.message);
});
