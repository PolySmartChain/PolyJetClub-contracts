import "@nomiclabs/hardhat-waffle"
import 'hardhat-deploy'
import "solidity-coverage"

export default {
  solidity: {
    version: '0.8.12',
    setttings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'istanbul',
    },
  },
  networks: {
    hardhat: {
      gas: 120000000,
      blockGasLimit: 120000000,
      allowUnlimitedContractSize: true,
      timeout: 1800000
    },
    Rinkeby: {
      url: 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
