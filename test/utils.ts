// @ts-ignore
import {ethers, waffle, Wallet} from 'hardhat'

const ethSigUtil = require('eth-sig-util');

export function getSigMessage(chainId: number, verifyingContract: string, from: string, tokenId: number, sk: string): string {
		const name = 'PolyJetClub'
		const version = '1'

		const mad = verifyingContract
		const message = {
				from: from,
				tokenId: tokenId
		};
		const EIP712Domain = [
				{name: 'name', type: 'string'},
				{name: 'version', type: 'string'},
				{name: 'chainId', type: 'uint256'},
				{name: 'verifyingContract', type: 'address'}
		];
		const data721 = {
				types: {
						EIP712Domain,
						Permit: [
								{name: 'from', type: 'address'},
								{name: 'tokenId', type: 'uint256'},
						],
				},
				domain: {
						chainId: chainId,
						name: name,
						verifyingContract: mad,
						version: version,
				},
				primaryType: 'Permit',
				message
		}

		const signature = ethSigUtil.signTypedData_v4(Buffer.from(sk, 'hex'), {data: data721})
		return signature
}
