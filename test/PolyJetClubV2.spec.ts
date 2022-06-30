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
import {getSigMessage} from "./utils"

const {deployContract} = waffle
var black = "0x8888888888888888888888888888888888888888"

describe("PolyJetClubV2", async () => {
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

		it("name, symbol", async () => {
				expect(await polyJetClubV2.name()).eq("PolyJetClub")
				expect(await polyJetClubV2.symbol()).eq("PolyJetClub")
		})

		it("claim", async () => {
				await expect(polyJetClubV2.connect(bob).claim(0)).revertedWith("Token ID invalid")
				await expect(polyJetClubV2.connect(bob).claim(9001)).revertedWith("Token ID invalid")
				await expect(polyJetClubV2.connect(bob).claim(1)).revertedWith("ERC20: insufficient allowance")
				await expect(polyJetClubV2.connect(bob).claim(1, {value: utils.parseEther("4.9")})).revertedWith("Insufficient handling fee")
				await expect(polyJetClubV2.connect(bob).claim(1)).revertedWith("ERC20: insufficient allowance")
				await expect(polyJetClubV2.connect(bob).claim(1, {value: utils.parseEther("5")})).revertedWith("Insufficient handling fee")

				//psc
				await polyJetClubV2.connect(alice).setFee(utils.parseEther("5"))
				var balance1 = await bob.getBalance()
				await polyJetClubV2.connect(bob).claim(1, {value: utils.parseEther("5")})
				var balance2 = await bob.getBalance()
				expect(balance2.sub(balance1).lt(utils.parseEther("5"))).eq(true)
				expect(await polyJetClubV2.ownerOf(1)).eq(bob.address)
				expect(await polyJetClubV2.tokenURI(1)).eq("ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/1")
				expect(await polyJetClubV2.total()).eq(1)
				expect(await polyJetClubV2.getDate(1)).not.eq(0)
				expect(await polyJetClubV2.getVit(1)).eq(100)

				//wdc
				await WDC.connect(alice).transfer(bob.address, utils.parseEther("100"))
				await expect(polyJetClubV2.connect(bob).claim(1)).revertedWith("ERC20: insufficient allowance")
				await WDC.connect(bob).approve(proxys.address, utils.parseEther("100000000"))
				await expect(polyJetClubV2.connect(bob).claim(1)).revertedWith("ERC721: token already minted")
				balance1 = await WDC.balanceOf(bob.address)
				await polyJetClubV2.connect(bob).claim(2)
				balance2 = await WDC.balanceOf(bob.address)
				expect(balance1).gt(balance2)
				expect((await WDC.balanceOf(black)).gt(BigNumber.from('0'))).eq(true)
				expect(await polyJetClubV2.ownerOf(2)).eq(bob.address)
				expect(await polyJetClubV2.tokenURI(2)).eq("ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/2")
				expect(await polyJetClubV2.total()).eq(2)
				expect(await polyJetClubV2.getDate(2)).not.eq(0)
				expect(await polyJetClubV2.getVit(2)).eq(100)
		})

		it("claimBatch", async () => {
				await expect(polyJetClubV2.connect(bob).claimBatch([])).revertedWith("Abnormal tokenIds length")
				await expect(polyJetClubV2.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).revertedWith("ERC20: insufficient allowance")
				await expect(polyJetClubV2.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {value: utils.parseEther('49')})).revertedWith("Insufficient handling fee")
				await expect(polyJetClubV2.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {value: utils.parseEther("5")})).revertedWith("Insufficient handling fee")
				await expect(polyJetClubV2.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 9001], {value: utils.parseEther("50")})).revertedWith("Token ID invalid")

				//psc
				await polyJetClubV2.connect(alice).setFee(utils.parseEther("5"))
				await polyJetClubV2.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {value: utils.parseEther("50")})
				expect(await polyJetClubV2.ownerOf(1)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(2)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(3)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(4)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(5)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(6)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(7)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(8)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(9)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(10)).eq(bob.address)
				expect(await polyJetClubV2.total()).eq(10)
				expect(await polyJetClubV2.tokenURI(1)).eq("ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/1")
				expect(await polyJetClubV2.tokenURI(9)).eq("ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/9")
				expect(await polyJetClubV2.tokenURI(10)).eq("ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/10")

				//wdc
				await WDC.connect(alice).transfer(bob.address, utils.parseEther('10000'))
				await expect(polyJetClubV2.connect(bob).claimBatch([11, 12, 13, 14])).revertedWith("ERC20: insufficient allowance")
				await WDC.connect(bob).approve(proxys.address, utils.parseEther("10"))
				await expect(polyJetClubV2.connect(bob).claimBatch([11, 12, 13, 14])).revertedWith("ERC20: insufficient allowance")
				await WDC.connect(bob).approve(proxys.address, utils.parseEther("10000"))
				await expect(polyJetClubV2.connect(bob).claimBatch([10, 11, 12, 13, 14])).revertedWith("ERC721: token already minted")
				await polyJetClubV2.connect(bob).claimBatch([100, 11, 12, 13, 14, 15, 16, 17, 18, 19])
				expect(await polyJetClubV2.ownerOf(100)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(11)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(12)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(13)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(14)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(15)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(16)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(17)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(18)).eq(bob.address)
				expect(await polyJetClubV2.ownerOf(19)).eq(bob.address)
				expect((await WDC.balanceOf(black)).gt(BigNumber.from('0'))).eq(true)
				expect(await polyJetClubV2.total()).eq(20)
				expect(await polyJetClubV2.tokenURI(100)).eq("ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/100")
				expect(await polyJetClubV2.tokenURI(16)).eq("ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/16")
				expect(await polyJetClubV2.tokenURI(19)).eq("ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/19")
		})

		it("claimPermit", async () => {
				await expect(polyJetClubV2.connect(bob).claimPermit(100, 0x00)).revertedWith("Token ID invalid")
				await expect(polyJetClubV2.connect(bob).claimPermit(9000, 0x00)).revertedWith("Token ID invalid")
				await expect(polyJetClubV2.connect(bob).claimPermit(10001, 0x00)).revertedWith("Token ID invalid")
				await expect(polyJetClubV2.connect(bob).claimPermit(9001, 0x00, {value: utils.parseEther("0.5")})).revertedWith("Insufficient handling fee")
				await expect(polyJetClubV2.connect(bob).claimPermit(9001, 0x00)).revertedWith("ERC20: insufficient allowance")

				await WDC.connect(alice).transfer(bob.address, utils.parseEther("10000"))
				await WDC.connect(bob).approve(proxys.address, utils.parseEther("0.1"))
				await expect(polyJetClubV2.connect(bob).claimPermit(9001, 0x00)).revertedWith("ERC20: insufficient allowance")
				await WDC.connect(bob).approve(proxys.address, utils.parseEther("1000000"))

				const chainId = (await waffle.provider.getNetwork()).chainId
				const sk = alice.privateKey.substring(2)
				const sk2 = dave.privateKey.substring(2)
				var message = getSigMessage(chainId, polyJetClubV2.address, bob.address, 9001, sk2)
				await expect(polyJetClubV2.connect(bob).claimPermit(9001, message, {value: utils.parseEther("1")})).revertedWith("Permit Failure")
				message = getSigMessage(chainId, polyJetClubV2.address, bob.address, 10001, sk)
				await expect(polyJetClubV2.connect(bob).claimPermit(9002, message, {value: utils.parseEther("1")})).revertedWith("Permit Failure")
				message = getSigMessage(chainId, polyJetClubV2.address, bob.address, 9001, sk)
				//psc
				await polyJetClubV2.connect(bob).claimPermit(9001, message, {value: utils.parseEther("1")})
				expect(await polyJetClubV2.ownerOf(9001)).eq(bob.address)
				expect(await polyJetClubV2.total()).eq(0)
				expect(await polyJetClubV2.tokenURI(9001)).eq("ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/9001")

				//wdc
				message = getSigMessage(chainId, polyJetClubV2.address, bob.address, 9002, sk)
				var balance1 = await WDC.balanceOf(bob.address)
				await polyJetClubV2.connect(bob).claimPermit(9002, message)
				var balance2 = await WDC.balanceOf(bob.address)
				expect(balance1.gt(balance2)).eq(true)
				expect(await polyJetClubV2.ownerOf(9002)).eq(bob.address)
				expect(await polyJetClubV2.total()).eq(0)
				expect(await polyJetClubV2.tokenURI(9002)).eq("ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/9002")

				//owner
				await polyJetClubV2.connect(alice).claimPermit(9003, 0x00, {value: utils.parseEther("1")})
				expect(await polyJetClubV2.ownerOf(9003)).eq(alice.address)
				expect(await polyJetClubV2.total()).eq(0)
				expect(await polyJetClubV2.tokenURI(9003)).eq("ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/9003")

				await expect(polyJetClubV2.connect(alice).claimPermit(9004, 0x00)).revertedWith("ERC20: insufficient allowance")
				await WDC.connect(alice).approve(proxys.address, utils.parseEther("1000000"))
				await polyJetClubV2.connect(alice).claimPermit(9004, 0x00)
				expect(await polyJetClubV2.ownerOf(9004)).eq(alice.address)
				expect(await polyJetClubV2.total()).eq(0)
				expect(await polyJetClubV2.tokenURI(9004)).eq("ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/9004")
		})

		it("owner", async () => {
				await expect(polyJetClubV2.tokenURI(1)).revertedWith("ERC721Metadata: URI query for nonexistent token")
				await expect(polyJetClubV2.getVit(1)).revertedWith("ERC721Metadata: URI query for nonexistent token")
				expect(await polyJetClubV2.change()).eq("0x0000000000000000000000000000000000000000")
				expect(await polyJetClubV2.baseURI()).eq("ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/")

				await expect(polyJetClubV2.connect(bob).setURI("ipfs://xxxx/")).revertedWith("Ownable: caller is not the owner")
				await polyJetClubV2.connect(alice).setURI("ipfs://xxxx/")
				expect(await polyJetClubV2.baseURI()).eq("ipfs://xxxx/")

				expect(await polyJetClubV2.Fee()).eq(utils.parseEther("50000"))
				await expect(polyJetClubV2.connect(bob).setFee(utils.parseEther("5"))).revertedWith("Ownable: caller is not the owner")
				await polyJetClubV2.connect(alice).setFee(utils.parseEther("5"))
				expect(await polyJetClubV2.Fee()).eq(utils.parseEther("5"))

				await polyJetClubV2.connect(alice).claim(1, {value: utils.parseEther("5")})
				expect(await polyJetClubV2.ownerOf(1)).eq(alice.address)
				expect(await polyJetClubV2.total()).eq(1)
				expect(await polyJetClubV2.tokenURI(1)).eq("ipfs://xxxx/1")

				await expect(polyJetClubV2.connect(bob).setChange(black)).revertedWith("Ownable: caller is not the owner")
				await polyJetClubV2.connect(alice).setChange(black)
				expect(await polyJetClubV2.change()).eq(black)
		})

		it('NFT already existed & migration NFT', async () => {
				// polyjetclub mint
				await polyJetClub.connect(bob).claim(1, 0, {value: utils.parseEther('5')})
				await polyJetClub.connect(bob).claim(2, 0, {value: utils.parseEther('5')})
				const chainId = (await waffle.provider.getNetwork()).chainId
				const sk = alice.privateKey.substring(2)
				var message = getSigMessage(chainId, polyJetClub.address, bob.address, 9001, sk)
				await polyJetClub.connect(bob).claimPermit(9001, message, {value: utils.parseEther("1")})
				message = getSigMessage(chainId, polyJetClub.address, bob.address, 10000, sk)
				await polyJetClub.connect(bob).claimPermit(10000, message, {value: utils.parseEther("1")})

				await polyJetClubV2.connect(alice).setFee(utils.parseEther("5"))
				await expect(polyJetClubV2.connect(bob).claim(1, {value: utils.parseEther("5")})).revertedWith('Token already minted')
				await expect(polyJetClubV2.connect(bob).claim(2, {value: utils.parseEther("5")})).revertedWith('Token already minted')
				await expect(polyJetClubV2.connect(bob).claimBatch([1, 2], {value: utils.parseEther("10")})).revertedWith('Token already minted')
				await expect(polyJetClubV2.connect(bob).claimBatch([1, 3], {value: utils.parseEther("10")})).revertedWith('Token already minted')
				message = getSigMessage(chainId, polyJetClubV2.address, bob.address, 9001, sk)
				await expect(polyJetClubV2.connect(bob).claimPermit(9001, message, {value: utils.parseEther("1")})).revertedWith('Token already minted')
				message = getSigMessage(chainId, polyJetClubV2.address, bob.address, 10000, sk)
				await expect(polyJetClubV2.connect(bob).claimPermit(10000, message, {value: utils.parseEther("1")})).revertedWith('Token already minted')

				await polyJetClubV2.connect(bob).claim(3, {value: utils.parseEther("5")})
				await polyJetClubV2.connect(bob).claimBatch([4, 5], {value: utils.parseEther("10")})
				message = getSigMessage(chainId, polyJetClubV2.address, bob.address, 9002, sk)
				await polyJetClubV2.connect(bob).claimPermit(9002, message, {value: utils.parseEther("1")})

				//migration
				await expect(polyJetClubV2.connect(bob).claimMigration()).revertedWith('ERC721: transfer caller is not owner nor approved')
				await polyJetClub.connect(bob).setApprovalForAll(proxys.address, true)
				await polyJetClubV2.connect(bob).claimMigration()
				expect(await polyJetClubV2.ownerOf(1)).be.eq(bob.address)
				expect(await polyJetClubV2.ownerOf(2)).be.eq(bob.address)
				expect(await polyJetClubV2.ownerOf(9001)).be.eq(bob.address)
				expect(await polyJetClubV2.ownerOf(10000)).be.eq(bob.address)
				expect(await polyJetClub.ownerOf(1)).be.eq(black)
				expect(await polyJetClub.ownerOf(2)).be.eq(black)
				expect(await polyJetClub.ownerOf(9001)).be.eq(black)
				expect(await polyJetClub.ownerOf(10000)).be.eq(black)
		})
})
