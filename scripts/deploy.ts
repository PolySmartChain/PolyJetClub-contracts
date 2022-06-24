import {ethers} from "hardhat"
import {Contract, utils} from 'ethers';
import fs = require('fs')
import path = require('path')

function _dir(d: string) {
		return path.join(__dirname, d)
}

const _dbFile = _dir('../local/deploy.json')

function dbSet(k: string, v: string) {
		const b = fs.existsSync(_dbFile)
		let o = b ? JSON.parse(
				fs.readFileSync(_dbFile, 'ascii')
		) : {}

		o[k] = v
		fs.writeFileSync(_dbFile, JSON.stringify(o))
}

function dbGet(k: string): string {
		const b = fs.existsSync(_dbFile)
		if (!b)
				return ''

		let o = JSON.parse(fs.readFileSync(_dbFile, 'ascii'))
		return o[k]
}

async function deployContract(id: string, name: string, args: any[], libraries: Record<string, string> = {}): Promise<Contract> {
		let addr = dbGet(id)

		if (addr) {
				return (await ethers.getContractFactory(name, {
						libraries: libraries
				})).attach(addr)
		}

		const lib = await ethers.getContractFactory(name, {
				libraries: libraries
		})

		const r = await lib.deploy(...args)
		dbSet(id, r.address)
		return r
}

interface Data {
		PolyJetClub: Contract

		//mock
		MockFee: Contract
		MockChange: Contract
		MockERC20: Contract
		MockERC721: Contract
}

async function main() {
		let ret: Data = <any>{}

		ret.PolyJetClub = await deployContract("PolyJetClub", "PolyJetClub", [])

		//mock
		ret.MockFee = await deployContract("MockFee", "MockFee", [])
		// ret.MockERC20 = await deployContract("MockERC20", "MockERC20", []);
		// ret.MockERC721 = await deployContract("MockERC721", "MockERC721", []);
		// ret.MockChange = await deployContract("MockChange", "MockChange", [
		// 		ret.PolyJetClub.address,
		// 		[
		// 				[100, "ipfs://xxx"],
		// 				[80, "ipfs://xxx"],
		// 				[60, "ipfs://xxx"],
		// 				[40, "ipfs://xxx"],
		// 				[20, "ipfs://xxx"],
		// 				[0, "ipfs://xxx"]
		// 		]
		// ])
		// await ret.MockChange.setERC20(ret.MockERC20.address, utils.parseEther('100'))
		// await ret.MockChange.setERC721(ret.MockERC721.address)

		for (let k of Object.keys(ret)) {
				let v: Contract | Data = (<any>ret)[k]
				console.log(`${k} = ${(<any>v).address}`)
		}
}

main().catch(console.error)

