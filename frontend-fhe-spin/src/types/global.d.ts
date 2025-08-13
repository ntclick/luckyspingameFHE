// Global type declarations for Zama FHE SDK

declare global {
  interface Window {
    relayerSDK: {
      initSDK: () => Promise<void>;
      createInstance: (config: any) => Promise<any>;
      SepoliaConfig: any;
    };
    ethereum: any;
  }
}

export {}; 