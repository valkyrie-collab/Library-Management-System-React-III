import React, { useState } from 'react';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, Transaction } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

const BACKEND_URL = "http://localhost:8080/book-consumer/consumer";
const SOLANA_RPC = "http://localhost:8899";
const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmcmVlZG9tIiwiZXhwIjoxNzk1MTE0ODEwLCJyb2xlcyI6WyJhZG1pbiJdfQ.7GeOr7myuG4yQUcQ_N2zfbty-vp1mcMs7Q2pynMk_uY"

function LibraryInitializer() {
  const { publicKey, signTransaction, connected } = useWallet();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const connection = new Connection(SOLANA_RPC, "confirmed");

  const handleInitializeLibrary = async (e) => {
    e.preventDefault();
    if (!publicKey || !signTransaction) {
      alert("Please connect your Phantom wallet first!");
      return;
    }

    setLoading(true);
    setStatus("Requesting transaction from Actix backend...");

    try {
      const response = await fetch(`${BACKEND_URL}/consumer-initiate-library`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          admin_id: publicKey.toBase58(),
          name,
          description,
        }),
      });

      const responseText = await response.text();

      if (!response.ok) throw new Error("Failed to build transaction from backend");
      
      const { tx_base64 } = JSON.parse(responseText);

      setStatus("Prompting Phantom wallet for signature...");

      const txBytes = Uint8Array.from(atob(tx_base64), c => c.charCodeAt(0));
      const transaction = Transaction.from(txBytes);

      const signedTransaction = await signTransaction(transaction);

      setStatus("Broadcasting signed transaction to Solana...");

      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(signature, "confirmed");

      setStatus(`Success! Tx Signature: ${signature}`);
      alert(`Library & Treasure PDAs created successfully!`);
    } catch (error) {
        console.error("Initialization error:", error);
        setStatus(`Error: ${error?.message || String(error)}`);
        alert(`Failed: ${error?.name}: ${error?.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Solana Library Manager - Wallet Test</h2>
      <div>
        <WalletMultiButton />
      </div>
      <hr />
      {connected ? (
        <div>
          <p><strong>Connected Wallet:</strong> {publicKey?.toBase58()}</p>
          <form onSubmit={handleInitializeLibrary}>
            <div>
              <label>Library Name: </label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Enter library name"
                required 
              />
            </div>
            <br />
            <div>
              <label>Description: </label>
              <input 
                type="text" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Enter description"
                required 
              />
            </div>
            <br />
            <button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Initialize Library"}
            </button>
          </form>
          {status && <p><strong>Status:</strong> {status}</p>}
        </div>
      ) : (
        <p>Please connect your browser extension wallet using the button above to begin testing.</p>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <ConnectionProvider endpoint={SOLANA_RPC}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <LibraryInitializer />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}