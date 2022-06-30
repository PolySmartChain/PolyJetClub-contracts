// @ts-ignore
import {waffle} from "hardhat"
import {expect} from "chai"
import {BigNumber, Contract, utils, constants} from "ethers"
import PolyJetClubV2 from "../artifacts/contracts/PolyJetClubV2.sol/PolyJetClubV2.json"
import Proxys from "../artifacts/contracts/Proxys.sol/Proxys.json"
import MockPolyJetClub from "../artifacts/contracts/mock/MockPolyJetClub.sol/MockPolyJetClub.json"
import MockERC20 from "../artifacts/contracts/mock/MockERC20.sol/MockERC20.json"
import UniswapV2Factory from "@uniswap/v2-core/build/UniswapV2Factory.json"
import UniswapV2Router02 from "@uniswap/v2-periphery/build/UniswapV2Router02.json"
import WETH from "@uniswap/v2-periphery/build/WETH9.json"

const {deployContract} = waffle
var black = "0x8888888888888888888888888888888888888888"

describe("Proxys", async () => {

		const [alice, bob, carol, dave, eve] = waffle.provider.getWallets()

		function getDate(): number {
				return new Date().getTime() + 10 ** 3
		}

		let polyJetClub: Contract
		let polyJetClubV2: Contract
		let proxys: Contract
		let WDC: Contract
		let WPSC: Contract
		let uniswapV2Factory: Contract
		let uniswapV2Router02: Contract
		beforeEach(async () => {
				polyJetClub = await deployContract(alice, MockPolyJetClub, [])
				WDC = await deployContract(alice, MockERC20, [])
				WPSC = await deployContract(alice, WETH, [])
				uniswapV2Factory = await deployContract(alice, UniswapV2Factory, [constants.AddressZero])
				uniswapV2Router02 = await deployContract(alice, UniswapV2Router02, [uniswapV2Factory.address, WPSC.address])
				proxys = await deployContract(alice, Proxys, [polyJetClub.address, WDC.address, WPSC.address, uniswapV2Router02.address])
				polyJetClubV2 = await deployContract(alice, PolyJetClubV2, [proxys.address, 0])
				await polyJetClub.connect(alice).setWDC(WDC.address)
				await proxys.connect(alice).setConfig(4, polyJetClubV2.address)

				//swap
				await WDC.connect(alice).transfer(carol.address, utils.parseEther('10000'))
				await WDC.connect(alice).transfer(dave.address, utils.parseEther('10000'))
				await WDC.connect(carol).approve(uniswapV2Router02.address, utils.parseEther('1000000000'))
				await WDC.connect(dave).approve(uniswapV2Router02.address, utils.parseEther('1000000000'))
				await uniswapV2Router02.connect(carol).addLiquidityETH(WDC.address, utils.parseEther('1000'), 0, 0, carol.address, getDate(), {value: utils.parseEther('1000')})
				await uniswapV2Router02.connect(dave).addLiquidityETH(WDC.address, utils.parseEther('1000'), 0, 0, dave.address, getDate(), {value: utils.parseEther('1000')})
		})

		it('Check the address', async () => {
				expect(await proxys.WDC()).be.eq(WDC.address)
				expect(await proxys.WPSC()).be.eq(WPSC.address)
				expect(await proxys.swapRouter()).be.eq(uniswapV2Router02.address)
				expect(await proxys.polyJetClub()).be.eq(polyJetClub.address)
				expect(await proxys.polyJetClubV2()).be.eq(polyJetClubV2.address)
				expect(await proxys.getBlack()).be.eq(black)

				await expect(proxys.connect(bob).setConfig(0, alice.address)).revertedWith('Ownable: caller is not the owner')
				await proxys.connect(alice).setConfig(0, alice.address)
				await proxys.connect(alice).setConfig(1, bob.address)
				await proxys.connect(alice).setConfig(2, carol.address)
				await proxys.connect(alice).setConfig(3, dave.address)
				await proxys.connect(alice).setConfig(4, eve.address)
				await proxys.connect(alice).setConfig(5, constants.AddressZero)

				expect(await proxys.WDC()).be.eq(alice.address)
				expect(await proxys.WPSC()).be.eq(bob.address)
				expect(await proxys.swapRouter()).be.eq(carol.address)
				expect(await proxys.polyJetClub()).be.eq(dave.address)
				expect(await proxys.polyJetClubV2()).be.eq(eve.address)
				expect(await proxys.getBlack()).be.eq(constants.AddressZero)
		})

		it('transferFrom & transferFromWDC & getAmountsOut', async () => {
				await polyJetClub.connect(bob).claim(1, 0, {value: utils.parseEther('5')})
				await expect(proxys.connect(bob).transferFrom(bob.address, 1)).revertedWith('Permission denied')

				await proxys.connect(alice).setConfig(4, alice.address)
				await polyJetClub.connect(bob).setApprovalForAll(proxys.address, true)
				await proxys.connect(alice).transferFrom(bob.address, 1)

				expect(await polyJetClub.ownerOf(1)).be.eq(black)

				await WDC.connect(alice).transfer(bob.address, utils.parseEther('10000'))
				await expect(proxys.connect(bob).transferFromWDC(bob.address, utils.parseEther('10000'))).revertedWith('Permission denied')
				await expect(proxys.connect(alice).transferFromWDC(bob.address, utils.parseEther('10000'))).revertedWith('ERC20: insufficient allowance')
				await WDC.connect(bob).approve(proxys.address, utils.parseEther('10000'))
				await proxys.connect(alice).transferFromWDC(bob.address, utils.parseEther('10000'))

				expect(await WDC.balanceOf(bob.address)).be.eq(utils.parseEther("0"))
				expect(await WDC.balanceOf(black)).be.eq(utils.parseEther("10000"))

				expect(await proxys.getAmountsOut(utils.parseEther("1000"))).gt(utils.parseEther("0"))
		})

		it('getTokenIds', async () => {
				await polyJetClub.connect(bob).claim(1, 0, {value: utils.parseEther('5')})
				await polyJetClub.connect(bob).claim(2, 0, {value: utils.parseEther('5')})

				expect(await proxys.getTokenIds(bob.address)).eqls([BigNumber.from(1), BigNumber.from(2)])

				await polyJetClub.connect(carol).claim(3, 0, {value: utils.parseEther('5')})
				await polyJetClub.connect(carol).claim(4, 0, {value: utils.parseEther('5')})
				await polyJetClub.connect(carol).claim(5, 0, {value: utils.parseEther('5')})
				await polyJetClub.connect(carol).claim(6, 0, {value: utils.parseEther('5')})

				expect(await proxys.getTokenIds(carol.address)).eqls([BigNumber.from(3), BigNumber.from(4), BigNumber.from(5), BigNumber.from(6)])
		})
})
