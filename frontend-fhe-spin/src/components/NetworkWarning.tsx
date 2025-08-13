import React from "react";
import { NetworkInfo, createNetworkSwitchNotification } from "../utils/networkUtils";

interface NetworkWarningProps {
  currentNetwork: NetworkInfo | null;
  onSwitchNetwork: () => Promise<void>;
  onClose?: () => void;
}

const NetworkWarning: React.FC<NetworkWarningProps> = ({
  currentNetwork,
  onSwitchNetwork,
  onClose,
}) => {
  const [isSwitching, setIsSwitching] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  const handleSwitchNetwork = async () => {
    setIsSwitching(true);
    setError("");
    
    try {
      await onSwitchNetwork();
    } catch (err: any) {
      setError(err.message || "Failed to switch network");
    } finally {
      setIsSwitching(false);
    }
  };

  const networkName = currentNetwork?.name || "Unknown Network";

  return (
    <div className="network-warning">
      <div className="network-warning-content">
        <div className="network-warning-header">
          <div className="network-warning-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="network-warning-title">
            <h3>Wrong Network</h3>
            {onClose && (
              <button className="network-warning-close" onClick={onClose}>
                ×
              </button>
            )}
          </div>
        </div>
        
        <div className="network-warning-body">
          <p>
            You are currently connected to <strong>{networkName}</strong>.
          </p>
          <p>
            This application requires <strong>Sepolia Testnet</strong> to function properly.
          </p>
          
          {error && (
            <div className="network-warning-error">
              <p>Error: {error}</p>
            </div>
          )}
        </div>
        
        <div className="network-warning-actions">
          <button
            className="network-warning-button network-warning-button-primary"
            onClick={handleSwitchNetwork}
            disabled={isSwitching}
          >
            {isSwitching ? "Switching..." : "Switch to Sepolia"}
          </button>
          
          <div className="network-warning-help">
            <p>
              <strong>Need help?</strong> Make sure you have MetaMask installed and try switching networks manually.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkWarning;
