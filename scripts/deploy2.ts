import {ethers} from "hardhat"
import {Contract, constants} from 'ethers';
import fs = require('fs')
import path = require('path')

function _dir(d: string) {
		return path.join(__dirname, d)
}

const _dbFile = _dir('../local/deploy2.json')

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

let polyJetClub = '0xC04cb528Ef1c182d053e84bf1705C9E2b2a3deAf'
let WDC = constants.AddressZero
let WPSC = constants.AddressZero
let swap = constants.AddressZero
let total = 0

interface Data {
		PolyJetClubV2: Contract
		Proxys: Contract
}

async function main() {
		let ret: Data = <any>{}

    ret.Proxys = await deployContract("Proxys", "Proxys", [polyJetClub, WDC, WPSC, swap])
		ret.PolyJetClubV2 = await deployContract("PolyJetClubV2", "PolyJetClubV2", [ret.Proxys.address, total])

		await ret.Proxys.setConfig(4, ret.PolyJetClubV2.address)

		for (let k of Object.keys(ret)) {
				let v: Contract | Data = (<any>ret)[k]
				console.log(`${k} = ${(<any>v).address}`)
		}
}

main().catch(console.error)

