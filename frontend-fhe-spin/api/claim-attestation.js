// Vercel serverless function for claim attestation
// File: frontend-fhe-spin/api/claim-attestation.js

import { ethers } from "ethers";

// Private key for signing (should be in environment variables)
const ATTESTOR_PRIVATE_KEY = process.env.ATTESTOR_PRIVATE_KEY;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user, contractAddress, amountWei, nonce } = req.body;

    // Validate input
    if (!user || !contractAddress || !amountWei || !nonce) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    if (!ATTESTOR_PRIVATE_KEY) {
      return res.status(500).json({ error: "Attestor private key not configured" });
    }

    // Create signer
    const signer = new ethers.Wallet(ATTESTOR_PRIVATE_KEY);

    // Create message hash (same as contract expects)
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "address", "uint256", "uint256"],
      [user, contractAddress, BigInt(amountWei), BigInt(nonce)],
    );

    // Sign the message
    const signature = await signer.signMessage(ethers.getBytes(messageHash));

    res.status(200).json({ signature });
  } catch (error) {
    console.error("Claim attestation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
