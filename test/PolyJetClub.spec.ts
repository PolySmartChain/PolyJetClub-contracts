// @ts-ignore
import {waffle} from 'hardhat'
import {expect} from 'chai'
import PolyJetClub from '../artifacts/contracts/mock/MockPolyJetClub.sol/PolyJetClub.json'
import MockWDC from '../artifacts/contracts/mock/MockWDC.sol/MockWDC.json'
import {BigNumber, Contract, utils} from 'ethers'
import {getSigMessage} from "./utils";

const {deployContract} = waffle
var black = '0x8888888888888888888888888888888888888888'

describe('PolyJetClub', async () => {
		const [alice, bob, dave] = waffle.provider.getWallets()

		let polyJetClub: Contract
		let mockWDC: Contract
		beforeEach(async () => {
				polyJetClub = await deployContract(alice, PolyJetClub, [])
				mockWDC = await deployContract(alice, MockWDC, [])

				await polyJetClub.connect(alice).setWDC(mockWDC.address)
		})

		it('name, symbol', async () => {
				expect(await polyJetClub.name()).eq("PolyJetClub")
				expect(await polyJetClub.symbol()).eq("PolyJetClub")
		})

		it('claim', async () => {
				await expect(polyJetClub.connect(bob).claim(0, 0)).revertedWith("Token ID invalid")
				await expect(polyJetClub.connect(bob).claim(9001, 0)).revertedWith("Token ID invalid")
				await expect(polyJetClub.connect(bob).claim(1, 0)).revertedWith("Insufficient handling fee")
				await expect(polyJetClub.connect(bob).claim(1, 0, {value: utils.parseEther('4.9')})).revertedWith("Insufficient handling fee")
				await expect(polyJetClub.connect(bob).claim(1, utils.parseEther('11999'))).revertedWith("ERC20: insufficient allowance")
				await expect(polyJetClub.connect(bob).claim(1, utils.parseEther('12000'), {value: utils.parseEther('5')})).revertedWith("Abnormal fee")

				//psc
				var balance1 = await bob.getBalance()
				await polyJetClub.connect(bob).claim(1, 0, {value: utils.parseEther('5')})
				var balance2 = await bob.getBalance()
				expect(balance2.sub(balance1).lt(utils.parseEther('5'))).eq(true)
				expect(await polyJetClub.ownerOf(1)).eq(bob.address)
				expect(await polyJetClub.tokenURI(1)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/1')
				expect(await polyJetClub.total()).eq(1)
				expect(await polyJetClub.getDate(1)).not.eq(0)
				expect(await polyJetClub.getVit(1)).eq(100)

				//wdc
				await mockWDC.connect(alice).transfer(bob.address, BigNumber.from('100000000000000000'))
				await expect(polyJetClub.connect(bob).claim(1, BigNumber.from('1199900000000'))).revertedWith("WDC insufficient handling fee")
				await expect(polyJetClub.connect(bob).claim(1, BigNumber.from('1200000000000'))).revertedWith("ERC20: insufficient allowance")
				await mockWDC.connect(bob).approve(polyJetClub.address, utils.parseEther('100000000'))
				await expect(polyJetClub.connect(bob).claim(1, BigNumber.from('1200000000000'))).revertedWith("ERC721: token already minted")
				balance1 = await mockWDC.balanceOf(bob.address)
				await polyJetClub.connect(bob).claim(2, BigNumber.from('1200000000000'))
				balance2 = await mockWDC.balanceOf(bob.address)
				expect(balance1.sub(balance2).eq(BigNumber.from('1200000000000'))).eq(true)
				expect((await mockWDC.balanceOf(black)).eq(BigNumber.from('1200000000000'))).eq(true)
				expect(await polyJetClub.ownerOf(2)).eq(bob.address)
				expect(await polyJetClub.tokenURI(2)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/2')
				expect(await polyJetClub.total()).eq(2)
				expect(await polyJetClub.getDate(2)).not.eq(0)
				expect(await polyJetClub.getVit(2)).eq(100)
		})

		it('claimBatch', async () => {
				await expect(polyJetClub.connect(bob).claimBatch([], 0)).revertedWith("Abnormal tokenIds length")
				await expect(polyJetClub.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 0)).revertedWith("Abnormal tokenIds length")
				await expect(polyJetClub.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0)).revertedWith("Insufficient handling fee")
				await expect(polyJetClub.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], utils.parseEther('11999'))).revertedWith("ERC20: insufficient allowance")
				await expect(polyJetClub.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0, {value: utils.parseEther('5')})).revertedWith("Insufficient handling fee")
				await expect(polyJetClub.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 9001], 0, {value: utils.parseEther('50')})).revertedWith("Token ID invalid")
				await expect(polyJetClub.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1000, {value: utils.parseEther('50')})).revertedWith("Abnormal fee")

				//psc
				await polyJetClub.connect(bob).claimBatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0, {value: utils.parseEther('50')})
				expect(await polyJetClub.ownerOf(1)).eq(bob.address)
				expect(await polyJetClub.ownerOf(2)).eq(bob.address)
				expect(await polyJetClub.ownerOf(3)).eq(bob.address)
				expect(await polyJetClub.ownerOf(4)).eq(bob.address)
				expect(await polyJetClub.ownerOf(5)).eq(bob.address)
				expect(await polyJetClub.ownerOf(6)).eq(bob.address)
				expect(await polyJetClub.ownerOf(7)).eq(bob.address)
				expect(await polyJetClub.ownerOf(8)).eq(bob.address)
				expect(await polyJetClub.ownerOf(9)).eq(bob.address)
				expect(await polyJetClub.ownerOf(10)).eq(bob.address)
				expect(await polyJetClub.total()).eq(10)
				expect(await polyJetClub.tokenURI(1)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/1')
				expect(await polyJetClub.tokenURI(9)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/9')
				expect(await polyJetClub.tokenURI(10)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/10')

				//wdc
				await mockWDC.connect(alice).transfer(bob.address, BigNumber.from('100000000000000000'))
				await expect(polyJetClub.connect(bob).claimBatch([11, 12, 13, 14], BigNumber.from('1200000000000'))).revertedWith("ERC20: insufficient allowance")
				await mockWDC.connect(bob).approve(polyJetClub.address, utils.parseEther('100000000'))
				await expect(polyJetClub.connect(bob).claimBatch([11, 12, 13, 14], BigNumber.from('1199900000000'))).revertedWith("Insufficient handling fee")
				await expect(polyJetClub.connect(bob).claimBatch([10, 11, 12, 13, 14], BigNumber.from('1200000000000'))).revertedWith("ERC721: token already minted")
				await polyJetClub.connect(bob).claimBatch([100, 11, 12, 13, 14, 15, 16, 17, 18, 19], BigNumber.from('12000000000000'))
				expect(await polyJetClub.ownerOf(100)).eq(bob.address)
				expect(await polyJetClub.ownerOf(11)).eq(bob.address)
				expect(await polyJetClub.ownerOf(12)).eq(bob.address)
				expect(await polyJetClub.ownerOf(13)).eq(bob.address)
				expect(await polyJetClub.ownerOf(14)).eq(bob.address)
				expect(await polyJetClub.ownerOf(15)).eq(bob.address)
				expect(await polyJetClub.ownerOf(16)).eq(bob.address)
				expect(await polyJetClub.ownerOf(17)).eq(bob.address)
				expect(await polyJetClub.ownerOf(18)).eq(bob.address)
				expect(await polyJetClub.ownerOf(19)).eq(bob.address)
				expect(await polyJetClub.total()).eq(20)
				expect(await polyJetClub.tokenURI(100)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/100')
				expect(await polyJetClub.tokenURI(16)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/16')
				expect(await polyJetClub.tokenURI(19)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/19')
		})

		it('claimPermit', async () => {
				await expect(polyJetClub.connect(bob).claimPermit(100, 0x00)).revertedWith("Token ID invalid")
				await expect(polyJetClub.connect(bob).claimPermit(9000, 0x00)).revertedWith("Token ID invalid")
				await expect(polyJetClub.connect(bob).claimPermit(10001, 0x00)).revertedWith("Token ID invalid")
				await expect(polyJetClub.connect(bob).claimPermit(9001, 0x00, {value: utils.parseEther('0.5')})).revertedWith("Insufficient handling fee")
				await expect(polyJetClub.connect(bob).claimPermit(9001, 0x00)).revertedWith("ERC20: insufficient allowance")
				await mockWDC.connect(alice).transfer(bob.address, BigNumber.from('1000000000000000'))
				await mockWDC.connect(bob).approve(polyJetClub.address, BigNumber.from('50000000'))
				await expect(polyJetClub.connect(bob).claimPermit(9001, 0x00)).revertedWith("ERC20: insufficient allowance")
				await mockWDC.connect(bob).approve(polyJetClub.address, utils.parseEther('1000000'))

				const chainId = (await waffle.provider.getNetwork()).chainId
				const sk = alice.privateKey.substring(2)
				const sk2 = dave.privateKey.substring(2)
				var message = getSigMessage(chainId, polyJetClub.address, bob.address, 9001, sk2)
				await expect(polyJetClub.connect(bob).claimPermit(9001, message, {value: utils.parseEther('1')})).revertedWith("Permit Failure")
				message = getSigMessage(chainId, polyJetClub.address, bob.address, 10001, sk)
				await expect(polyJetClub.connect(bob).claimPermit(9002, message, {value: utils.parseEther('1')})).revertedWith("Permit Failure")
				message = getSigMessage(chainId, polyJetClub.address, bob.address, 9001, sk)
				//psc
				await polyJetClub.connect(bob).claimPermit(9001, message, {value: utils.parseEther('1')})
				expect(await polyJetClub.ownerOf(9001)).eq(bob.address)
				expect(await polyJetClub.total()).eq(0)
				expect(await polyJetClub.tokenURI(9001)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/9001')

				//wdc
				message = getSigMessage(chainId, polyJetClub.address, bob.address, 9002, sk)
				var balance1 = await mockWDC.balanceOf(bob.address)
				await polyJetClub.connect(bob).claimPermit(9002, message)
				var balance2 = await mockWDC.balanceOf(bob.address)
				expect(balance1.sub(balance2).eq(BigNumber.from('100000000'))).eq(true)
				expect(await polyJetClub.ownerOf(9002)).eq(bob.address)
				expect(await polyJetClub.total()).eq(0)
				expect(await polyJetClub.tokenURI(9002)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/9002')

				//owner
				await polyJetClub.connect(alice).claimPermit(9003, 0x00, {value: utils.parseEther('1')})
				expect(await polyJetClub.ownerOf(9003)).eq(alice.address)
				expect(await polyJetClub.total()).eq(0)
				expect(await polyJetClub.tokenURI(9003)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/9003')

				await expect(polyJetClub.connect(alice).claimPermit(9004, 0x00)).revertedWith("ERC20: insufficient allowance")
				await mockWDC.connect(alice).approve(polyJetClub.address, utils.parseEther('1000000'))
				await polyJetClub.connect(alice).claimPermit(9004, 0x00)
				expect(await polyJetClub.ownerOf(9004)).eq(alice.address)
				expect(await polyJetClub.total()).eq(0)
				expect(await polyJetClub.tokenURI(9004)).eq('ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/9004')
		})

		it('owner', async () => {
				await expect(polyJetClub.tokenURI(1)).revertedWith("ERC721Metadata: URI query for nonexistent token")
				await expect(polyJetClub.getVit(1)).revertedWith("ERC721Metadata: URI query for nonexistent token")
				expect(await polyJetClub.change()).eq("0x0000000000000000000000000000000000000000")
				expect(await polyJetClub.baseURI()).eq("ipfs://QmdtL74LwH5U8JY2ce1euX9ZTbJd1xrH7yJFep3B4JgVAs/")

				await expect(polyJetClub.connect(bob).setURI("ipfs://xxxx/")).revertedWith("Ownable: caller is not the owner")
				await polyJetClub.connect(alice).setURI("ipfs://xxxx/")
				expect(await polyJetClub.baseURI()).eq("ipfs://xxxx/")
				await polyJetClub.connect(alice).claim(1, 0, {value: utils.parseEther('5')})
				expect(await polyJetClub.ownerOf(1)).eq(alice.address)
				expect(await polyJetClub.total()).eq(1)
				expect(await polyJetClub.tokenURI(1)).eq('ipfs://xxxx/1')

				await expect(polyJetClub.connect(bob).setChange(black)).revertedWith("Ownable: caller is not the owner")
				await polyJetClub.connect(alice).setChange(black)
				expect(await polyJetClub.change()).eq(black)
		})

})
