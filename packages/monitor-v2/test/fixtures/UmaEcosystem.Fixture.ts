import { addGlobalHardhatTestingAddress, ZERO_ADDRESS } from "@uma/common";
import {
  AddressWhitelistEthers,
  FinderEthers,
  IdentifierWhitelistEthers,
  MockOracleAncillaryEthers,
  RegistryEthers,
  StoreEthers,
  VotingTokenEthers,
} from "@uma/contracts-node";
import { zeroRawValue } from "../constants";
import { formatBytes32String, getContractFactory, hre, Signer } from "../utils";

export interface UmaEcosystemContracts {
  finder: FinderEthers;
  collateralWhitelist: AddressWhitelistEthers;
  identifierWhitelist: IdentifierWhitelistEthers;
  registry: RegistryEthers;
  store: StoreEthers;
  votingToken: VotingTokenEthers;
  mockOracle: MockOracleAncillaryEthers;
}

export const umaEcosystemFixture = hre.deployments.createFixture(
  async ({ ethers }): Promise<UmaEcosystemContracts> => {
    // Signer from ethers and hardhat-ethers are not version compatible.
    const [deployer] = (await ethers.getSigners()) as Signer[];

    // Deploy the UMA ecosystem contracts with Mock Oracle.
    const finder = (await (await getContractFactory("Finder", deployer)).deploy()) as FinderEthers;
    const collateralWhitelist = (await (
      await getContractFactory("AddressWhitelist", deployer)
    ).deploy()) as AddressWhitelistEthers;
    const identifierWhitelist = (await (
      await getContractFactory("IdentifierWhitelist", deployer)
    ).deploy()) as IdentifierWhitelistEthers;
    const registry = (await (await getContractFactory("Registry", deployer)).deploy()) as RegistryEthers;
    const store = (await (await getContractFactory("Store", deployer)).deploy(
      zeroRawValue,
      zeroRawValue,
      ZERO_ADDRESS
    )) as StoreEthers;
    const votingToken = (await (await getContractFactory("VotingToken", deployer)).deploy()) as VotingTokenEthers;
    const mockOracle = (await (await getContractFactory("MockOracleAncillary", deployer)).deploy(
      finder.address,
      ZERO_ADDRESS
    )) as MockOracleAncillaryEthers;

    // Register the UMA ecosystem contracts with the Finder.
    await finder.changeImplementationAddress(formatBytes32String("Store"), store.address);
    await finder.changeImplementationAddress(formatBytes32String("Registry"), registry.address);
    await finder.changeImplementationAddress(formatBytes32String("CollateralWhitelist"), collateralWhitelist.address);
    await finder.changeImplementationAddress(formatBytes32String("IdentifierWhitelist"), identifierWhitelist.address);
    await finder.changeImplementationAddress(formatBytes32String("Oracle"), mockOracle.address);

    // Add voting token to global hardhatTestingAddresses.
    addGlobalHardhatTestingAddress("VotingToken", votingToken.address);

    return {
      finder,
      collateralWhitelist,
      identifierWhitelist,
      registry,
      store,
      votingToken,
      mockOracle,
    };
  }
);
