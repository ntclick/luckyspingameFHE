import React from "react";
import { ethers } from "ethers";
import { CONFIG } from "../config";

// Network configuration
export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

export interface NetworkInfo {
  chainId: number;
  chainIdHex: string;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const SEPOLIA_NETWORK: NetworkInfo = {
  chainId: SEPOLIA_CHAIN_ID,
  chainIdHex: SEPOLIA_CHAIN_ID_HEX,
  name: "Sepolia Testnet",
  rpcUrl: CONFIG.NETWORK.RPC_URL,
  explorerUrl: CONFIG.NETWORK.EXPLORER_URL,
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
};

// Kiểm tra xem wallet có đang ở mạng Sepolia không
export const isSepoliaNetwork = async (provider: ethers.BrowserProvider): Promise<boolean> => {
  try {
    const network = await provider.getNetwork();
    return Number(network.chainId) === SEPOLIA_CHAIN_ID;
  } catch (error) {
    console.error("Error checking network:", error);
    return false;
  }
};

// Lấy thông tin mạng hiện tại
export const getCurrentNetwork = async (provider: ethers.BrowserProvider): Promise<NetworkInfo | null> => {
  try {
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    if (chainId === SEPOLIA_CHAIN_ID) {
      return SEPOLIA_NETWORK;
    }
    
    // Trả về thông tin mạng hiện tại nếu không phải Sepolia
    return {
      chainId,
      chainIdHex: `0x${chainId.toString(16)}`,
      name: `Chain ID ${chainId}`,
      rpcUrl: "",
      explorerUrl: "",
      nativeCurrency: {
        name: "Unknown",
        symbol: "UNKNOWN",
        decimals: 18,
      },
    };
  } catch (error) {
    console.error("Error getting current network:", error);
    return null;
  }
};

// Chuyển sang mạng Sepolia
export const switchToSepolia = async (): Promise<boolean> => {
  try {
    const anyWindow = window as any;
    if (!anyWindow.ethereum) {
      throw new Error("MetaMask not found");
    }

    // Thử chuyển mạng
    await anyWindow.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
    
    return true;
  } catch (error: any) {
    // Nếu mạng chưa được thêm vào MetaMask
    if (error.code === 4902) {
      try {
        await addSepoliaToMetaMask();
        return true;
      } catch (addError) {
        console.error("Error adding Sepolia network:", addError);
        return false;
      }
    }
    
    console.error("Error switching to Sepolia:", error);
    return false;
  }
};

// Thêm mạng Sepolia vào MetaMask
export const addSepoliaToMetaMask = async (): Promise<void> => {
  const anyWindow = window as any;
  if (!anyWindow.ethereum) {
    throw new Error("MetaMask not found");
  }

  await anyWindow.ethereum.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: SEPOLIA_CHAIN_ID_HEX,
        chainName: SEPOLIA_NETWORK.name,
        nativeCurrency: SEPOLIA_NETWORK.nativeCurrency,
        rpcUrls: [SEPOLIA_NETWORK.rpcUrl],
        blockExplorerUrls: [SEPOLIA_NETWORK.explorerUrl],
      },
    ],
  });
};

// Tạo thông báo yêu cầu chuyển mạng
export const createNetworkSwitchNotification = (currentNetwork: NetworkInfo | null): {
  title: string;
  message: string;
  actionText: string;
  action: () => Promise<void>;
} => {
  const networkName = currentNetwork?.name || "Unknown Network";
  
  return {
    title: "Wrong Network",
    message: `You are currently connected to ${networkName}. Please switch to Sepolia Testnet to use this application.`,
    actionText: "Switch to Sepolia",
    action: async () => {
      try {
        const success = await switchToSepolia();
        if (!success) {
          throw new Error("Failed to switch network");
        }
      } catch (error) {
        console.error("Network switch failed:", error);
        throw error;
      }
    },
  };
};

// Hook để kiểm tra và xử lý network
export const useNetworkCheck = (provider: ethers.BrowserProvider | null) => {
  const [isCorrectNetwork, setIsCorrectNetwork] = React.useState<boolean>(true);
  const [currentNetwork, setCurrentNetwork] = React.useState<NetworkInfo | null>(null);
  const [isChecking, setIsChecking] = React.useState<boolean>(false);

  const checkNetwork = React.useCallback(async () => {
    if (!provider) {
      setIsCorrectNetwork(false);
      setCurrentNetwork(null);
      return;
    }

    setIsChecking(true);
    try {
      const network = await getCurrentNetwork(provider);
      const isSepolia = await isSepoliaNetwork(provider);
      
      setCurrentNetwork(network);
      setIsCorrectNetwork(isSepolia);
    } catch (error) {
      console.error("Network check failed:", error);
      setIsCorrectNetwork(false);
      setCurrentNetwork(null);
    } finally {
      setIsChecking(false);
    }
  }, [provider]);

  // Kiểm tra network khi provider thay đổi
  React.useEffect(() => {
    checkNetwork();
  }, [checkNetwork]);

  // Lắng nghe sự kiện chainChanged
  React.useEffect(() => {
    const anyWindow = window as any;
    if (!anyWindow.ethereum) return;

    const handleChainChanged = () => {
      // Reload page khi chain thay đổi để đảm bảo state được cập nhật
      window.location.reload();
    };

    anyWindow.ethereum.on("chainChanged", handleChainChanged);
    
    return () => {
      anyWindow.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  return {
    isCorrectNetwork,
    currentNetwork,
    isChecking,
    checkNetwork,
    switchToSepolia,
  };
};
