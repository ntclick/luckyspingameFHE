import { ethers } from "ethers";
import hre from "hardhat";

// Try to load Node or bundled SDK
let RelayerSDK: any;
try {
  RelayerSDK = require("@zama-fhe/relayer-sdk/node");
} catch {
  RelayerSDK = require("@zama-fhe/relayer-sdk/bundle");
}

// We'll load the exact ABI from artifacts to avoid selector mismatch

async function main() {
  const args = process.argv.slice(2);
  const getArg = (k: string, short?: string) => {
    const i = args.findIndex((x) => x === k || (short && x === short));
    return i !== -1 ? args[i + 1] : undefined;
  };

  const rpc = process.env.SEPOLIA_RPC_URL || getArg("--rpc");
  const pk = process.env.PRIVATE_KEY || getArg("--pk");
  const contractAddress = process.env.CONTRACT || getArg("--contract");
  if (!rpc || !pk || !contractAddress) throw new Error("Usage: --rpc <url> --pk <hex> --contract <addr>");

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const user = await wallet.getAddress();
  const artifact = await hre.artifacts.readArtifact("LuckySpinFHE_Strict");
  const iface = new ethers.Interface(artifact.abi);
  const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);

  // 1) Call dailyGm()
  console.log("Calling dailyGm() as", user);
  // Encode explicitly to guarantee non-empty data
  const data = iface.encodeFunctionData("dailyGm", []);
  const tx = await wallet.sendTransaction({ to: contractAddress, data, gasLimit: 400_000 });
  const receipt = await tx.wait();
  console.log("dailyGm mined:", receipt?.hash);

  // 2) Read encrypted spins
  const encryptedSpins: string = await contract.getUserSpins(user);
  console.log("encryptedSpins:", encryptedSpins);

  // 3) Create Relayer SDK instance
  const instance = await RelayerSDK.createInstance({
    aclContractAddress: process.env.ACL_CONTRACT_ADDRESS,
    kmsContractAddress: process.env.KMS_VERIFIER_CONTRACT_ADDRESS || process.env.KMS_CONTRACT_ADDRESS,
    inputVerifierContractAddress: process.env.INPUT_VERIFIER_CONTRACT_ADDRESS,
    verifyingContractAddressDecryption: process.env.DECRYPTION_ADDRESS,
    verifyingContractAddressInputVerification: process.env.INPUT_VERIFICATION_ADDRESS,
    chainId: Number(process.env.CHAIN_ID || 11155111),
    gatewayChainId: 55815,
    network: rpc,
    relayerUrl: process.env.RELAYER_URL || "https://relayer.testnet.zama.cloud",
  });

  // 4) EIP-712 user-decrypt flow to decrypt spins
  const keypair = await instance.generateKeypair();
  const start = Math.floor(Date.now() / 1000).toString();
  const durationDays = "7";
  const eip712 = await instance.createEIP712(keypair.publicKey, [contractAddress], start, durationDays);

  // ethers v6 typed data signing
  const signature = await wallet.signTypedData(
    eip712.domain,
    { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    eip712.message,
  );

  const pairs = [{ handle: encryptedSpins, contractAddress }];
  const res = await instance.userDecrypt(
    pairs,
    keypair.privateKey,
    keypair.publicKey,
    signature.replace(/^0x/, ""),
    [contractAddress],
    user,
    start,
    durationDays,
  );

  const decrypted = res[encryptedSpins];
  console.log("Decrypted spins:", decrypted);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
